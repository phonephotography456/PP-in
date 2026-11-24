import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import {
  cities, homepageBanners, homepageFeaturedItems, homepageSections, packageImages, packages, photographerPhones, photographers,
  photographerServices, portfolioImages, portfolioSegments, serviceReviews, services, smartphoneBrands, smartphoneModels, states,
} from "@/db/schema";
import { withAnon } from "@/db/with-anon";
import { LEVELS, PRICE_RANGES, youtubeId, type Level } from "@/lib/format";
import { findListing, findLocation, findService, type Tx } from "@/lib/resolve";

/**
 * Every public read goes through withAnon: the `anon` role + RLS decide visibility. The explicit status
 * predicates below repeat those rules on purpose (defence in depth, and they keep the SQL readable).
 *
 * Reads are cached ("use cache" + pub()): visitors are served from memory and the DB is hit once per cache
 * entry, not once per request. Admin and photographer writes call updateTag(PUBLIC_TAG) so edits show at once.
 */
export const PUBLIC_TAG = "public";
/** Call first inside a "use cache" function: shared lifetime ("public" profile in next.config.ts) + invalidation tag. */
const pub = () => {
  cacheLife("public");
  cacheTag(PUBLIC_TAG);
};

/** Uncached read, only for unbounded input (free-text search) that must not fill the cache. */
const dynamic = async <T>(fn: (tx: Tx) => Promise<T>) => {
  await connection(); // public data is read per request, never baked into the build
  return withAnon(fn);
};

export const PAGE_SIZE = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v: string | null) => Number(v ?? 0);

// ---------- Master data (small, cached a few minutes) ----------
/** Only locations with at least one approved photographer are shown to visitors (filters, homepage, /locations). */
const stateHasPhotographers = sql`exists (select 1 from ${photographers} p where p.state_id = ${states.id} and p.status = 'approved')`;
const cityHasPhotographers = sql`exists (select 1 from ${photographers} p where p.city_id = ${cities.id} and p.status = 'approved')`;

export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>;

export async function getFilterOptions() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const [svc, st, ci, models] = await Promise.all([
      tx.select({ slug: services.slug, name: services.name, description: services.description, showOnHome: services.showOnHome }).from(services).where(eq(services.status, "active")).orderBy(asc(services.sortOrder), asc(services.name)),
      tx.select({ slug: states.slug, name: states.name }).from(states).where(and(eq(states.isActive, true), stateHasPhotographers)).orderBy(asc(states.sortOrder), asc(states.name)),
      tx.select({ slug: cities.slug, name: cities.name, stateSlug: states.slug }).from(cities).innerJoin(states, eq(states.id, cities.stateId)).where(and(eq(cities.isActive, true), eq(states.isActive, true), cityHasPhotographers)).orderBy(asc(cities.sortOrder), asc(cities.name)),
      tx
        .select({ id: smartphoneModels.id, name: smartphoneModels.name, brand: smartphoneBrands.name, brandSlug: smartphoneBrands.slug })
        .from(smartphoneModels)
        .innerJoin(smartphoneBrands, eq(smartphoneBrands.id, smartphoneModels.brandId))
        .where(and(eq(smartphoneModels.status, "active"), eq(smartphoneBrands.status, "active")))
        .orderBy(asc(smartphoneBrands.sortOrder), asc(smartphoneBrands.name), asc(smartphoneModels.sortOrder), asc(smartphoneModels.name)),
    ]);
    const brands: { slug: string; name: string; models: { id: string; name: string }[] }[] = [];
    for (const m of models) {
      let b = brands.find((x) => x.slug === m.brandSlug);
      if (!b) brands.push((b = { slug: m.brandSlug, name: m.brand, models: [] }));
      b.models.push({ id: m.id, name: m.name });
    }
    return { services: svc, states: st, cities: ci, brands };
  });
}

// ---------- Package cards (homepage, search, service pages) ----------
export type Filters = { service?: string; state?: string; city?: string; phone?: string; price?: string; level?: string; q?: string };

