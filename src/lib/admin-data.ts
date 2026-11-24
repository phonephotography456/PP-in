import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import {
  cities, homepageBanners, homepageFeaturedItems, homepageSections, packageImages, packages, photographerPhones,
  photographers, photographerServices, portfolioImages, portfolioSegments, serviceReviews,
  services, smartphoneBrands, smartphoneModels, states,
} from "@/db/schema";
import { asAdmin } from "@/lib/admin";

type PhotographerStatus = (typeof photographers.status.enumValues)[number];
type PackageStatus = (typeof packages.status.enumValues)[number];
type ReviewStatus = (typeof serviceReviews.status.enumValues)[number];
type ImageStatus = (typeof portfolioImages.status.enumValues)[number];

/** Narrow an untrusted query-string value to one of an enum's values. */
export const oneOf = <T extends string>(values: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T) : undefined;
export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const PHOTOGRAPHER_STATUSES = photographers.status.enumValues;
export const PACKAGE_STATUSES = packages.status.enumValues;
export const REVIEW_STATUSES = serviceReviews.status.enumValues;
export const IMAGE_STATUSES = portfolioImages.status.enumValues;
export const LEVELS = packages.level.enumValues;

// ---------- Dashboard ----------
export const getDashboard = () =>
  asAdmin(async (tx) => {
    const byStatus = await tx.select({ status: photographers.status, n: count() }).from(photographers).groupBy(photographers.status);
    const [pkg] = await tx.select({ n: count() }).from(packages);
    const [pendingPackages] = await tx.select({ n: count() }).from(packages).where(eq(packages.status, "pending_review"));
    const [pendingReviews] = await tx.select({ n: count() }).from(serviceReviews).where(eq(serviceReviews.status, "pending"));
    const [pendingImages] = await tx.select({ n: count() }).from(portfolioImages).where(eq(portfolioImages.status, "pending_review"));
    const recent = await tx
      .select({
        id: photographers.id, name: photographers.businessName, status: photographers.status,
        createdAt: photographers.createdAt, city: cities.name, state: states.name,
      })
      .from(photographers)
      .leftJoin(cities, eq(cities.id, photographers.cityId))
      .leftJoin(states, eq(states.id, photographers.stateId))
      .orderBy(desc(photographers.createdAt))
      .limit(8);
    const n = (s: PhotographerStatus) => byStatus.find((r) => r.status === s)?.n ?? 0;
    return {
      total: byStatus.reduce((a, r) => a + r.n, 0),
      approved: n("approved"), pending: n("pending"), rejected: n("rejected"), inactive: n("inactive"),
      packages: pkg.n, pendingPackages: pendingPackages.n, pendingReviews: pendingReviews.n, pendingImages: pendingImages.n,
      recent,
    };
  });

// ---------- Photographers ----------
export const getPhotographers = (f: { q?: string; status?: string }) =>
  asAdmin(async (tx) => {
    const conds: SQL[] = [];
    const status = oneOf(PHOTOGRAPHER_STATUSES, f.status);
    if (status) conds.push(eq(photographers.status, status));
    const q = f.q?.trim().slice(0, 100).replace(/[%_\\]/g, "\\$&");
    if (q) conds.push(or(ilike(photographers.businessName, `%${q}%`), ilike(photographers.email, `%${q}%`), ilike(photographers.phone, `%${q}%`))!);
    const rows = await tx
      .select({
        id: photographers.id, name: photographers.businessName, status: photographers.status, phone: photographers.phone,
        email: photographers.email, createdAt: photographers.createdAt, city: cities.name, state: states.name,
      })
      .from(photographers)
      .leftJoin(cities, eq(cities.id, photographers.cityId))
      .leftJoin(states, eq(states.id, photographers.stateId))
      .where(and(...conds))
      .orderBy(desc(photographers.createdAt))
      .limit(100);
    const ids = rows.map((r) => r.id);
    const phones = ids.length
      ? await tx
          .select({ photographerId: photographerPhones.photographerId, model: smartphoneModels.name, brand: smartphoneBrands.name })
          .from(photographerPhones)
          .innerJoin(smartphoneModels, eq(smartphoneModels.id, photographerPhones.modelId))
          .innerJoin(smartphoneBrands, eq(smartphoneBrands.id, smartphoneModels.brandId))
          .where(inArray(photographerPhones.photographerId, ids))
      : [];
    return rows.map((r) => ({ ...r, phones: phones.filter((p) => p.photographerId === r.id).map((p) => `${p.brand} ${p.model}`) }));
  });

