"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import {
  cities, packageImages, packages, photographerPhones, photographers, photographerServices,
  portfolioImages, portfolioSegments, services, smartphoneModels, states,
} from "@/db/schema";
import { dbMessage, slugify } from "@/lib/admin";
import { LEVEL_LABEL, youtubeId, youtubeWatchUrl } from "@/lib/format";
import { isUuid } from "@/lib/admin-data";
import { requirePhotographer, asPhotographer, completion, LEVELS, type PanelTx } from "@/lib/photographer";
import { PUBLIC_TAG } from "@/lib/public";
import { purgeUrls } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { email as emailOf, passwordOk, str } from "@/lib/validate";

export type Result = { ok?: string; error?: string; id?: string } | null;

class Rejected extends Error {}
const reject = (msg: string): never => {
  throw new Rejected(msg);
};

/** Every action: verify photographer first, run under RLS, map errors to a safe message, refresh pages. */
async function run(work: (tx: PanelTx, me: { id: string }) => Promise<string | { ok: string; id: string }>): Promise<Result> {
  try {
    const out = await asPhotographer((tx, me) => work(tx, me));
    revalidatePath("/photographer", "layout");
    revalidatePath("/", "layout");
    updateTag(PUBLIC_TAG);
    return typeof out === "string" ? { ok: out } : out;
  } catch (e) {
    if (e instanceof Rejected) return { error: e.message };
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    const code = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (code === "23505") return { error: "That already exists." };
    return { error: dbMessage(e) };
  }
}

const uuid = (fd: FormData, k: string) => (isUuid(fd.get(k)) ? (fd.get(k) as string) : reject("Invalid selection."));
const phone = (v: FormDataEntryValue | null, label: string, required = false) => {
  const s = str(v, 20);
  if (!s) return required ? reject(`${label} is required.`) : null;
  return /^\+?[0-9][0-9 ()-]{6,19}$/.test(s) ? s : reject(`Enter a valid ${label.toLowerCase()} number.`);
};
const socialUrl = (v: FormDataEntryValue | null, label: string) => {
  const s = str(v, 500);
  if (!s) return null;
  let protocol: string;
  try {
    protocol = new URL(s).protocol;
  } catch {
    return reject(`Enter a valid ${label} link.`);
  }
  return protocol === "https:" ? s : reject(`${label} link must start with https://`);
};

// ---------- Profile ----------
export async function saveProfile(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const businessName = str(fd.get("businessName"), 150) || reject("Name is required.");
    const [cur] = await tx.select().from(photographers).where(eq(photographers.id, me.id));
    const stateId = isUuid(fd.get("stateId")) ? (fd.get("stateId") as string) : null;
    const cityId = isUuid(fd.get("cityId")) ? (fd.get("cityId") as string) : null;
    if (cityId && !stateId) reject("Choose a state first.");
    if (stateId) {
      const [s] = await tx.select({ active: states.isActive }).from(states).where(eq(states.id, stateId));
      if (!s || (!s.active && cur.stateId !== stateId)) reject("That state is not available.");
    }
    if (cityId) {
      const [c] = await tx.select({ active: cities.isActive, stateId: cities.stateId }).from(cities).where(eq(cities.id, cityId));
      if (!c || c.stateId !== stateId || (!c.active && cur.cityId !== cityId)) reject("That city is not available for the chosen state.");
    }

    // Models: only add/remove ACTIVE ones; links to since-deactivated models are kept as history.
    const wanted = [...new Set(fd.getAll("modelId").filter(isUuid))] as string[];
    const active = wanted.length
      ? await tx.select({ id: smartphoneModels.id }).from(smartphoneModels).where(and(inArray(smartphoneModels.id, wanted), eq(smartphoneModels.status, "active")))
      : [];
    if (active.length !== wanted.length) reject("One of the selected smartphone models is not available.");
    const have = await tx.select({ modelId: photographerPhones.modelId }).from(photographerPhones).where(eq(photographerPhones.photographerId, me.id));
    const haveIds = new Set(have.map((h) => h.modelId));
    const activeHave = have.length
      ? await tx.select({ id: smartphoneModels.id }).from(smartphoneModels).where(and(inArray(smartphoneModels.id, [...haveIds]), eq(smartphoneModels.status, "active")))
      : [];
    const drop = activeHave.map((m) => m.id).filter((m) => !wanted.includes(m));
    if (drop.length) await tx.delete(photographerPhones).where(and(eq(photographerPhones.photographerId, me.id), inArray(photographerPhones.modelId, drop)));
    const add = wanted.filter((m) => !haveIds.has(m));
    if (add.length) await tx.insert(photographerPhones).values(add.map((modelId) => ({ photographerId: me.id, modelId })));

    const next = {
      businessName,
      phone: phone(fd.get("phone"), "Phone"),
      whatsapp: phone(fd.get("whatsapp"), "WhatsApp"),
      email: emailOf(fd.get("email")) || null,
      about: str(fd.get("about"), 4000) || null,
      instagramUrl: socialUrl(fd.get("instagramUrl"), "Instagram"),
      youtubeUrl: socialUrl(fd.get("youtubeUrl"), "YouTube"),
      websiteUrl: socialUrl(fd.get("websiteUrl"), "Website"),
      stateId, cityId,
    };
    const [svc] = await tx.select({ n: count() }).from(photographerServices).where(eq(photographerServices.photographerId, me.id));
    const [pk] = await tx.select({ n: count() }).from(packages).where(eq(packages.photographerId, me.id));
    const done = completion({ ...cur, ...next }, { models: haveIds.size - drop.length + add.length, services: svc.n, packages: pk.n });
    // status / user_id are not touched here; guard_photographer_privileged_columns also blocks them in the DB.
    const rows = await tx.update(photographers).set({ ...next, isProfileComplete: done.core }).where(eq(photographers.id, me.id)).returning({ id: photographers.id });
    if (!rows.length) reject("Profile not found.");
    return "Profile saved.";
  });
}

