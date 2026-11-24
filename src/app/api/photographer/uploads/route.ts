import { revalidatePath, revalidateTag } from "next/cache";
import { and, count, eq, max, ne, sql } from "drizzle-orm";
import { packageImages, packages, photographers, portfolioImages, portfolioSegments } from "@/db/schema";
import { withUser } from "@/db/with-user";
import { dbMessage } from "@/lib/admin";
import { isUuid } from "@/lib/admin-data";
import { getUser, roleOf } from "@/lib/auth";
import { ImageRejected, MAX_UPLOAD_BYTES, processImage } from "@/lib/image";
import { MAX_PACKAGE_IMAGES, MAX_PORTFOLIO_IMAGES } from "@/lib/photographer";
import { PUBLIC_TAG } from "@/lib/public";
import { rateLimit } from "@/lib/rate-limit";
import { deleteKey, objectKey, publicUrl, purgeUrls, putImage, r2Configured } from "@/lib/r2";

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const fail = (status: number, message: string): never => { throw new HttpError(status, message); };
const json = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const PROFILE_SLOTS = {
  profile_photo: { slot: "photo", column: "profilePhotoUrl" },
  logo: { slot: "logo", column: "logoUrl" },
  banner: { slot: "banner", column: "bannerUrl" },
} as const;

/**
 * POST multipart: kind = "package" | "portfolio" (targetId = package id | segment id)
 * or "profile_photo" | "logo" | "banner" (always the caller's own profile; replaces the current image), file = image.
 * Order: verify identity → validate bytes → DB checks + insert under RLS → store in R2 → commit.
 * If storing or committing fails, the row is rolled back and any stored object is removed.
 */