export const getPhotographerDetail = (id: string) =>
  asAdmin(async (tx) => {
    const [p] = await tx.select().from(photographers).where(eq(photographers.id, id)).limit(1);
    if (!p) return null;
    const [svc, phones, pkgs, images] = await Promise.all([
      tx.select({ name: services.name }).from(photographerServices).innerJoin(services, eq(services.id, photographerServices.serviceId)).where(eq(photographerServices.photographerId, id)),
      tx.select({ model: smartphoneModels.name, brand: smartphoneBrands.name }).from(photographerPhones)
        .innerJoin(smartphoneModels, eq(smartphoneModels.id, photographerPhones.modelId))
        .innerJoin(smartphoneBrands, eq(smartphoneBrands.id, smartphoneModels.brandId))
        .where(eq(photographerPhones.photographerId, id)),
      tx.select({ name: packages.name, level: packages.level, status: packages.status, basePrice: packages.basePrice, offerPrice: packages.offerPrice, service: services.name }).from(packages)
        .innerJoin(services, eq(services.id, packages.serviceId)).where(eq(packages.photographerId, id)).orderBy(asc(services.name), asc(packages.level)),
      tx.select({ status: portfolioImages.status, n: count() }).from(portfolioImages)
        .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
        .where(eq(portfolioSegments.photographerId, id)).groupBy(portfolioImages.status),
    ]);
    return { p, services: svc.map((s) => s.name), phones: phones.map((x) => `${x.brand} ${x.model}`), packages: pkgs, images };
  });

export const getReviews = (f: { photographerId?: string; serviceId?: string; status?: string }) =>
  asAdmin(async (tx) => {
    const conds: SQL[] = [];
    if (isUuid(f.photographerId)) conds.push(eq(serviceReviews.photographerId, f.photographerId));
    if (isUuid(f.serviceId)) conds.push(eq(serviceReviews.serviceId, f.serviceId));
    const status = oneOf(REVIEW_STATUSES, f.status);
    if (status) conds.push(eq(serviceReviews.status, status));
    const rows = await tx
      .select({
        id: serviceReviews.id, rating: serviceReviews.rating, title: serviceReviews.title, text: serviceReviews.reviewText,
        status: serviceReviews.status, submittedAt: serviceReviews.submittedAt, reviewerUserId: serviceReviews.reviewerUserId,
        reviewerName: serviceReviews.reviewerName, reviewedAt: serviceReviews.reviewedAt,
        photographer: photographers.businessName, service: services.name, level: packages.level,
      })
      .from(serviceReviews)
      .innerJoin(photographers, eq(photographers.id, serviceReviews.photographerId))
      .innerJoin(services, eq(services.id, serviceReviews.serviceId))
      .leftJoin(packages, eq(packages.id, serviceReviews.packageId))
      .where(and(...conds))
      .orderBy(desc(serviceReviews.submittedAt))
      .limit(100);
    // auth.users is not readable by `authenticated`; this admin-only SQL function returns the emails.
    const ids = [...new Set(rows.map((r) => r.reviewerUserId))];
    const emails = ids.length
      ? await tx.execute<{ id: string; email: string }>(sql`select id, email from public.admin_reviewer_emails(array[${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)}])`)
      : [];
    const emailOf = new Map(Array.from(emails, (e) => [e.id, e.email]));
    return rows.map((r) => ({ ...r, reviewerEmail: emailOf.get(r.reviewerUserId) ?? null }));
  });

