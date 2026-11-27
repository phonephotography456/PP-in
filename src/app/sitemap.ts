import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/sitemap-data";
import { canonicalUrl } from "@/lib/site";

// Static, indexable public pages. /search and every auth, panel and admin route are deliberately absent.
const STATIC = ["/earn", "/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions"];
// Hub pages: their content is the listings, so they change whenever any listing does. Without any listing they are
// noindex (empty), so they are left out.
const HUBS = ["/photographers", "/services", "/locations"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await getSitemapData();
  const entries: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/"), lastModified: d.latest },
    ...(d.services.length ? HUBS.map((p) => ({ url: canonicalUrl(p), lastModified: d.latest })) : []),
    ...STATIC.map((p) => ({ url: canonicalUrl(p) })),
    ...d.services.map((s) => ({ url: canonicalUrl(`/services/${s.path}`), lastModified: s.updated })),
    ...[...d.states, ...d.cities, ...d.stateServices, ...d.cityServices].map((x) => ({ url: canonicalUrl(`/photographers/${x.path}`), lastModified: x.updated })),
    ...d.profiles.map((p) => ({ url: canonicalUrl(`/photographers/p/${p.slug}`), lastModified: p.updated })),
  ];
  return [...new Map(entries.map((e) => [e.url, e])).values()]; // de-duplicate by canonical URL
}
