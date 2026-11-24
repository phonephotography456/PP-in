import "server-only";
import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { withAnon } from "@/db/with-anon";

/**
 * Everything the sitemap lists, read-only as `anon` (RLS) with the same predicates the public listing pages use,
 * so a URL is listed exactly when its page would be indexable (>= 1 real approved photographer / published package).
 */
export async function getSitemapData() {
  await connection();
  return withAnon(async (tx) => {
    // Approved photographers in an active city + state.
    const places = await tx.execute<{ state: string; city: string }>(sql`
      select distinct st.slug as state, c.slug as city
      from photographers p join cities c on c.id = p.city_id join states st on st.id = p.state_id
      where p.status = 'approved' and c.is_active and st.is_active`);
    // The same, per active service with a published package.
    const placeServices = await tx.execute<{ state: string; city: string; service: string }>(sql`
      select distinct st.slug as state, c.slug as city, s.slug as service
      from packages pk join photographers p on p.id = pk.photographer_id join services s on s.id = pk.service_id
        join cities c on c.id = p.city_id join states st on st.id = p.state_id
      where pk.status = 'published' and p.status = 'approved' and s.status = 'active' and c.is_active and st.is_active`);
    // Approved photographers' pages for each active service they have published packages for. A profile is only
    // indexable (and listed) when it has at least one of those, so profile URLs come from the same rows.
    const profileServices = await tx.execute<{ slug: string; service: string; updated: Date }>(sql`
      select distinct p.slug, s.slug as service, p.updated_at as updated
      from packages pk join photographers p on p.id = pk.photographer_id join services s on s.id = pk.service_id
      where pk.status = 'published' and p.status = 'approved' and s.status = 'active'`);

    const services = new Set(placeServices.map((r) => r.service));
    const states = new Set(places.map((r) => r.state));
    // /photographers/[state]/[x] resolves x as a city first, so a state/service URL whose slug is also a city of
    // that state is not reachable: leave it out instead of listing a duplicate of the city page.
    const allCities = await tx.execute<{ state: string; city: string }>(sql`
      select st.slug as state, c.slug as city from cities c join states st on st.id = c.state_id where c.is_active and st.is_active`);
    const cityKeys = new Set(allCities.map((r) => `${r.state}/${r.city}`));
    const stateServices = new Set(placeServices.map((r) => `${r.state}/${r.service}`).filter((k) => !cityKeys.has(k)));
    const cityServices = new Set(placeServices.map((r) => `${r.state}/${r.city}/${r.service}`));

    return {
      states: [...states],
      cities: places.map((r) => `${r.state}/${r.city}`),
      services: [...services],
      stateServices: [...stateServices],
      cityServices: [...cityServices],
      profiles: [...new Map(profileServices.map((r) => [r.slug, { slug: r.slug, updated: r.updated }])).values()],
    };
  });
}
