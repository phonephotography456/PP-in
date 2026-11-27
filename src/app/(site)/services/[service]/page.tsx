import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CityStrip } from "@/components/CityStrip";
import { JsonLd } from "@/components/JsonLd";
import { FiltersBar, FiltersFallback } from "@/components/FiltersBar";
import { PackageResults, readFilters } from "@/components/Listing";
import { inr } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { PAGE_SIZE, getCoverage, resolveService, searchPackages } from "@/lib/public";
import { andList, isFiltered, pageInRange, pageMetadata, pagePath, plural, shareImage, withPage } from "@/lib/seo";

export async function generateMetadata({ params, searchParams }: PageProps<"/services/[service]">): Promise<Metadata> {
  const { service } = await params;
  const s = await resolveService(service);
  if (!s) return { title: "Page not found", robots: { index: false } };
  const { page, ...f } = await readFilters(searchParams);
  const { items, total } = await searchPackages({ service: s.slug }, { limit: 1 });
  const from = items[0]?.offerPrice;
  const intro = s.description ? `${s.description} ` : "";
  return pageMetadata({
    path: pagePath(`/services/${s.slug}`, page),
    title: withPage(`${s.name} photographers in India`, page),
    description: total
      ? `${intro}Compare ${total} ${s.name.toLowerCase()} ${total === 1 ? "package" : "packages"} shot on smartphones${from ? `, from ${inr(from)}` : ""}.`
      : `${intro}${s.name} packages shot on smartphones.`,
    index: total > 0 && !isFiltered({ ...f, service: undefined }) && pageInRange(page, total, PAGE_SIZE),
    image: shareImage(items[0]?.image),
  });
}

export default function ServicePage({ params, searchParams }: PageProps<"/services/[service]">) {
  return (
    <div className="container-page py-8">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Body params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ params, searchParams }: Pick<PageProps<"/services/[service]">, "params" | "searchParams">) {
  const { service } = await params;
  const s = await resolveService(service);
  if (!s) notFound();
  const path = `/services/${s.slug}`;
  const cov = await getCoverage({ service: s.slug });
  const lower = s.name.toLowerCase();
  const crumbs = [{ name: "Services", path: "/services" }, { name: s.name, path }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link href="/services" className="hover:underline">Services</Link> / {s.name}
      </nav>
      <h1 className="heading-page">{s.name} photographers</h1>
      {s.description && <p className="mt-2 max-w-3xl text-muted">{s.description}</p>}
      <p className="mt-2 max-w-3xl text-muted">
        {cov.photographers
          ? `${plural(cov.photographers, "approved smartphone photographer")} ${cov.photographers === 1 ? "offers" : "offer"} ${lower} packages in ${andList(cov.places.map((c) => c.cityName))}${cov.from ? `, starting from ${inr(cov.from)}` : ""}. Filter by city, phone and budget, then open a package to see the photographer's full portfolio.`
          : `No ${lower} packages are published yet. Check back soon, or browse other services.`}
      </p>

      {/* Canonical city pages for this service (only cities that have it), not filtered duplicates of this page. */}
      {cov.places.length > 0 && (
        <div className="mt-6"><CityStrip items={cov.places.map((c) => ({ key: `${c.stateSlug}/${c.citySlug}`, name: c.cityName, href: `/photographers/${c.stateSlug}/${c.citySlug}/${s.slug}`, imageUrl: null }))} /></div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Filters</h2>
              <Link href={path} className="text-sm font-semibold underline">Reset</Link>
            </div>
            <Suspense fallback={<FiltersFallback vertical action={path} fixedService={s.slug} />}>
              <FiltersBar vertical action={path} fixedService={s.slug} searchParams={searchParams} />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0">
          <Suspense fallback={<p className="text-sm text-muted">Loading packages…</p>}>
            <PackageResults inline basePath={path} force={{ service: s.slug }} searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