const IMAGE_SLOTS = {
  photo: { profilePhotoUrl: null },
  logo: { logoUrl: null },
  banner: { bannerUrl: null },
} as const;
const SLOT_URL = { photo: "profilePhotoUrl", logo: "logoUrl", banner: "bannerUrl" } as const;

/** Clears one profile image (photo / logo / banner) of the caller's own profile, then deletes the stored file. */
export async function removeProfileImage(_: Result, fd: FormData) {
  const urls: string[] = [];
  let owner = "";
  const res = await run(async (tx, me) => {
    owner = me.id;
    const slot = fd.get("slot") as keyof typeof IMAGE_SLOTS;
    if (!Object.hasOwn(IMAGE_SLOTS, slot)) reject("Invalid image.");
    const [cur] = await tx.select({ status: photographers.status, profilePhotoUrl: photographers.profilePhotoUrl, logoUrl: photographers.logoUrl, bannerUrl: photographers.bannerUrl })
      .from(photographers).where(eq(photographers.id, me.id)).for("update");
    if (!cur) reject("Profile not found.");
    if (cur.status === "rejected" || cur.status === "inactive") reject("This account can no longer change profile images.");
    const url = cur[SLOT_URL[slot]];
    if (!url) reject("There is no image to remove.");
    await tx.update(photographers).set(IMAGE_SLOTS[slot]).where(eq(photographers.id, me.id));
    urls.push(url!);
    return "Image removed.";
  });
  if (res?.ok) await purgeUrls(urls, owner);
  return res;
}

// ---------- Services ----------
export async function addService(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const serviceId = uuid(fd, "serviceId");
    const [s] = await tx.select({ status: services.status }).from(services).where(eq(services.id, serviceId));
    if (!s || s.status !== "active") reject("That service is not available.");
    await tx.insert(photographerServices).values({ photographerId: me.id, serviceId });
    return "Service added.";
  });
}

export async function removeService(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const serviceId = uuid(fd, "serviceId");
    const [pk] = await tx.select({ n: count() }).from(packages).where(and(eq(packages.photographerId, me.id), eq(packages.serviceId, serviceId)));
    if (pk.n > 0) reject("Delete this service's packages first.");
    await tx.delete(photographerServices).where(and(eq(photographerServices.photographerId, me.id), eq(photographerServices.serviceId, serviceId)));
    return "Service removed.";
  });
}

// ---------- Packages ----------
const MIN_PRICE = 1999; // also enforced by DB checks on packages
const parseMoney = (v: FormDataEntryValue | null, label: string) => {
  const n = Number(str(v, 12).replace(/,/g, ""));
  return Number.isFinite(n) && n >= MIN_PRICE && n < 100_000_000 ? Math.round(n * 100) / 100 : reject(`Enter ${label} of at least ₹${MIN_PRICE}.`);
};
/** Offer (selling) price must be > 0 and no higher than the base (original) price. Also enforced by DB checks. */
function parsePrices(base: FormDataEntryValue | null, offer: FormDataEntryValue | null) {
  const basePrice = parseMoney(base, "a base price");
  const offerPrice = parseMoney(offer, "an offer price");
  if (offerPrice > basePrice) reject("Offer price cannot be higher than the base price.");
  return { basePrice: basePrice.toFixed(2), offerPrice: offerPrice.toFixed(2) };
}

/** Optional YouTube link, stored as the canonical watch URL. */
function youtubeField(v: FormDataEntryValue | null) {
  const raw = str(v, 300);
  if (!raw) return null;
  const id = youtubeId(raw);
  return id ? youtubeWatchUrl(id) : reject("Enter a valid YouTube video link (for example https://www.youtube.com/watch?v=...).");
}