/** Optional package extras: null = photographer did not say (not shown). */
export type PackageExtras = { travelStay: boolean | null; location: boolean | null; makeup: boolean | null; costume: boolean | null };
const toExtras = (r: { travelStayIncluded: boolean | null; locationIncluded: boolean | null; makeupIncluded: boolean | null; costumeIncluded: boolean | null }): PackageExtras => ({
  travelStay: r.travelStayIncluded, location: r.locationIncluded, makeup: r.makeupIncluded, costume: r.costumeIncluded,
});

/** An extra is visible only when the admin enabled it for the service. */
const gated = (enabled: AnyColumn, value: AnyColumn) => sql<boolean | null>`case when ${enabled} then ${value} end`;

export type PackageCardData = {
  id: string;
  level: Level;
  name: string;
  basePrice: number;
  offerPrice: number;
  shortDescription: string | null;
  extras: PackageExtras;
  image: string | null;
  serviceSlug: string;
  serviceName: string;
  photographer: PhotographerLite;
};
export type PhotographerLite = {
  slug: string; name: string; logo: string | null; city: string | null; state: string | null;
  phone: string | null; whatsapp: string | null; phoneModel: string | null;
};

const phoneMatch = (phone: string): SQL => {
  const exists = (cond: SQL) =>
    sql`exists (select 1 from ${photographerPhones} pp join ${smartphoneModels} m on m.id = pp.model_id join ${smartphoneBrands} b on b.id = m.brand_id
      where pp.photographer_id = ${photographers.id} and m.status = 'active' and b.status = 'active' and ${cond})`;
  if (phone.startsWith("b:")) return exists(sql`b.slug = ${phone.slice(2)}`);
  return UUID.test(phone) ? exists(sql`m.id = ${phone}`) : sql`false`;
};

function packageWhere(f: Filters): SQL {
  const range = PRICE_RANGES.find((r) => r.id === f.price);
  const q = f.q?.trim().slice(0, 80);
  const like = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
  const conds: (SQL | undefined)[] = [
    eq(packages.status, "published"),
    eq(photographers.status, "approved"),
    eq(services.status, "active"),
    eq(cities.isActive, true),
    eq(states.isActive, true),
    f.service ? eq(services.slug, f.service) : undefined,
    f.state ? eq(states.slug, f.state) : undefined,
    f.city ? eq(cities.slug, f.city) : undefined,
    f.level && (LEVELS as readonly string[]).includes(f.level) ? eq(packages.level, f.level as Level) : undefined,
    f.phone ? phoneMatch(f.phone) : undefined,
    range ? and(gte(packages.offerPrice, String(range.min)), lt(packages.offerPrice, String(range.max))) : undefined,
    like ? or(ilike(photographers.businessName, like), ilike(cities.name, like), ilike(states.name, like), ilike(services.name, like)) : undefined,
  ];
  return and(...conds)!;
}

const packageFrom = <T extends Tx>(tx: T) => ({
  base: tx
    .select({
      id: packages.id, level: packages.level, name: packages.name, base: packages.basePrice, offer: packages.offerPrice, short: packages.shortDescription,
      travelStayIncluded: gated(services.travelStayEnabled, packages.travelStayIncluded), locationIncluded: gated(services.locationEnabled, packages.locationIncluded),
      makeupIncluded: gated(services.makeupEnabled, packages.makeupIncluded), costumeIncluded: gated(services.costumeEnabled, packages.costumeIncluded),
      image: sql<string | null>`(select pi.image_url from ${packageImages} pi where pi.package_id = ${packages.id} order by pi.sort_order, pi.created_at limit 1)`,
      serviceSlug: services.slug, serviceName: services.name,
      pSlug: photographers.slug, pName: photographers.businessName, pLogo: sql<string | null>`coalesce(${photographers.logoUrl}, ${photographers.profilePhotoUrl})`,
      phone: photographers.phone, whatsapp: photographers.whatsapp, city: cities.name, state: states.name,
      phoneModel: sql<string | null>`(select m.name from ${photographerPhones} pp join ${smartphoneModels} m on m.id = pp.model_id where pp.photographer_id = ${photographers.id} and m.status = 'active' order by pp.created_at limit 1)`,
    })
    .from(packages)
    .innerJoin(photographers, eq(photographers.id, packages.photographerId))
    .innerJoin(services, eq(services.id, packages.serviceId))
    .innerJoin(cities, eq(cities.id, photographers.cityId))
    .innerJoin(states, eq(states.id, photographers.stateId)),
});

