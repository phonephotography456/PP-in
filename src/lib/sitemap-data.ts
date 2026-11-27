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
    // The same, per active service with a published package. `updated`: the latest change to a listed profile or
    // package, i.e. when what the page shows last changed (used as <lastmod>).
    const placeServices = await tx.execute<{ state: string; city: string; service: string; updated: Date }>(sql`
      select st.slug as state, c.slug as city, s.slug as service, max(greatest(p.updated_at, pk.updated_at)) as updated
      from packages pk join photographers p on p.id = pk.photographer_id join services s on s.id = pk.service_id
        join cities c on c.id = p.city_id join states st on st.id = p.state_id
      where pk.status = 'published' and p.status = 'approved' and s.status = 'active' and c.is_active and st.is_active
      group by st.slug, c.slug, s.slug`);
    // Approved photographers' pages for each active service they have published packages for. A profile is only
    // indexable (and listed) when it has at least one of those, so profile URLs come from the same rows.
    const profiles = await tx.execute<{ slug: string; updated: Date }>(sql`
      select p.slug, max(greatest(p.updated_at, pk.updated_at)) as updated
      from packages pk join photographers p on p.id = pk.photographer_id join services s on s.id = pk.service_id
      where pk.status = 'published' and p.status = 'approved' and s.status = 'active'
      group by p.slug`);

    // Latest `updated` per key over the placeServices rows.
    const latest = (key: (r: (typeof placeServices)[number]) => string) => {
      const m = new Map<string, Date>();
      for (const r of placeServices) {
        const k = key(r), d = new Date(r.updated);
        if (!m.has(k) || d > m.get(k)!) m.set(k, d);
      }
      return m;
    };
    const byService = latest((r) => r.service), byState = latest((r) => r.state), byCity = latest((r) => `${r.state}/${r.city}`);
    const byStateService = latest((r) => `${r.state}/${r.service}`), byCityService = latest((r) => `${r.state}/${r.city}/${r.service}`);
    const states = new Set(places.map((r) => r.state));
    // /photographers/[state]/[x] resolves x as a city first, so a state/service URL whose slug is also a city of
    // that state is not reachable: leave it out instead of listing a duplicate of the city page.
    const allCities = await tx.execute<{ state: string; city: string }>(sql`
      select st.slug as state, c.slug as city from cities c join states st on st.id = c.state_id where c.is_active and st.is_active`);
    const cityKeys = new Set(allCities.map((r) => `${r.state}/${r.city}`));
    const entries = (m: Map<string, Date>, skip?: Set<string>) => [...m].filter(([k]) => !skip?.has(k)).map(([path, updated]) => ({ path, updated }));
    // Places with approved photographers but no published package yet are listed without a date.
    const withDate = (keys: Iterable<string>, m: Map<string, Date>) => [...new Set(keys)].map((path) => ({ path, updated: m.get(path) }));

    return {
      states: withDate(states, byState),
      cities: withDate(places.map((r) => `${r.state}/${r.city}`), byCity),
      services: entries(byService),
      stateServices: entries(byStateService, cityKeys),
      cityServices: entries(byCityService),
      profiles: profiles.map((r) => ({ slug: r.slug, updated: new Date(r.updated) })),
      latest: [...byService.values()].reduce<Date | undefined>((a, d) => (!a || d > a ? d : a), undefined),
    };
  });
}
