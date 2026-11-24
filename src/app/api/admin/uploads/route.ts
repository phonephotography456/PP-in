import { getUser, roleOf } from "@/lib/auth";
import { ImageRejected, MAX_UPLOAD_BYTES, processImage } from "@/lib/image";
import { rateLimit } from "@/lib/rate-limit";
import { deleteKey, publicUrl, putImage, r2Configured } from "@/lib/r2";

const json = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** POST multipart (file) → stores a re-encoded WebP under banners/ in R2 and returns its public URL. Admin only. */
export async function POST(req: Request) {
  // CSRF: browsers always send Origin on cross-site POSTs; it must match this host.
  const origin = req.headers.get("origin");
  const originHost = origin ? URL.parse(origin)?.host : undefined;
  if (!originHost || originHost !== req.headers.get("host")) return json(403, { error: "Cross-site request blocked." });

  const user = await getUser();
  if (!user) return json(401, { error: "Sign in to upload images." });
  if (roleOf(user) !== "admin") return json(403, { error: "Only admins can upload here." });
  if (!r2Configured()) return json(503, { error: "Image storage is not configured." });
  if (!rateLimit(`admin-upload:${user.id}`, 60, 60_000).ok) return json(429, { error: "Too many uploads. Wait a minute and try again." });

  const length = Number(req.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) return json(411, { error: "Content-Length is required." });
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return json(413, { error: "Image is larger than 5 MB." });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json(400, { error: "Choose an image file." });
  if (file.size > MAX_UPLOAD_BYTES) return json(413, { error: "Image is larger than 5 MB." });

  const key = `banners/${crypto.randomUUID()}.webp`;
  try {
    await putImage(key, await processImage(Buffer.from(await file.arrayBuffer())));
    return json(201, { ok: true, url: publicUrl(key) });
  } catch (e) {
    await deleteKey(key).catch(() => {});
    if (e instanceof ImageRejected) return json(415, { error: e.message });
    console.error("admin upload failed", (e as Error).message);
    return json(500, { error: "Upload failed. Try again." });
  }
}
