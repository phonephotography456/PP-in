import { LEVEL_LABEL } from "./format";
import { shareImage } from "./seo";
import { SITE_NAME, canonicalUrl } from "./site";
import type { getProfile, getProfileService } from "./public";

// Structured data built only from public, visible page data. Nothing is invented: absent values are omitted
// (no address, telephone, logo, price or rating unless it exists and is shown on the page).
type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
type ServiceData = NonNullable<Awaited<ReturnType<typeof getProfileService>>>;

const strip = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length))) as T;
const businessId = (slug: string) => `${canonicalUrl(`/photographers/p/${slug}`)}#business`;

export const homeJsonLd = () => ({
  "@graph": [
    { "@type": "WebSite", "@id": `${canonicalUrl("/")}#website`, name: SITE_NAME, url: canonicalUrl("/") },
    { "@type": "Organization", "@id": `${canonicalUrl("/")}#organization`, name: SITE_NAME, url: canonicalUrl("/") },
  ],
});

export function profileJsonLd(p: Profile) {
  return strip({
    "@type": "LocalBusiness",
    "@id": businessId(p.slug),
    name: p.name,
    url: canonicalUrl(`/photographers/p/${p.slug}`),
    description: p.about,
    image: shareImage(p.banner, p.profilePhoto, p.logo),
    areaServed: p.city ? { "@type": "City", name: p.city } : undefined,
    // Only the city and state shown on the page. No street address or phone is published.
    address: p.city || p.state ? strip({ "@type": "PostalAddress", addressLocality: p.city, addressRegion: p.state, addressCountry: "IN" }) : undefined,
    sameAs: [p.instagram, p.youtube, p.website].filter((u): u is string => !!u && /^https:\/\//i.test(u)),
  });
}

export function serviceJsonLd(p: Profile, data: ServiceData) {
  const s = data.service;
  const url = `${canonicalUrl(`/photographers/p/${p.slug}`)}?service=${s.slug}`; // one page per photographer; ?service= selects the service
  const { count, average } = data.reviews;
  return strip({
    "@type": "Service",
    name: `${s.name} by ${p.name}`,
    serviceType: s.name,
    description: s.description,
    url,
    image: shareImage(data.packages.flatMap((k) => k.images.map((i) => i.url))[0], data.portfolio[0]?.url, p.banner, p.profilePhoto, p.logo),
    provider: strip({ "@type": "LocalBusiness", "@id": businessId(p.slug), name: p.name, url: canonicalUrl(`/photographers/p/${p.slug}`) }),
    areaServed: p.city ? { "@type": "City", name: p.city } : undefined,
    offers: data.packages.map((k) => ({ "@type": "Offer", name: `${LEVEL_LABEL[k.level]} – ${k.name}`, price: k.offerPrice, priceCurrency: "INR", url })),
    // Approved reviews only (the page shows the same count and one-decimal average).
    aggregateRating: count > 0 && average !== null ? { "@type": "AggregateRating", ratingValue: Number(average.toFixed(1)), reviewCount: count, bestRating: 5, worstRating: 1 } : undefined,
  });
}

/** Mirrors the visible breadcrumb trail. Each crumb is { name, path }; the last one is the current page. */
export const breadcrumbJsonLd = (crumbs: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: canonicalUrl(c.path) })),
});
