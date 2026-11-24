"use server";

import { revalidatePath } from "next/cache";
import { asc, count, eq, sql } from "drizzle-orm";
import {
  cities, homepageBanners, homepageFeaturedItems, packages, photographerPhones, photographers,
  photographerServices, portfolioImages, serviceReviews, services, smartphoneBrands, smartphoneModels, states,
} from "@/db/schema";
import { asAdmin, dbMessage, requireAdmin, slugify } from "@/lib/admin";
import { IMAGE_STATUSES, PACKAGE_STATUSES, PHOTOGRAPHER_STATUSES, REVIEW_STATUSES, isUuid, oneOf } from "@/lib/admin-data";
import { email, str } from "@/lib/validate";

export type Result = { ok?: string; error?: string } | null;
type Tx = Parameters<Parameters<typeof asAdmin>[0]>[0];

class Rejected extends Error {}
function reject(msg: string): never {
  throw new Rejected(msg);
}

/** Every action: verify admin first, run, map errors to a message, refresh admin + public pages. */
async function run(work: (tx: Tx) => Promise<string>): Promise<Result> {
  try {
    const ok = await asAdmin(work);
    revalidatePath("/", "layout");
    return { ok };
  } catch (e) {
    if (e instanceof Rejected) return { error: e.message };
    // redirect() from requireRole must propagate
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: dbMessage(e) };
  }
}

const id = (fd: FormData) => (isUuid(fd.get("id")) ? (fd.get("id") as string) : reject("Invalid record."));
const uuidField = (fd: FormData, k: string) => (isUuid(fd.get(k)) ? (fd.get(k) as string) : reject("Invalid selection."));
const sortOrder = (fd: FormData) => {
  const n = Math.trunc(Number(fd.get("sortOrder") ?? 0));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 9999) : 0;
};
const name = (fd: FormData, max: number) => str(fd.get("name"), max) || reject("Name is required.");
/** http(s) only; blocks javascript:/data: URLs. */
const httpUrl = (v: FormDataEntryValue | null, required = false) => {
  const s = str(v, 2000);
  if (!s) return required ? reject("Image URL is required.") : null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? s : reject("URL must start with http:// or https://");
  } catch {
    return reject("Enter a valid URL.");
  }
};
/** Site-relative path or http(s) URL. */
const linkUrl = (v: FormDataEntryValue | null) => {
  const s = str(v, 2000);
  if (!s) return null;
  return s.startsWith("/") && !s.startsWith("//") ? s : httpUrl(s);
};
const must = (rows: unknown[]) => (rows.length ? undefined : reject("Record not found."));

// ---------- Photographers ----------
export async function setPhotographerStatus(_: Result, fd: FormData) {
  return run(async (tx) => {
    const status = oneOf(PHOTOGRAPHER_STATUSES, fd.get("status")) ?? reject("Invalid status.");
    must(await tx.update(photographers).set({ status }).where(eq(photographers.id, id(fd))).returning({ id: photographers.id }));
    return `Photographer ${status}.`;
  });
}

export async function updatePhotographer(_: Result, fd: FormData) {
  return run(async (tx) => {
    const rawEmail = str(fd.get("email"));
    const mail = rawEmail ? email(rawEmail) || reject("Enter a valid email.") : null;
    must(await tx.update(photographers).set({
      businessName: name(fd, 150),
      phone: str(fd.get("phone"), 20) || null,
      whatsapp: str(fd.get("whatsapp"), 20) || null,
      email: mail,
      about: str(fd.get("about"), 5000) || null,
    }).where(eq(photographers.id, id(fd))).returning({ id: photographers.id }));
    return "Photographer saved.";
  });
}

// ---------- Reviews ----------
export async function setReviewStatus(_: Result, fd: FormData) {
  const admin = await requireAdmin();
  return run(async (tx) => {
    const status = oneOf(REVIEW_STATUSES, fd.get("status")) ?? reject("Invalid status.");
    must(await tx.update(serviceReviews).set({ status, reviewedBy: admin.id, reviewedAt: new Date() })
      .where(eq(serviceReviews.id, id(fd))).returning({ id: serviceReviews.id }));
    return `Review ${status}.`;
  });
}

// ---------- Master data (services / brands / models) ----------
const ENTITIES = {
  service: { label: "Service", table: services },
  brand: { label: "Brand", table: smartphoneBrands },
  model: { label: "Model", table: smartphoneModels },
} as const;
type Entity = keyof typeof ENTITIES;
const entity = (fd: FormData): Entity => {
  const e = fd.get("entity");
  return e === "service" || e === "brand" || e === "model" ? e : reject("Invalid record type.");
};

