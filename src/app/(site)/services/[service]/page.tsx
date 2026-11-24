import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CityStrip } from "@/components/CityStrip";
import { FiltersBar, FiltersFallback } from "@/components/FiltersBar";
import { PackageResults, readFilters } from "@/components/Listing";
import { inr } from "@/lib/format";
import { PAGE_SIZE, getFilterOptions, resolveService, searchPackages } from "@/lib/public";
import { isFiltered, pageInRange, pageMetadata, pagePath, shareImage, withPage } from "@/lib/seo";

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
  const [s, options] = await Promise.all([resolveService(service), getFilterOptions()]);
  if (!s) notFound();
  const path = `/services/${s.slug}`;

  return (
    <>
      <h1 className="heading-page">{s.name} photographers</h1>
      <p className="mt-1 text-muted">{s.description || `Compare ${s.name.toLowerCase()} packages shot on smartphones.`}</p>

      <div className="mt-6"><CityStrip items={options.cities.map((c) => ({ key: `${c.stateSlug}/${c.slug}`, name: c.name, href: `${path}?state=${c.stateSlug}&city=${c.slug}`, imageUrl: null }))} /></div>

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
