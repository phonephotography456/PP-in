import { and, asc, eq, sql } from "drizzle-orm";
import { cities, services, states } from "@/db/schema";
import type { withAnon } from "@/db/with-anon";

/**
 * Slug resolution shared by the public pages and the Proxy (which needs it before a response starts, so that
 * unknown slugs get a real 404 status). No Next request APIs here: it only needs a transaction from withAnon.
 */
export type Tx = Parameters<Parameters<typeof withAnon>[0]>[0];

export async function findLocation(tx: Tx, stateSlug: string, citySlug?: string) {
  const [state] = await tx.select({ id: states.id, slug: states.slug, name: states.name }).from(states).where(and(eq(states.slug, stateSlug), eq(states.isActive, true))).limit(1);
  if (!state) return null;
  const stateCities = await tx.select({ slug: cities.slug, name: cities.name }).from(cities).where(and(eq(cities.stateId, state.id), eq(cities.isActive, true))).orderBy(asc(cities.sortOrder), asc(cities.name));
  if (!citySlug) return { state, city: null, cities: stateCities };
  const city = stateCities.find((c) => c.slug === citySlug);
  return city ? { state, city, cities: stateCities } : null;
}

export async function findService(tx: Tx, slug: string) {
  const [s] = await tx.select({ slug: services.slug, name: services.name, description: services.description }).from(services).where(and(eq(services.slug, slug), eq(services.status, "active"))).limit(1);
  return s ?? null;
}

/**
 * /photographers/[state]/[x]/[y?] => { loc, citySlug, service } or null (404).
 * With two segments the second is a city of the state when one matches, otherwise a service.
 */
export async function findListing(tx: Tx, state: string, second?: string, third?: string) {
  let loc = await findLocation(tx, state, second && third ? second : undefined);
  if (!loc) return null;
  let citySlug = second && third ? second : undefined;
  let serviceSlug = third;
  if (second && !third) {
    const asCity = await findLocation(tx, state, second);
    if (asCity) {
      loc = asCity;
      citySlug = second;
    } else serviceSlug = second;
  }
  const service = serviceSlug ? await findService(tx, serviceSlug) : null;
  if (serviceSlug && !service) return null;
  return { loc, citySlug, service };
}

/** Photographer profile exists publicly (approved). */
export async function profileRouteExists(tx: Tx, slug: string) {
  const rows = await tx.execute(sql`select 1 from photographers p where p.slug = ${slug} and p.status = 'approved' limit 1`);
  return rows.length > 0;
}