/** Optional extra: "yes" = included, "no" = not included, anything else = not specified (null). */
const triState = (v: FormDataEntryValue | null) => (v === "yes" ? true : v === "no" ? false : null);

/** Create (no id) or edit (id) one package. Ownership: service must be the caller's; id must be the caller's. */
export async function savePackage(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const level = fd.get("level");
    if (!LEVELS.includes(level as (typeof LEVELS)[number])) reject("Invalid package level.");
    const serviceId = uuid(fd, "serviceId");
    const [svc] = await tx.select({ travel: services.travelStayEnabled, location: services.locationEnabled, makeup: services.makeupEnabled, costume: services.costumeEnabled }).from(services).where(eq(services.id, serviceId));
    if (!svc) reject("Service not found.");
    const values = {
      name: LEVEL_LABEL[level as (typeof LEVELS)[number]], // package names are fixed: Basic / Standard / Premium
      ...parsePrices(fd.get("basePrice"), fd.get("offerPrice")),
      inclusions: str(fd.get("inclusions"), 4000).split("\n").map((l) => l.trim()).filter(Boolean).join("\n") || reject("List what is included."),
      detailedDescription: str(fd.get("detailedDescription"), 8000) || null,
      youtubeUrl: youtubeField(fd.get("youtubeUrl")),
      travelStayIncluded: svc.travel ? triState(fd.get("travelStayIncluded")) : null,
      locationIncluded: svc.location ? triState(fd.get("locationIncluded")) : null,
      makeupIncluded: svc.makeup ? triState(fd.get("makeupIncluded")) : null,
      costumeIncluded: svc.costume ? triState(fd.get("costumeIncluded")) : null,
    };
    const id = fd.get("id");
    if (id) {
      if (!isUuid(id)) reject("Invalid package.");
      const [cur] = await tx.select({ status: packages.status }).from(packages).where(and(eq(packages.id, id as string), eq(packages.photographerId, me.id)));
      if (!cur) reject("Package not found.");
      if (cur.status === "inactive") reject("This package was deactivated by an admin.");
      const rows = await tx.update(packages).set(values).where(and(eq(packages.id, id as string), eq(packages.photographerId, me.id))).returning({ id: packages.id });
      if (!rows.length) reject("Package not found.");
      return "Package saved.";
    }
    const [have] = await tx.select({ id: packages.id }).from(packages).where(and(eq(packages.photographerId, me.id), eq(packages.serviceId, serviceId), eq(packages.level, level as (typeof LEVELS)[number])));
    if (have) reject(`You already have a ${level} package for this service.`);
    const [created] = await tx.insert(packages).values({ ...values, price: values.offerPrice, photographerId: me.id, serviceId, level: level as (typeof LEVELS)[number], status: "draft" }).returning({ id: packages.id });
    return { ok: "Package created as a draft.", id: created.id };
  });
}

const PACKAGE_MOVES = {
  submit: { from: ["draft", "rejected"], to: "pending_review" },
  withdraw: { from: ["pending_review"], to: "draft" },
} as const;

/** submit = draft/rejected → pending_review (DB requires a banner image); withdraw = pending_review → draft. Never publishes. */
export async function movePackage(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const move = PACKAGE_MOVES[fd.get("move") as keyof typeof PACKAGE_MOVES] ?? reject("Invalid action.");
    const id = uuid(fd, "id");
    const [cur] = await tx.select({ status: packages.status }).from(packages).where(and(eq(packages.id, id), eq(packages.photographerId, me.id)));
    if (!cur) reject("Package not found.");
    if (!(move.from as readonly string[]).includes(cur.status)) reject("That package cannot be moved from its current status.");
    await tx.update(packages).set({ status: move.to }).where(and(eq(packages.id, id), eq(packages.photographerId, me.id)));
    return move.to === "pending_review" ? "Submitted for review." : "Moved back to draft.";
  });
}

export async function deletePackage(_: Result, fd: FormData) {
  const urls: string[] = [];
  let owner = "";
  const res = await run(async (tx, me) => {
    owner = me.id;
    const id = uuid(fd, "id");
    const [cur] = await tx.select({ status: packages.status }).from(packages).where(and(eq(packages.id, id), eq(packages.photographerId, me.id)));
    if (!cur) reject("Package not found.");
    if (cur.status === "inactive") reject("Deactivated packages are kept for history and cannot be deleted.");
    urls.push(...(await tx.select({ u: packageImages.imageUrl }).from(packageImages).where(eq(packageImages.packageId, id))).map((r) => r.u));
    await tx.delete(packages).where(and(eq(packages.id, id), eq(packages.photographerId, me.id)));
    return "Package deleted.";
  });
  if (res?.ok) await purgeUrls(urls, owner); // files go only after the DB delete committed
  return res;
}