type PkgRow = Awaited<ReturnType<ReturnType<typeof packageFrom>["base"]["limit"]>>[number];
const toCard = (r: PkgRow): PackageCardData => ({
  id: r.id, level: r.level, name: r.name, basePrice: num(r.base), offerPrice: num(r.offer), shortDescription: r.short, extras: toExtras(r), image: r.image,
  serviceSlug: r.serviceSlug, serviceName: r.serviceName,
  photographer: { slug: r.pSlug, name: r.pName, logo: r.pLogo, city: r.city, state: r.state, phone: r.phone, whatsapp: r.whatsapp, phoneModel: r.phoneModel },
});

const searchQuery = (f: Filters, limit: number, page: number) => async (tx: Tx) => {
  const where = packageWhere(f);
  const rows = await packageFrom(tx).base.where(where).orderBy(asc(packages.offerPrice), desc(packages.createdAt), asc(packages.id)).limit(limit).offset((page - 1) * limit);
  const [{ total }] = await tx
    .select({ total: count() })
    .from(packages)
    .innerJoin(photographers, eq(photographers.id, packages.photographerId))
    .innerJoin(services, eq(services.id, packages.serviceId))
    .innerJoin(cities, eq(cities.id, photographers.cityId))
    .innerJoin(states, eq(states.id, photographers.stateId))
    .where(where);
  return { items: rows.map(toCard), total };
};

async function searchCached(f: Filters, limit: number, page: number) {
  "use cache";
  pub();
  return withAnon(searchQuery(f, limit, page));
}

export async function searchPackages(f: Filters, opts: { page?: number; limit?: number } = {}) {
  const limit = opts.limit ?? PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);
  // Free text is unbounded input: it runs uncached so random queries cannot fill the cache.
  return f.q?.trim() ? dynamic(searchQuery(f, limit, page)) : searchCached(f, limit, page);
}

/** Homepage mix for one service: 1 Basic, 2 Standard, 1 Premium, each from a different photographer (cheapest first within a level). Short of a level, other levels fill up to 4. */
const SHOWCASE_SLOTS: Level[] = ["basic", "standard", "standard", "premium"];
export async function getServiceShowcase(f: Filters & { service: string }) {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const rows = await packageFrom(tx).base
      .where(packageWhere({ ...f, level: undefined }))
      .orderBy(asc(packages.offerPrice), desc(packages.createdAt), asc(packages.id))
      .limit(80);
    const pool = rows.map(toCard);
    const used = new Set<string>();
    const picked: PackageCardData[] = [];
    const take = (match: (k: PackageCardData) => boolean) => {
      const k = pool.find((x) => !picked.includes(x) && !used.has(x.photographer.slug) && match(x));
      if (k) { picked.push(k); used.add(k.photographer.slug); }
    };
    for (const level of SHOWCASE_SLOTS) take((k) => k.level === level);
    while (picked.length < SHOWCASE_SLOTS.length && pool.some((x) => !picked.includes(x) && !used.has(x.photographer.slug))) take(() => true);
    return picked.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
  });
}

// ---------- Photographer cards (listings, homepage) ----------
export type PhotographerCardData = PhotographerLite & { cover: string | null; services: string[] };

const photographerWhere = (f: { state?: string; city?: string; service?: string }) =>
  and(
    eq(photographers.status, "approved"),
    f.state ? eq(states.slug, f.state) : undefined,
    f.city ? eq(cities.slug, f.city) : undefined,
    f.service
      ? sql`exists (select 1 from ${packages} pk join ${services} s on s.id = pk.service_id where pk.photographer_id = ${photographers.id} and pk.status = 'published' and s.status = 'active' and s.slug = ${f.service})`
      : undefined,
  )!;