export const getPhotographerOptions = () =>
  asAdmin((tx) => tx.select({ id: photographers.id, name: photographers.businessName }).from(photographers).orderBy(asc(photographers.businessName)));

export const getServiceOptions = () =>
  asAdmin((tx) => tx.select({ id: services.id, name: services.name }).from(services).orderBy(asc(services.sortOrder), asc(services.name)));

// ---------- Master data ----------
export const getMasterData = () =>
  asAdmin(async (tx) => {
    const svc = await tx
      .select({ ...serviceCols(), uses: sql<number>`(select count(*)::int from ${packages} where ${packages.serviceId} = ${services.id}) + (select count(*)::int from ${photographerServices} where ${photographerServices.serviceId} = ${services.id})` })
      .from(services).orderBy(asc(services.sortOrder), asc(services.name));
    const brands = await tx
      .select({ id: smartphoneBrands.id, name: smartphoneBrands.name, status: smartphoneBrands.status, sortOrder: smartphoneBrands.sortOrder,
        models: sql<number>`(select count(*)::int from ${smartphoneModels} where ${smartphoneModels.brandId} = ${smartphoneBrands.id})` })
      .from(smartphoneBrands).orderBy(asc(smartphoneBrands.sortOrder), asc(smartphoneBrands.name));
    const models = await tx
      .select({ id: smartphoneModels.id, name: smartphoneModels.name, status: smartphoneModels.status, sortOrder: smartphoneModels.sortOrder,
        brandId: smartphoneModels.brandId, brand: smartphoneBrands.name,
        uses: sql<number>`(select count(*)::int from ${photographerPhones} where ${photographerPhones.modelId} = ${smartphoneModels.id})` })
      .from(smartphoneModels).innerJoin(smartphoneBrands, eq(smartphoneBrands.id, smartphoneModels.brandId))
      .orderBy(asc(smartphoneBrands.name), asc(smartphoneModels.sortOrder), asc(smartphoneModels.name));
    return { services: svc, brands, models };
  });
const serviceCols = () => ({ id: services.id, name: services.name, description: services.description, status: services.status, sortOrder: services.sortOrder,
  travelStayEnabled: services.travelStayEnabled, locationEnabled: services.locationEnabled, makeupEnabled: services.makeupEnabled, costumeEnabled: services.costumeEnabled, showOnHome: services.showOnHome });

// ---------- Locations ----------
export const getLocations = () =>
  asAdmin(async (tx) => {
    const st = await tx.select().from(states).orderBy(asc(states.sortOrder), asc(states.name));
    const ct = await tx.select({
      id: cities.id, stateId: cities.stateId, name: cities.name, isActive: cities.isActive, sortOrder: cities.sortOrder,
      uses: sql<number>`(select count(*)::int from ${photographers} where ${photographers.cityId} = ${cities.id})`,
    }).from(cities).orderBy(asc(cities.sortOrder), asc(cities.name));
    const stateUses = await tx.select({ id: photographers.stateId, n: count() }).from(photographers).groupBy(photographers.stateId);
    return st.map((s) => ({
      ...s,
      uses: stateUses.find((u) => u.id === s.id)?.n ?? 0,
      cities: ct.filter((c) => c.stateId === s.id),
    }));
  });

// ---------- Packages ----------
export const PRICE_BUCKETS = { under5k: "Under ₹5,000", mid: "₹5,000 – ₹15,000", over15k: "₹15,000+" } as const;