export async function saveMaster(_: Result, fd: FormData) {
  return run(async (tx) => {
    const e = entity(fd);
    const n = name(fd, e === "brand" ? 50 : 100);
    const base = { name: n, sortOrder: sortOrder(fd) };
    const rowId = isUuid(fd.get("id")) ? (fd.get("id") as string) : null;
    // Slug is set on create only: it appears in public URLs and must stay stable on rename.
    const slug = slugify(n) || reject("Name must contain letters or numbers.");
    if (e === "service") {
      const description = str(fd.get("description"), 1000) || null;
      if (rowId) must(await tx.update(services).set({ ...base, description }).where(eq(services.id, rowId)).returning({ id: services.id }));
      else await tx.insert(services).values({ ...base, description, slug });
    } else if (e === "brand") {
      if (rowId) must(await tx.update(smartphoneBrands).set(base).where(eq(smartphoneBrands.id, rowId)).returning({ id: smartphoneBrands.id }));
      else await tx.insert(smartphoneBrands).values({ ...base, slug: slug.slice(0, 50) });
    } else {
      if (rowId) must(await tx.update(smartphoneModels).set(base).where(eq(smartphoneModels.id, rowId)).returning({ id: smartphoneModels.id }));
      else await tx.insert(smartphoneModels).values({ ...base, brandId: uuidField(fd, "brandId"), slug });
    }
    return `${ENTITIES[e].label} saved.`;
  });
}

/** Active/inactive toggle. Never deletes, so photographers' services/phones and package history stay intact. */
export async function setMasterStatus(_: Result, fd: FormData) {
  return run(async (tx) => {
    const e = entity(fd);
    const status = fd.get("status") === "active" ? "active" : "inactive";
    const t = ENTITIES[e].table;
    must(await tx.update(t).set({ status }).where(eq(t.id, id(fd))).returning({ id: t.id }));
    return `${ENTITIES[e].label} ${status === "active" ? "activated" : "deactivated"}.`;
  });
}

/** Delete is allowed only for unreferenced records: FKs cascade, so deleting a used one would erase history. */
export async function deleteMaster(_: Result, fd: FormData) {
  return run(async (tx) => {
    const e = entity(fd);
    const rowId = id(fd);
    const used =
      e === "service"
        ? (await tx.select({ n: count() }).from(packages).where(eq(packages.serviceId, rowId)))[0].n +
          (await tx.select({ n: count() }).from(photographerServices).where(eq(photographerServices.serviceId, rowId)))[0].n +
          (await tx.select({ n: count() }).from(serviceReviews).where(eq(serviceReviews.serviceId, rowId)))[0].n
        : e === "brand"
          ? (await tx.select({ n: count() }).from(smartphoneModels).where(eq(smartphoneModels.brandId, rowId)))[0].n
          : (await tx.select({ n: count() }).from(photographerPhones).where(eq(photographerPhones.modelId, rowId)))[0].n;
    if (used) reject("This record is in use. Deactivate it instead of deleting.");
    const t = ENTITIES[e].table;
    must(await tx.delete(t).where(eq(t.id, rowId)).returning({ id: t.id }));
    return `${ENTITIES[e].label} deleted.`;
  });
}

// ---------- Locations ----------
export async function saveState(_: Result, fd: FormData) {
  return run(async (tx) => {
    const n = name(fd, 100);
    const base = { name: n, sortOrder: sortOrder(fd) };
    if (isUuid(fd.get("id"))) must(await tx.update(states).set(base).where(eq(states.id, id(fd))).returning({ id: states.id }));
    else await tx.insert(states).values({ ...base, slug: slugify(n) || reject("Name must contain letters or numbers.") });
    return "State saved.";
  });
}

export async function saveCity(_: Result, fd: FormData) {
  return run(async (tx) => {
    const n = name(fd, 100);
    const base = { name: n, sortOrder: sortOrder(fd) };
    if (isUuid(fd.get("id"))) must(await tx.update(cities).set(base).where(eq(cities.id, id(fd))).returning({ id: cities.id }));
    else await tx.insert(cities).values({ ...base, stateId: uuidField(fd, "stateId"), slug: slugify(n) || reject("Name must contain letters or numbers.") });
    return "City saved.";
  });
}

export async function setLocationActive(_: Result, fd: FormData) {
  return run(async (tx) => {
    const isActive = fd.get("active") === "1";
    const kind = fd.get("kind") === "state" ? states : cities;
    must(await tx.update(kind).set({ isActive }).where(eq(kind.id, id(fd))).returning({ id: kind.id }));
    return isActive ? "Activated." : "Deactivated.";
  });
}

/** FKs null out photographer location on delete, so only unreferenced locations may be deleted. */
export async function deleteLocation(_: Result, fd: FormData) {
  return run(async (tx) => {
    const rowId = id(fd);
    if (fd.get("kind") === "state") {
      const [c] = await tx.select({ n: count() }).from(cities).where(eq(cities.stateId, rowId));
      const [p] = await tx.select({ n: count() }).from(photographers).where(eq(photographers.stateId, rowId));
      if (c.n || p.n) reject("This state has cities or photographers. Deactivate it instead.");
      must(await tx.delete(states).where(eq(states.id, rowId)).returning({ id: states.id }));
    } else {
      const [p] = await tx.select({ n: count() }).from(photographers).where(eq(photographers.cityId, rowId));
      if (p.n) reject("Photographers use this city. Deactivate it instead.");
      must(await tx.delete(cities).where(eq(cities.id, rowId)).returning({ id: cities.id }));
    }
    return "Deleted.";
  });
}

