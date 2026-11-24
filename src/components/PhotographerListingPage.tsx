import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "./JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { PhotographerResults, readFilters, type SP } from "./Listing";
import { PAGE_SIZE, countPhotographers, resolveListing } from "@/lib/public";
import { pageInRange, pageMetadata, pagePath, withPage } from "@/lib/seo";

const chip = "rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-ink";

type Params = Promise<{ state: string; segment?: string; service?: string }>;

/**
 * Indexable only when the page lists at least one real approved photographer (and, for later pages, only while
 * they hold results): empty location/service combinations are noindex.
 */
export async function listingMetadata(params: Params, searchParams: SP): Promise<Metadata> {
  const { state, segment, service: third } = await params;
  const found = await resolveListing(state, segment, third);
  if (!found) return { title: "Page not found", robots: { index: false } };
  const { loc, citySlug, service } = found;
  const place = loc.city ? `${loc.city.name}, ${loc.state.name}` : loc.state.name;
  const { page } = await readFilters(searchParams);
  const total = await countPhotographers(loc.state.slug, citySlug, service?.slug);
  const path = ["/photographers", loc.state.slug, citySlug, service?.slug].filter(Boolean).join("/");
  const noun = service ? `${service.name.toLowerCase()} ` : "";
  return pageMetadata({
    path: pagePath(path, page),
    title: withPage(service ? `${service.name} photographers in ${place}` : `Smartphone photographers in ${place}`, page),
    description: total
      ? `Compare ${total} approved smartphone ${total === 1 ? "photographer" : "photographers"} for ${noun || "photography "}in ${place}. View packages and portfolios and contact them directly.`
      : `Smartphone ${noun}photographers in ${place}.`,
    index: total > 0 && pageInRange(page, total, PAGE_SIZE),
  });
}

/**
 * Shared body of /photographers/[state], /[state]/[city|service] and /[state]/[city]/[service].
 * Any unknown or inactive slug => 404. `segment` is the raw second segment (city or service), `service` the third.
 */
export function PhotographerListingPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <div className="container-page py-8">
      <Suspense fallback={<p className="text-sm text-muted">Loading photographers…</p>}>
        <Body params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { state, segment: second, service: third } = await params;
  // /photographers/[state]/[x]: x is a city of this state, otherwise a service. Unknown or inactive slug => 404.
  const found = await resolveListing(state, second, third);
  if (!found) notFound();
  const { loc, citySlug, service } = found;

  const base = `/photographers/${loc.state.slug}`;
  const here = [base, citySlug, service?.slug].filter(Boolean).join("/");
  const place = loc.city ? `${loc.city.name}, ${loc.state.name}` : loc.state.name;
  const title = service ? `${service.name} photographers in ${place}` : `Photographers in ${place}`;

  const crumbs = [
    { name: "Photographers", path: "/photographers" },
    { name: loc.state.name, path: base },
    ...(loc.city ? [{ name: loc.city.name, path: `${base}/${loc.city.slug}` }] : []),
    ...(service ? [{ name: service.name, path: here }] : []),
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link href="/photographers" className="hover:underline">Photographers</Link> / <Link href={base} className="hover:underline">{loc.state.name}</Link>
        {loc.city && <> / <Link href={`${base}/${loc.city.slug}`} className="hover:underline">{loc.city.name}</Link></>}
        {service && <> / {service.name}</>}
      </nav>
      <h1 className="heading-page">{title}</h1>
      <p className="mt-1 text-muted">Smartphone photographers {service ? `for ${service.name.toLowerCase()} ` : ""}in {place}.</p>

      {!loc.city && loc.cities.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Cities">
          {loc.cities.map((c) => <li key={c.slug}><Link href={`${base}/${c.slug}${service ? `/${service.slug}` : ""}`} className={chip}>{c.name}</Link></li>)}
        </ul>
      )}

      <div className="mt-8">
        <PhotographerResults filters={{ state: loc.state.slug, city: citySlug, service: service?.slug }} searchParams={searchParams} basePath={here} />
      </div>
    </>
  );
}