const photographerCols = {
  id: photographers.id, slug: photographers.slug, name: photographers.businessName,
  logo: sql<string | null>`coalesce(${photographers.logoUrl}, ${photographers.profilePhotoUrl})`,
  cover: photographers.bannerUrl, phone: photographers.phone, whatsapp: photographers.whatsapp, city: cities.name, state: states.name,
  phoneModel: sql<string | null>`(select m.name from ${photographerPhones} pp join ${smartphoneModels} m on m.id = pp.model_id where pp.photographer_id = ${photographers.id} and m.status = 'active' order by pp.created_at limit 1)`,
};

/** Attaches each photographer's active service names with one batched query (no N+1). */
async function withServices(tx: Tx, rows: (Omit<PhotographerCardData, "services"> & { id: string })[]): Promise<PhotographerCardData[]> {
  if (!rows.length) return [];
  const svc = await tx
    .select({ photographerId: photographerServices.photographerId, name: services.name })
    .from(photographerServices)
    .innerJoin(services, eq(services.id, photographerServices.serviceId))
    .where(and(inArray(photographerServices.photographerId, rows.map((r) => r.id)), eq(services.status, "active")))
    .orderBy(asc(services.sortOrder), asc(services.name));
  return rows.map(({ id, ...r }) => ({ ...r, services: svc.filter((s) => s.photographerId === id).map((s) => s.name) }));
}

export async function listPhotographers(f: { state?: string; city?: string; service?: string }, page = 1) {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const where = photographerWhere(f);
    const from = () => tx.select(photographerCols).from(photographers).leftJoin(cities, eq(cities.id, photographers.cityId)).leftJoin(states, eq(states.id, photographers.stateId));
    // Location-filtered pages need an active location; the unfiltered list keeps photographers without one out too.
    const active = and(where, eq(cities.isActive, true), eq(states.isActive, true));
    const rows = await from().where(active).orderBy(desc(photographers.createdAt), asc(photographers.id)).limit(PAGE_SIZE).offset((Math.max(1, page) - 1) * PAGE_SIZE);
    const [{ total }] = await tx.select({ total: count() }).from(photographers).leftJoin(cities, eq(cities.id, photographers.cityId)).leftJoin(states, eq(states.id, photographers.stateId)).where(active);
    return { items: await withServices(tx, rows), total };
  });
}

// ---------- Homepage ----------
export async function getBanner() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const [b] = await tx.select().from(homepageBanners).where(eq(homepageBanners.isActive, true)).orderBy(asc(homepageBanners.sortOrder), desc(homepageBanners.createdAt)).limit(1);
    return b ?? null;
  });
}

/** Homepage location strip: states and cities the admin gave a logo, linking to their pages (admin-curated, so no photographer-count rule). */
export async function getLocationStrip() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const st = await tx.select({ name: states.name, slug: states.slug, imageUrl: states.imageUrl }).from(states)
      .where(and(eq(states.isActive, true), isNotNull(states.imageUrl))).orderBy(asc(states.sortOrder), asc(states.name));
    const ci = await tx.select({ name: cities.name, slug: cities.slug, stateSlug: states.slug, imageUrl: cities.imageUrl }).from(cities)
      .innerJoin(states, eq(states.id, cities.stateId))
      .where(and(eq(cities.isActive, true), eq(states.isActive, true), isNotNull(cities.imageUrl))).orderBy(asc(cities.sortOrder), asc(cities.name));
    return [
      ...st.map((s) => ({ key: `s:${s.slug}`, name: s.name, href: `/photographers/${s.slug}`, imageUrl: s.imageUrl! })),
      ...ci.map((c) => ({ key: `c:${c.stateSlug}/${c.slug}`, name: c.name, href: `/photographers/${c.stateSlug}/${c.slug}`, imageUrl: c.imageUrl! })),
    ];
  });
}

/** Keys of homepage sections the admin switched off. */
export async function getHiddenSections() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const rows = await tx.select({ key: homepageSections.key }).from(homepageSections).where(eq(homepageSections.isActive, false));
    return new Set(rows.map((r) => r.key));
  });
}