export const getPackages = (f: { photographerId?: string; serviceId?: string; level?: string; price?: string; status?: string }) =>
  asAdmin(async (tx) => {
    const conds: SQL[] = [];
    if (isUuid(f.photographerId)) conds.push(eq(packages.photographerId, f.photographerId));
    if (isUuid(f.serviceId)) conds.push(eq(packages.serviceId, f.serviceId));
    const level = oneOf(LEVELS, f.level);
    if (level) conds.push(eq(packages.level, level));
    const status = oneOf(PACKAGE_STATUSES, f.status);
    if (status) conds.push(eq(packages.status, status));
    if (f.price === "under5k") conds.push(lt(packages.offerPrice, "5000"));
    if (f.price === "mid") conds.push(and(gte(packages.offerPrice, "5000"), lt(packages.offerPrice, "15000"))!);
    if (f.price === "over15k") conds.push(gte(packages.offerPrice, "15000"));
    return tx
      .select({
        id: packages.id, name: packages.name, level: packages.level, basePrice: packages.basePrice, offerPrice: packages.offerPrice, status: packages.status,
        photographer: photographers.businessName, service: services.name,
        images: sql<number>`(select count(*)::int from ${packageImages} where ${packageImages.packageId} = ${packages.id})`,
      })
      .from(packages)
      .innerJoin(photographers, eq(photographers.id, packages.photographerId))
      .innerJoin(services, eq(services.id, packages.serviceId))
      .where(and(...conds))
      // pending first so moderation work is on top
      .orderBy(sql`(${packages.status} = 'pending_review') desc`, desc(packages.updatedAt))
      .limit(200);
  });

// ---------- Portfolio ----------
export const getPortfolioImages = (f: { status?: string }) =>
  asAdmin(async (tx) => {
    const status = oneOf(IMAGE_STATUSES, f.status);
    return tx
      .select({
        id: portfolioImages.id, url: portfolioImages.imageUrl, alt: portfolioImages.altText, status: portfolioImages.status,
        segment: portfolioSegments.name, photographer: photographers.businessName,
      })
      .from(portfolioImages)
      .innerJoin(portfolioSegments, eq(portfolioSegments.id, portfolioImages.segmentId))
      .innerJoin(photographers, eq(photographers.id, portfolioSegments.photographerId))
      .where(status ? eq(portfolioImages.status, status) : undefined)
      .orderBy(desc(portfolioImages.updatedAt))
      .limit(120);
  });

// ---------- Homepage ----------
export const getHomepage = () =>
  asAdmin(async (tx) => {
    const banners = await tx.select().from(homepageBanners).orderBy(asc(homepageBanners.sortOrder), desc(homepageBanners.createdAt));
    const featured = await tx
      .select({
        id: homepageFeaturedItems.id, photographerId: homepageFeaturedItems.photographerId, title: homepageFeaturedItems.title,
        sortOrder: homepageFeaturedItems.sortOrder, isActive: homepageFeaturedItems.isActive, name: photographers.businessName,
      })
      .from(homepageFeaturedItems)
      .leftJoin(photographers, eq(photographers.id, homepageFeaturedItems.photographerId))
      .orderBy(asc(homepageFeaturedItems.sortOrder), asc(homepageFeaturedItems.createdAt));
    const options = await tx.select({ id: photographers.id, name: photographers.businessName }).from(photographers)
      .where(eq(photographers.status, "approved")).orderBy(asc(photographers.businessName));
    const sections = await tx.select().from(homepageSections);
    const serviceList = await tx.select({ id: services.id, name: services.name, status: services.status, showOnHome: services.showOnHome })
      .from(services).orderBy(asc(services.sortOrder), asc(services.name));
    const stateRows = await tx.select({ id: states.id, name: states.name, imageUrl: states.imageUrl }).from(states)
      .where(eq(states.isActive, true)).orderBy(asc(states.sortOrder), asc(states.name));
    const cityRows = await tx.select({ id: cities.id, stateId: cities.stateId, name: cities.name, imageUrl: cities.imageUrl })
      .from(cities).innerJoin(states, eq(states.id, cities.stateId)).where(and(eq(cities.isActive, true), eq(states.isActive, true)))
      .orderBy(asc(cities.sortOrder), asc(cities.name));
    const locations = { states: stateRows, cities: cityRows };
    return { banners, featured, options, sections, serviceList, locations };
  });

export type { PhotographerStatus, PackageStatus, ReviewStatus, ImageStatus };
