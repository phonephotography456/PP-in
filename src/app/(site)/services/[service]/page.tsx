import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CityStrip } from "@/components/CityStrip";
import { FilteredPackages } from "@/components/FilteredPackages";
import { SearchFilters } from "@/components/SearchFilters";
import { SERVICES } from "@/lib/mock";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ service: s.slug }));
}

export default async function ServicePage({ params, searchParams }: PageProps<"/services/[service]">) {
  const { service } = await params;
  const s = SERVICES.find((x) => x.slug === service);
  if (!s) notFound();

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{s.name} photographers</h1>
      <p className="mt-1 text-muted">Compare {s.name.toLowerCase()} packages shot on smartphones.</p>

      <div className="mt-6"><CityStrip base={`/services/${service}`} /></div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Filters</h2>
              <Link href={`/services/${service}`} className="text-sm font-semibold underline">Reset</Link>
            </div>
            <Suspense fallback={<SearchFilters vertical action={`/services/${service}`} fixedService={service} />}>
              <Sidebar service={service} searchParams={searchParams} />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0">
          <Suspense fallback={<p className="text-sm text-muted">Loading packages…</p>}>
            <FilteredPackages inline basePath={`/services/${service}`} searchParams={searchParams.then((sp) => ({ ...sp, service }))} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Sidebar({ service, searchParams }: { service: string; searchParams: PageProps<"/services/[service]">["searchParams"] }) {
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return <SearchFilters vertical action={`/services/${service}`} fixedService={service} values={{ state: v("state"), city: v("city"), phone: v("phone"), price: v("price"), level: v("level") }} />;
}