export async function getFeaturedPhotographers() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const rows = await tx
      .select(photographerCols)
      .from(homepageFeaturedItems)
      .innerJoin(photographers, eq(photographers.id, homepageFeaturedItems.photographerId))
      .innerJoin(cities, eq(cities.id, photographers.cityId))
      .innerJoin(states, eq(states.id, photographers.stateId))
      .where(and(eq(homepageFeaturedItems.isActive, true), eq(photographers.status, "approved"), eq(cities.isActive, true), eq(states.isActive, true)))
      .orderBy(asc(homepageFeaturedItems.sortOrder), asc(homepageFeaturedItems.createdAt))
      .limit(8);
    return withServices(tx, rows);
  });
}

export async function getStatesWithCounts() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const rows = await tx
      .select({
        slug: states.slug, name: states.name,
        // Same rules as the state page: only active cities that have approved photographers, and photographers in those cities.
        // "states"."id" is written out: drizzle renders ${states.id} unqualified inside a select, which is ambiguous in these subqueries.
        cities: sql<number>`(select count(*)::int from ${cities} c where c.state_id = "states"."id" and c.is_active and exists (select 1 from ${photographers} p where p.city_id = c.id and p.status = 'approved'))`,
        photographers: sql<number>`(select count(*)::int from ${photographers} p join ${cities} c on c.id = p.city_id where c.state_id = "states"."id" and c.is_active and p.status = 'approved')`,
      })
      .from(states)
      .where(and(eq(states.isActive, true), stateHasPhotographers))
      .orderBy(asc(states.sortOrder), asc(states.name));
    return rows;
  });
}

export async function getLocations() {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const rows = await tx
      .select({
        state: states.name, stateSlug: states.slug, city: cities.name, citySlug: cities.slug,
        photographers: sql<number>`(select count(*)::int from ${photographers} p where p.city_id = ${cities.id} and p.status = 'approved')`,
      })
      .from(cities)
      .innerJoin(states, eq(states.id, cities.stateId))
      .where(and(eq(cities.isActive, true), eq(states.isActive, true), cityHasPhotographers))
      .orderBy(asc(states.sortOrder), asc(states.name), asc(cities.sortOrder), asc(cities.name));
    const out: { slug: string; name: string; cities: { slug: string; name: string; photographers: number }[] }[] = [];
    for (const r of rows) {
      let s = out.find((x) => x.slug === r.stateSlug);
      if (!s) out.push((s = { slug: r.stateSlug, name: r.state, cities: [] }));
      s.cities.push({ slug: r.citySlug, name: r.city, photographers: r.photographers });
    }
    return out;
  });
}

// ---------- Location / service slug resolution (invalid slug => null => 404) ----------
export async function resolveListing(state: string, second?: string, third?: string) {
  "use cache";
  pub();
  return withAnon((tx) => findListing(tx, state, second, third));
}
export async function resolveLocation(stateSlug: string, citySlug?: string) {
  "use cache";
  pub();
  return withAnon((tx) => findLocation(tx, stateSlug, citySlug));
}
export async function resolveService(slug: string) {
  "use cache";
  pub();
  return withAnon((tx) => findService(tx, slug));
}

/** Approved photographers (active location) matching the filters. Used for indexability decisions. */
export async function countPhotographers(state?: string, city?: string, service?: string) {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const [{ total }] = await tx
      .select({ total: count() })
      .from(photographers)
      .innerJoin(cities, eq(cities.id, photographers.cityId))
      .innerJoin(states, eq(states.id, photographers.stateId))
      .where(and(photographerWhere({ state, city, service }), eq(cities.isActive, true), eq(states.isActive, true)));
    return total;
  });
}

// ---------- Photographer profile + service page ----------
export type PackageDetail = {
  id: string; level: Level; name: string; basePrice: number; offerPrice: number;
  shortDescription: string | null; inclusions: string[]; detailedDescription: string | null;
  extras: PackageExtras;
  images: { url: string; alt: string | null }[];
  videoId: string | null;
};
export type PortfolioImage = { url: string; alt: string | null; segment: string };

