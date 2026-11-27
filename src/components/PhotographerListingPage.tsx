import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "./JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { PhotographerResults, readFilters, type SP } from "./Listing";
import { inr } from "@/lib/format";
import { PAGE_SIZE, countPhotographers, getCoverage, resolveListing, type Coverage } from "@/lib/public";
import { andList, pageInRange, pageMetadata, pagePath, plural, withPage } from "@/lib/seo";

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
  const [total, cov] = await Promise.all([
    countPhotographers(loc.state.slug, citySlug, service?.slug),
    getCoverage({ state: loc.state.slug, city: citySlug, service: service?.slug }),
  ]);
  const path = ["/photographers", loc.state.slug, citySlug, service?.slug].filter(Boolean).join("/");
  // Titles name the city only (the H1 and breadcrumb carry the state) so they fit in search results.
  const short = loc.city?.name ?? loc.state.name;
  const from = cov.from ? ` Packages from ${inr(cov.from)}.` : "";
  const svc = service?.name.toLowerCase();
  return pageMetadata({
    path: pagePath(path, page),
    title: withPage(service ? `${service.name} photographers in ${short}` : `Smartphone photographers in ${short}`, page),
    description: !total
      ? `Smartphone ${svc ? `${svc} ` : ""}photographers in ${place}.`
      : service
        ? `Looking for a ${svc} photographer in ${place}? Compare ${plural(total, "approved smartphone photographer")}, their ${svc} packages and portfolios.${from}`
        : `Compare ${plural(total, "approved smartphone photographer")} in ${place}${cov.services.length ? ` for ${andList(cov.services.slice(0, 3).map((x) => x.name.toLowerCase()))}` : ""}.${from} View portfolios and contact them directly.`,
    index: total > 0 && pageInRange(page, total, PAGE_SIZE),
  });
}

/** Factual intro built only from live listings: counts, cities, services and the lowest package price. */
function intro(place: string, cov: Coverage, service: { name: string } | null, inCity: boolean) {
  if (!cov.photographers) {
    return `No smartphone photographers ${service ? `with ${service.name.toLowerCase()} packages ` : ""}are listed in ${place} yet. Browse other locations or services below.`;
  }
  const one = cov.photographers === 1;
  const where = !inCity && cov.places.length > 1 ? ` across ${andList(cov.places.map((p) => p.cityName))}` : "";
  const what = service
    ? ` ${one ? "offers" : "offer"} ${service.name.toLowerCase()} packages`
    : ` ${one ? "lists" : "list"} packages for ${andList(cov.services.map((s) => s.name.toLowerCase()))}`;
  const price = cov.from ? `, starting from ${inr(cov.from)}` : "";
  return `${plural(cov.photographers, "approved smartphone photographer")} in ${place}${where}${what}${price}. Compare Basic, Standard and Premium packages, see each photographer's portfolio and contact them directly on call or WhatsApp.`;
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
  // Coverage of this exact page, and of the place without the service (for "other services here" links).
  const [cov, placeCov] = await Promise.all([
    getCoverage({ state: loc.state.slug, city: citySlug, service: service?.slug }),
    service ? getCoverage({ state: loc.state.slug, city: citySlug }) : null,
  ]);

  const base = `/photographers/${loc.state.slug}`;
  const placePath = citySlug ? `${base}/${citySlug}` : base;
  const here = service ? `${placePath}/${service.slug}` : placePath;
  const place = loc.city ? `${loc.city.name}, ${loc.state.name}` : loc.state.name;
  const placeName = loc.city?.name ?? loc.state.name;
  const title = service ? `${service.name} photographers in ${place}` : `Photographers in ${place}`;
  // Links only go to pages that have listings. A state-level service URL whose slug is also a city of the state
  // resolves to the city page, so it is never linked.
  const cityKeys = new Set(loc.cities.map((c) => c.slug));
  const otherServices = (placeCov ?? cov).services.filter((s) => s.slug !== service?.slug && (citySlug || !cityKeys.has(s.slug)));

  const crumbs = [
    { name: "Photographers", path: "/photographers" },
    { name: loc.state.name, path: base },
    ...(loc.city ? [{ name: loc.city.name, path: placePath }] : []),
    ...(service ? [{ name: service.name, path: here }] : []),
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link href="/photographers" className="hover:underline">Photographers</Link> / <Link href={base} className="hover:underline">{loc.state.name}</Link>
        {loc.city && <> / <Link href={placePath} className="hover:underline">{loc.city.name}</Link></>}
        {service && <> / {service.name}</>}
      </nav>
      <h1 className="heading-page">{title}</h1>
      <p className="mt-2 max-w-3xl text-muted">{intro(place, cov, service, !!loc.city)}</p>

      {!loc.city && cov.places.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold">{service ? `${service.name} photographers by city` : `Cities in ${loc.state.name}`}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cov.places.map((c) => (
              <li key={c.citySlug}><Link href={`${base}/${c.citySlug}${service ? `/${service.slug}` : ""}`} className={chip}>{c.cityName} ({c.photographers})</Link></li>
            ))}
          </ul>
        </section>
      )}

      {otherServices.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold">{service ? `Other services in ${placeName}` : `Services in ${placeName}`}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherServices.map((s) => <li key={s.slug}><Link href={`${placePath}/${s.slug}`} className={chip}>{s.name} photographers</Link></li>)}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="sr-only">{title}</h2>
        <PhotographerResults filters={{ state: loc.state.slug, city: citySlug, service: service?.slug }} searchParams={searchParams} basePath={here} />
      </section>

      {(service || loc.city) && (
        <p className="mt-8 text-sm text-muted">
          {service && <>See all <Link href={`/services/${service.slug}`} className="font-semibold underline">{service.name.toLowerCase()} packages across India</Link>. </>}
          {loc.city && <>Browse <Link href={base} className="font-semibold underline">all photographers in {loc.state.name}</Link>.</>}
        </p>
      )}
    </>
  );
}
