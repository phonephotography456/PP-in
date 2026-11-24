import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import {
  cities, packageImages, packages, photographerPhones, photographers, photographerServices,
  portfolioImages, portfolioSegments, services, smartphoneBrands, smartphoneModels, states,
} from "@/db/schema";
import { withUser } from "@/db/with-user";
import { requireRole } from "@/lib/auth";
import { ensurePhotographerProfile } from "@/lib/photographer-profile";

export const LEVELS = packages.level.enumValues;
export type Level = (typeof LEVELS)[number];
/** One banner image per package (older packages may still hold up to 5). */
export const MAX_PACKAGE_IMAGES = 1;
export const MIN_PACKAGE_IMAGES = 1;
export const MAX_PORTFOLIO_IMAGES = 50;

/**
 * Verified photographer identity or redirect. Every panel page and server action starts here;
 * the returned user id comes from supabase.auth.getUser(), never from client input.
 */
export const requirePhotographer = () => requireRole("photographer", "/photographer/login");

export type PanelTx = Parameters<Parameters<typeof withUser>[1]>[0];

/** Transaction as the photographer's own JWT: Postgres RLS + guard triggers apply on top of app checks. */
export async function asPhotographer<T>(fn: (tx: PanelTx, me: { id: string; userId: string; status: (typeof photographers.status.enumValues)[number] }) => Promise<T>) {
  const user = await requirePhotographer();
  const run = () =>
    withUser(user.id, async (tx) => {
      const [me] = await tx
        .select({ id: photographers.id, userId: photographers.userId, status: photographers.status })
        .from(photographers)
        .where(eq(photographers.userId, user.id))
        .limit(1);
      return me ? fn(tx, me) : null;
    });
  let out = await run();
  if (out === null) {
    await ensurePhotographerProfile(user); // verified photographer without a profile row yet
    out = await run();
  }
  if (out === null) throw new Error("Photographer profile unavailable");
  return out;
}

/** Fields counted toward profile completion; shared by dashboard and the profile save. */
export function completion(p: {
  profilePhotoUrl: string | null; bannerUrl: string | null; about: string | null; phone: string | null;
  whatsapp: string | null; stateId: string | null; cityId: string | null;
}, counts: { models: number; services: number; packages: number }) {
  const items: [string, boolean, string][] = [
    ["Add contact phone and WhatsApp", !!(p.phone && p.whatsapp), "/photographer/profile"],
    ["Choose your state and city", !!(p.stateId && p.cityId), "/photographer/profile"],
    ["Write your about text", !!p.about?.trim(), "/photographer/profile"],
    ["Select the smartphones you use", counts.models > 0, "/photographer/profile"],
    ["Add a profile photo", !!p.profilePhotoUrl, "/photographer/profile"],
    ["Add a banner image", !!p.bannerUrl, "/photographer/profile"],
    ["Add a service", counts.services > 0, "/photographer/services"],
    ["Create a package", counts.packages > 0, "/photographer/services"],
  ];
  const done = items.filter((i) => i[1]).length;
  return { items, percent: Math.round((done / items.length) * 100), core: items.slice(0, 4).every((i) => i[1]) };
}

export const getDashboardData = () =>
  asPhotographer(async (tx, me) => {
    const [p] = await tx.select().from(photographers).where(eq(photographers.id, me.id));
    const svc = await tx.select({ id: photographerServices.id }).from(photographerServices).where(eq(photographerServices.photographerId, me.id));
    const pk = await tx.select({ status: packages.status }).from(packages).where(eq(packages.photographerId, me.id));
    const ph = await tx.select({ id: photographerPhones.id }).from(photographerPhones).where(eq(photographerPhones.photographerId, me.id));
    const imgs = await tx
      .select({ status: portfolioImages.status })
      .from(portfolioImages)
      .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
      .where(eq(portfolioSegments.photographerId, me.id));
    const counts = { models: ph.length, services: svc.length, packages: pk.length };
    return {
      p, counts, completion: completion(p, counts),
      byStatus: (s: string) => pk.filter((k) => k.status === s).length,
      portfolio: { total: imgs.length, pending: imgs.filter((i) => i.status === "pending_review").length },
    };
  });

export const getProfileData = () =>
  asPhotographer(async (tx, me) => {
    const [p] = await tx.select().from(photographers).where(eq(photographers.id, me.id));
    const stateRows = await tx.select({ id: states.id, name: states.name, active: states.isActive }).from(states).orderBy(asc(states.sortOrder), asc(states.name));
    const cityRows = await tx.select({ id: cities.id, stateId: cities.stateId, name: cities.name, active: cities.isActive }).from(cities).orderBy(asc(cities.sortOrder), asc(cities.name));
    const models = await tx
      .select({ id: smartphoneModels.id, name: smartphoneModels.name, status: smartphoneModels.status, brandId: smartphoneBrands.id, brand: smartphoneBrands.name, brandStatus: smartphoneBrands.status })
      .from(smartphoneModels)
      .innerJoin(smartphoneBrands, eq(smartphoneBrands.id, smartphoneModels.brandId))
      .orderBy(asc(smartphoneBrands.sortOrder), asc(smartphoneBrands.name), asc(smartphoneModels.sortOrder), asc(smartphoneModels.name));
    const mine = await tx.select({ modelId: photographerPhones.modelId }).from(photographerPhones).where(eq(photographerPhones.photographerId, me.id));
    return { p, states: stateRows, cities: cityRows, models, selected: new Set(mine.map((m) => m.modelId)) };
  });

export const getServicesData = () =>
  asPhotographer(async (tx, me) => {
    const mine = await tx
      .select({ id: services.id, name: services.name, slug: services.slug, status: services.status, travelStay: services.travelStayEnabled, location: services.locationEnabled, makeup: services.makeupEnabled, costume: services.costumeEnabled })
      .from(photographerServices)
      .innerJoin(services, eq(services.id, photographerServices.serviceId))
      .where(eq(photographerServices.photographerId, me.id))
      .orderBy(asc(services.sortOrder), asc(services.name));
    const active = await tx.select({ id: services.id, name: services.name }).from(services).where(eq(services.status, "active")).orderBy(asc(services.sortOrder), asc(services.name));
    const pk = await tx.select().from(packages).where(eq(packages.photographerId, me.id));
    const imgs = pk.length
      ? await tx.select().from(packageImages).where(inArray(packageImages.packageId, pk.map((k) => k.id))).orderBy(asc(packageImages.sortOrder))
      : [];
    const have = new Set(mine.map((s) => s.id));
    return {
      me,
      mine,
      addable: active.filter((s) => !have.has(s.id)),
      packages: pk.map((k) => ({ ...k, images: imgs.filter((i) => i.packageId === k.id) })),
    };
  });

export const getPortfolioData = () =>
  asPhotographer(async (tx, me) => {
    const segs = await tx.select().from(portfolioSegments).where(eq(portfolioSegments.photographerId, me.id)).orderBy(asc(portfolioSegments.sortOrder), asc(portfolioSegments.createdAt));
    const imgs = segs.length
      ? await tx.select().from(portfolioImages).where(inArray(portfolioImages.segmentId, segs.map((s) => s.id))).orderBy(asc(portfolioImages.sortOrder), asc(portfolioImages.createdAt))
      : [];
    return { me, segments: segs.map((s) => ({ ...s, images: imgs.filter((i) => i.segmentId === s.id) })) };
  });