export async function getProfile(slug: string) {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const [p] = await tx
      .select({
        id: photographers.id, slug: photographers.slug, name: photographers.businessName, about: photographers.about,
        profilePhoto: photographers.profilePhotoUrl, logo: photographers.logoUrl, banner: photographers.bannerUrl,
        phone: photographers.phone, whatsapp: photographers.whatsapp, instagram: photographers.instagramUrl,
        youtube: photographers.youtubeUrl, website: photographers.websiteUrl, city: cities.name, state: states.name, stateSlug: states.slug, citySlug: cities.slug,
      })
      .from(photographers)
      .leftJoin(cities, and(eq(cities.id, photographers.cityId), eq(cities.isActive, true)))
      .leftJoin(states, and(eq(states.id, photographers.stateId), eq(states.isActive, true)))
      .where(and(eq(photographers.slug, slug), eq(photographers.status, "approved")))
      .limit(1);
    if (!p) return null;

    const [models, svcRows] = await Promise.all([
      tx
        .select({ model: smartphoneModels.name, brand: smartphoneBrands.name })
        .from(photographerPhones)
        .innerJoin(smartphoneModels, eq(smartphoneModels.id, photographerPhones.modelId))
        .innerJoin(smartphoneBrands, eq(smartphoneBrands.id, smartphoneModels.brandId))
        .where(and(eq(photographerPhones.photographerId, p.id), eq(smartphoneModels.status, "active"), eq(smartphoneBrands.status, "active")))
        .orderBy(asc(smartphoneBrands.name), asc(smartphoneModels.name)),
      // Only services that have at least one published package are public.
      tx
        .select({
          slug: services.slug, name: services.name,
          from: sql<string>`(select min(pk.offer_price) from ${packages} pk where pk.photographer_id = ${p.id} and pk.service_id = ${services.id} and pk.status = 'published')`,
        })
        .from(services)
        .where(and(
          eq(services.status, "active"),
          sql`exists (select 1 from ${packages} pk where pk.photographer_id = ${p.id} and pk.service_id = ${services.id} and pk.status = 'published')`,
        ))
        .orderBy(asc(services.sortOrder), asc(services.name)),
    ]);
    return { ...p, models, services: svcRows.map((s) => ({ ...s, from: num(s.from) })) };
  });
}

export const PORTFOLIO_VIDEOS = 3;
export const PORTFOLIO_PHOTOS = 8;

/** Approved portfolio images of one segment (the one whose slug equals the selected service slug). Only that service is loaded. */
async function portfolioFor(tx: Tx, photographerId: string, segmentSlug: string): Promise<PortfolioImage[]> {
  const rows = await tx
    .select({ url: portfolioImages.imageUrl, alt: portfolioImages.altText, segment: portfolioSegments.name, segmentSlug: portfolioSegments.slug })
    .from(portfolioImages)
    .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
    .where(and(eq(portfolioSegments.photographerId, photographerId), eq(portfolioSegments.slug, segmentSlug), eq(portfolioImages.status, "approved")))
    .limit(PORTFOLIO_PHOTOS)
    .orderBy(asc(portfolioSegments.sortOrder), asc(portfolioSegments.createdAt), asc(portfolioImages.sortOrder), asc(portfolioImages.createdAt));
  return rows;
}

export type PublicReview = { id: string; rating: number; title: string | null; text: string | null; name: string | null; date: Date; level: Level | null };
/** Published packages a customer can review for this photographer, grouped by service. */
export type ReviewTarget = { serviceId: string; serviceName: string; packages: { id: string; level: Level }[] };