export async function POST(req: Request) {
  const stored: { key?: string } = {};
  try {
    // CSRF: browsers always send Origin on cross-site POSTs; it must match this host.
    const origin = req.headers.get("origin");
    const originHost = origin ? URL.parse(origin)?.host : undefined;
    if (!originHost || originHost !== req.headers.get("host")) fail(403, "Cross-site request blocked.");

    const user = await getUser();
    if (!user) fail(401, "Sign in to upload images.");
    if (roleOf(user) !== "photographer") fail(403, "Only photographers can upload images.");
    if (!r2Configured()) fail(503, "Image storage is not configured.");
    if (!rateLimit(`upload:${user!.id}`, 60, 60_000).ok) fail(429, "Too many uploads. Wait a minute and try again.");

    const length = Number(req.headers.get("content-length"));
    if (!Number.isFinite(length) || length <= 0) fail(411, "Content-Length is required.");
    if (length > MAX_UPLOAD_BYTES + 64 * 1024) fail(413, "Image is larger than 5 MB.");

    const form = await req.formData().catch(() => fail(400, "Invalid upload."));
    const kind = form.get("kind");
    const targetId = form.get("targetId");
    const file = form.get("file");
    const profileSlot = typeof kind === "string" && Object.hasOwn(PROFILE_SLOTS, kind) ? PROFILE_SLOTS[kind as keyof typeof PROFILE_SLOTS] : null;
    if (!profileSlot && kind !== "package" && kind !== "portfolio") fail(400, "Invalid upload target.");
    if (!profileSlot && !isUuid(targetId)) fail(400, "Invalid upload target.");
    if (!(file instanceof File)) fail(400, "Choose an image file.");
    if ((file as File).size > MAX_UPLOAD_BYTES) fail(413, "Image is larger than 5 MB.");

    const webp = await processImage(Buffer.from(await (file as File).arrayBuffer()));
    const target = targetId as string;
    const replaced: { url?: string; owner?: string } = {}; // old profile image, removed after commit

    const result = await withUser(user!.id, async (tx) => {
      // FOR UPDATE: two concurrent replacements of the same slot run one after the other, so no old file is missed.
      const [me] = await tx.select({ id: photographers.id, status: photographers.status, profilePhotoUrl: photographers.profilePhotoUrl, logoUrl: photographers.logoUrl, bannerUrl: photographers.bannerUrl })
        .from(photographers).where(eq(photographers.userId, user!.id)).limit(1).for("update");
      if (!me) return fail(404, "Photographer profile not found.");

      let message = "Image uploaded.";
      let id: string;
      let url: string;
      let key: string;
      if (profileSlot) {
        if (me.status === "rejected" || me.status === "inactive") return fail(403, "This account can no longer change profile images.");
        key = objectKey("profile", me.id, profileSlot.slot);
        url = publicUrl(key);
        id = me.id;
        await tx.update(photographers).set({ [profileSlot.column]: url }).where(eq(photographers.id, me.id));
        const old = me[profileSlot.column];
        if (old) { replaced.url = old; replaced.owner = me.id; }
        message = old ? "Image replaced." : "Image uploaded.";
      } else if (kind === "package") {
        const [pkg] = await tx.select({ status: packages.status }).from(packages).where(and(eq(packages.id, target), eq(packages.photographerId, me.id)));
        if (!pkg) return fail(404, "Package not found.");
        if (pkg.status === "inactive") return fail(403, "This package was deactivated by an admin.");
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${target}, 0))`);
        const [{ n, top }] = await tx.select({ n: count(), top: max(packageImages.sortOrder) }).from(packageImages).where(eq(packageImages.packageId, target));
        if (n >= MAX_PACKAGE_IMAGES) return fail(409, "A package has one banner image. Remove the current one to upload a new one.");
        key = objectKey("packages", me.id, target);
        url = publicUrl(key);
        [{ id }] = await tx.insert(packageImages).values({ packageId: target, imageUrl: url, sortOrder: (top ?? -1) + 1 }).returning({ id: packageImages.id });
      } else {
        const [seg] = await tx.select({ id: portfolioSegments.id }).from(portfolioSegments).where(and(eq(portfolioSegments.id, target), eq(portfolioSegments.photographerId, me.id)));
        if (!seg) return fail(404, "Segment not found.");
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"portfolio:" + me.id}, 0))`);
        const [{ total }] = await tx.select({ total: count() }).from(portfolioImages)
          .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
          .where(and(eq(portfolioSegments.photographerId, me.id), ne(portfolioImages.status, "inactive")));
        if (total >= MAX_PORTFOLIO_IMAGES) return fail(409, `Your portfolio is limited to ${MAX_PORTFOLIO_IMAGES} images.`);
        const [{ top }] = await tx.select({ top: max(portfolioImages.sortOrder) }).from(portfolioImages).where(eq(portfolioImages.segmentId, target));
        key = objectKey("portfolio", me.id, target);
        url = publicUrl(key);
        [{ id }] = await tx.insert(portfolioImages).values({ segmentId: target, imageUrl: url, sortOrder: (top ?? -1) + 1 }).returning({ id: portfolioImages.id });
        message = "Image uploaded. It appears publicly after admin review.";
      }
      stored.key = key;
      await putImage(key, webp); // inside the transaction: a failed upload rolls the row back
      return { id, url, message };
    });

    if (replaced.url) await purgeUrls([replaced.url], replaced.owner!); // after commit; never fails the request
    revalidatePath("/photographer", "layout");
    revalidatePath("/", "layout");
    revalidateTag(PUBLIC_TAG, { expire: 0 });
    return json(201, { ok: true, ...result });
  } catch (e) {
    if (stored.key) await deleteKey(stored.key).catch(() => {}); // commit/insert failed after the upload: remove the orphan
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    if (e instanceof ImageRejected) return json(415, { error: e.message });
    const code = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (code === "42501") return json(403, { error: "This account cannot change images right now." });
    if (code === "P0001") return json(409, { error: dbMessage(e) });
    console.error("upload failed", (e as Error).message);
    return json(500, { error: "Upload failed. Try again." });
  }
}