export async function deletePackageImage(_: Result, fd: FormData) {
  const urls: string[] = [];
  let owner = "";
  const res = await run(async (tx, me) => {
    owner = me.id;
    const id = uuid(fd, "id");
    const [img] = await tx
      .select({ packageId: packageImages.packageId, status: packages.status, url: packageImages.imageUrl })
      .from(packageImages)
      .innerJoin(packages, eq(packages.id, packageImages.packageId))
      .where(and(eq(packageImages.id, id), eq(packages.photographerId, me.id)));
    if (!img) reject("Image not found.");
    if (img.status === "inactive") reject("This package was deactivated by an admin.");
    // DB trigger refuses to remove the last image of a live package.
    await tx.delete(packageImages).where(eq(packageImages.id, id));
    urls.push(img.url);
    return "Image removed.";
  });
  if (res?.ok) await purgeUrls(urls, owner);
  return res;
}

// ---------- Portfolio ----------
export async function createSegment(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const name = str(fd.get("name"), 100) || reject("Segment name is required.");
    const base = slugify(name) || "segment";
    const taken = new Set((await tx.select({ s: portfolioSegments.slug }).from(portfolioSegments).where(eq(portfolioSegments.photographerId, me.id))).map((r) => r.s));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    await tx.insert(portfolioSegments).values({ photographerId: me.id, name, slug, description: str(fd.get("description"), 500) || null });
    return "Segment created.";
  });
}

export async function renameSegment(_: Result, fd: FormData) {
  return run(async (tx, me) => {
    const name = str(fd.get("name"), 100) || reject("Segment name is required.");
    const rows = await tx.update(portfolioSegments).set({ name, description: str(fd.get("description"), 500) || null })
      .where(and(eq(portfolioSegments.id, uuid(fd, "id")), eq(portfolioSegments.photographerId, me.id))).returning({ id: portfolioSegments.id });
    if (!rows.length) reject("Segment not found.");
    return "Segment updated.";
  });
}

export async function deleteSegment(_: Result, fd: FormData) {
  const urls: string[] = [];
  let owner = "";
  const res = await run(async (tx, me) => {
    owner = me.id;
    const id = uuid(fd, "id");
    const files = await tx.select({ u: portfolioImages.imageUrl }).from(portfolioImages)
      .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
      .where(and(eq(portfolioSegments.id, id), eq(portfolioSegments.photographerId, me.id)));
    const rows = await tx.delete(portfolioSegments).where(and(eq(portfolioSegments.id, id), eq(portfolioSegments.photographerId, me.id))).returning({ id: portfolioSegments.id });
    if (!rows.length) reject("Segment not found.");
    urls.push(...files.map((f) => f.u));
    return "Segment deleted.";
  });
  if (res?.ok) await purgeUrls(urls, owner);
  return res;
}

export async function deletePortfolioImage(_: Result, fd: FormData) {
  const urls: string[] = [];
  let owner = "";
  const res = await run(async (tx, me) => {
    owner = me.id;
    const id = uuid(fd, "id");
    const [img] = await tx
      .select({ id: portfolioImages.id, status: portfolioImages.status, url: portfolioImages.imageUrl })
      .from(portfolioImages)
      .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
      .where(and(eq(portfolioImages.id, id), eq(portfolioSegments.photographerId, me.id)));
    if (!img) reject("Image not found.");
    if (img.status === "inactive") reject("Deactivated images are kept for history.");
    await tx.delete(portfolioImages).where(eq(portfolioImages.id, id));
    urls.push(img.url);
    return "Image deleted.";
  });
  if (res?.ok) await purgeUrls(urls, owner);
  return res;
}

// ---------- Account ----------
export async function updateAccountEmail(_: Result, fd: FormData) {
  await requirePhotographer();
  const next = emailOf(fd.get("email"));
  if (!next) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: next });
  return error ? { error: "Could not update the email. Try a different address." } : { ok: "Check your new inbox to confirm the change." };
}

export async function changePassword(_: Result, fd: FormData) {
  const user = await requirePhotographer();
  const current = fd.get("current");
  const next = fd.get("next");
  if (typeof current !== "string" || !current) return { error: "Enter your current password." };
  if (!passwordOk(next)) return { error: "New password must be 8-72 characters." };
  if (next !== fd.get("confirm")) return { error: "Passwords do not match." };
  if (next === current) return { error: "Choose a different password." };
  const supabase = await createClient();
  const { error: badCurrent } = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: current });
  if (badCurrent) return { error: "Current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: next });
  return error ? { error: "Could not update the password. Choose a different one." } : { ok: "Password changed." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/photographer/login");
}