/** Approved reviews for one photographer + service. The count and average come from approved rows only. */
async function approvedReviews(tx: Tx, photographerId: string, serviceId: string) {
  const approved = and(eq(serviceReviews.photographerId, photographerId), eq(serviceReviews.serviceId, serviceId), eq(serviceReviews.status, "approved"));
  const [agg] = await tx.select({ count: count(), avg: sql<string | null>`avg(${serviceReviews.rating})` }).from(serviceReviews).where(approved);
  const items: PublicReview[] = await tx
    .select({ id: serviceReviews.id, rating: serviceReviews.rating, title: serviceReviews.title, text: serviceReviews.reviewText, name: serviceReviews.reviewerName, date: serviceReviews.submittedAt, level: packages.level })
    .from(serviceReviews)
    .leftJoin(packages, eq(packages.id, serviceReviews.packageId))
    .where(approved)
    .orderBy(desc(serviceReviews.submittedAt))
    .limit(50);
  return { count: agg.count, average: agg.avg === null ? null : Number(agg.avg), items };
}

export async function getProfileService(slug: string, serviceSlug: string) {
  "use cache";
  pub();
  return withAnon(async (tx) => {
    const [p] = await tx
      .select({ id: photographers.id })
      .from(photographers)
      .where(and(eq(photographers.slug, slug), eq(photographers.status, "approved")))
      .limit(1);
    if (!p) return null;
    const [service] = await tx.select({ id: services.id, slug: services.slug, name: services.name, description: services.description, travel: services.travelStayEnabled, location: services.locationEnabled, makeup: services.makeupEnabled, costume: services.costumeEnabled }).from(services).where(and(eq(services.slug, serviceSlug), eq(services.status, "active"))).limit(1);
    if (!service) return null;
    const pk = await tx
      .select()
      .from(packages)
      .where(and(eq(packages.photographerId, p.id), eq(packages.serviceId, service.id), eq(packages.status, "published")));
    if (!pk.length) return null; // service not offered (or nothing published) => 404
    const imgs = await tx.select().from(packageImages).where(inArray(packageImages.packageId, pk.map((k) => k.id))).orderBy(asc(packageImages.sortOrder), asc(packageImages.createdAt));
    const details: PackageDetail[] = LEVELS.flatMap((level) => {
      const k = pk.find((x) => x.level === level);
      return k
        ? [{
            id: k.id, level, name: k.name, basePrice: num(k.basePrice), offerPrice: num(k.offerPrice), shortDescription: k.shortDescription,
            inclusions: (k.inclusions ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
            detailedDescription: k.detailedDescription,
            extras: toExtras({
              travelStayIncluded: service.travel ? k.travelStayIncluded : null, locationIncluded: service.location ? k.locationIncluded : null,
              makeupIncluded: service.makeup ? k.makeupIncluded : null, costumeIncluded: service.costume ? k.costumeIncluded : null,
            }),
            videoId: youtubeId(k.youtubeUrl),
            images: imgs.filter((i) => i.packageId === k.id).map((i) => ({ url: i.imageUrl, alt: i.altText })),
          }]
        : [];
    });
    // Service portfolio = the photographer's approved images in the segment whose slug equals the service slug.
    const portfolio = await portfolioFor(tx, p.id, service.slug);
    // Videos = the YouTube links of this service's published packages (Basic, Standard, Premium: at most 3).
    const videos = details.flatMap((d) => (d.videoId ? [d.videoId] : [])).slice(0, PORTFOLIO_VIDEOS);
    // Every published package of this photographer, so a reviewer can pick the service and the package.
    const published = await tx
      .select({ id: packages.id, level: packages.level, serviceId: services.id, serviceName: services.name })
      .from(packages)
      .innerJoin(services, eq(services.id, packages.serviceId))
      .where(and(eq(packages.photographerId, p.id), eq(packages.status, "published"), eq(services.status, "active")))
      .orderBy(asc(services.sortOrder), asc(services.name));
    const reviewTargets: ReviewTarget[] = [];
    for (const r of published) {
      const t = reviewTargets.find((x) => x.serviceId === r.serviceId) ?? reviewTargets[reviewTargets.push({ serviceId: r.serviceId, serviceName: r.serviceName, packages: [] }) - 1];
      t.packages.push({ id: r.id, level: r.level });
    }
    for (const t of reviewTargets) t.packages.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
    return { service, packages: details, portfolio, videos, reviews: await approvedReviews(tx, p.id, service.id), reviewTargets };
  });
}
