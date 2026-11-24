import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/sitemap-data";
import { canonicalUrl } from "@/lib/site";

// Static, indexable public pages. /search and every auth, panel and admin route are deliberately absent.
const STATIC = ["/", "/photographers", "/locations", "/earn", "/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await getSitemapData();
  const entries: MetadataRoute.Sitemap = [
    ...STATIC.map((p) => ({ url: canonicalUrl(p) })),
    ...d.services.map((s) => ({ url: canonicalUrl(`/services/${s}`) })),
    ...d.states.map((s) => ({ url: canonicalUrl(`/photographers/${s}`) })),
    ...d.cities.map((c) => ({ url: canonicalUrl(`/photographers/${c}`) })),
    ...d.stateServices.map((c) => ({ url: canonicalUrl(`/photographers/${c}`) })),
    ...d.cityServices.map((c) => ({ url: canonicalUrl(`/photographers/${c}`) })),
    ...d.profiles.map((p) => ({ url: canonicalUrl(`/photographers/p/${p.slug}`), lastModified: p.updated })),
  ];
  return [...new Map(entries.map((e) => [e.url, e])).values()]; // de-duplicate by canonical URL
}