// ---------- Packages & portfolio ----------
// Moderation transitions. Drafts belong to the photographer and cannot be touched by admin.
const PACKAGE_MOVES: Record<string, string[]> = {
  pending_review: ["published", "rejected"],
  published: ["inactive"],
  rejected: ["published"],
  inactive: ["published"],
};

export async function setPackageStatus(_: Result, fd: FormData) {
  return run(async (tx) => {
    const status = oneOf(PACKAGE_STATUSES, fd.get("status")) ?? reject("Invalid status.");
    const [cur] = await tx.select({ status: packages.status }).from(packages).where(eq(packages.id, id(fd))).limit(1);
    if (!cur) reject("Package not found.");
    if (!PACKAGE_MOVES[cur.status]?.includes(status)) reject(`A ${cur.status.replace("_", " ")} package cannot move to ${status.replace("_", " ")}.`);
    // DB trigger rejects publish unless the package has 3-5 images; message is surfaced by run().
    await tx.update(packages).set({ status }).where(eq(packages.id, id(fd)));
    return `Package ${status}.`;
  });
}

export async function setImageStatus(_: Result, fd: FormData) {
  return run(async (tx) => {
    const status = oneOf(IMAGE_STATUSES, fd.get("status")) ?? reject("Invalid status.");
    must(await tx.update(portfolioImages).set({ status }).where(eq(portfolioImages.id, id(fd))).returning({ id: portfolioImages.id }));
    return `Image ${status.replace("_", " ")}.`;
  });
}

// ---------- Homepage ----------
export async function saveBanner(_: Result, fd: FormData) {
  return run(async (tx) => {
    const v = {
      imageUrl: httpUrl(fd.get("imageUrl"), true)!,
      heading: str(fd.get("heading"), 200) || null,
      description: str(fd.get("description"), 1000) || null,
      linkUrl: linkUrl(fd.get("linkUrl")),
      sortOrder: sortOrder(fd),
      isActive: fd.get("isActive") === "on",
    };
    if (isUuid(fd.get("id"))) must(await tx.update(homepageBanners).set(v).where(eq(homepageBanners.id, id(fd))).returning({ id: homepageBanners.id }));
    else await tx.insert(homepageBanners).values(v);
    return "Banner saved.";
  });
}

export async function deleteBanner(_: Result, fd: FormData) {
  return run(async (tx) => {
    must(await tx.delete(homepageBanners).where(eq(homepageBanners.id, id(fd))).returning({ id: homepageBanners.id }));
    return "Banner deleted.";
  });
}

export async function addFeatured(_: Result, fd: FormData) {
  return run(async (tx) => {
    const photographerId = uuidField(fd, "photographerId");
    const [p] = await tx.select({ s: photographers.status }).from(photographers).where(eq(photographers.id, photographerId)).limit(1);
    if (p?.s !== "approved") reject("Only approved photographers can be featured.");
    const [dup] = await tx.select({ n: count() }).from(homepageFeaturedItems).where(eq(homepageFeaturedItems.photographerId, photographerId));
    if (dup.n) reject("Already featured.");
    const [max] = await tx.select({ m: sql<number>`coalesce(max(${homepageFeaturedItems.sortOrder}), 0)::int` }).from(homepageFeaturedItems);
    await tx.insert(homepageFeaturedItems).values({ photographerId, sortOrder: max.m + 1 });
    return "Added to featured.";
  });
}

export async function setFeaturedActive(_: Result, fd: FormData) {
  return run(async (tx) => {
    must(await tx.update(homepageFeaturedItems).set({ isActive: fd.get("active") === "1" }).where(eq(homepageFeaturedItems.id, id(fd))).returning({ id: homepageFeaturedItems.id }));
    return "Updated.";
  });
}

export async function deleteFeatured(_: Result, fd: FormData) {
  return run(async (tx) => {
    must(await tx.delete(homepageFeaturedItems).where(eq(homepageFeaturedItems.id, id(fd))).returning({ id: homepageFeaturedItems.id }));
    return "Removed.";
  });
}

/** Swap with the neighbour, then renumber 1..n so order stays dense even if sort_order values collided. */
export async function moveFeatured(_: Result, fd: FormData) {
  return run(async (tx) => {
    const rowId = id(fd);
    const dir = fd.get("dir") === "up" ? -1 : 1;
    const list = await tx.select({ id: homepageFeaturedItems.id }).from(homepageFeaturedItems)
      .orderBy(asc(homepageFeaturedItems.sortOrder), asc(homepageFeaturedItems.createdAt));
    const i = list.findIndex((r) => r.id === rowId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return "No change.";
    [list[i], list[j]] = [list[j], list[i]];
    for (const [idx, r] of list.entries()) {
      await tx.update(homepageFeaturedItems).set({ sortOrder: idx + 1 }).where(eq(homepageFeaturedItems.id, r.id));
    }
    return "Order updated.";
  });
}
