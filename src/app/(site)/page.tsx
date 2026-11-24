import Link from "next/link";
import { Suspense } from "react";
import { CityStrip } from "@/components/CityStrip";
import { FilteredPackages } from "@/components/FilteredPackages";
import { Photo } from "@/components/Photo";
import { SearchFilters } from "@/components/SearchFilters";
import { SERVICES, STATES } from "@/lib/mock";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      {/* 2. Banner */}
      <section className="relative">
        <Photo seed="hero-banner" alt="Couple photographed on a smartphone" className="h-[380px] sm:h-[480px]" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent">
          <div className="container-page flex h-full flex-col justify-end pb-14 sm:pb-16">
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Beautiful moments, shot on smartphones.
            </h1>
            <p className="mt-3 max-w-xl text-white/90 sm:text-lg">
              Discover photographers across India and compare packages for weddings, pre-weddings and more.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Filters */}
      <section id="filters" className="container-page relative z-10 -mt-8 px-4 sm:px-10">
        <Suspense fallback={<SearchFilters action="/" />}>
          <FiltersFromParams searchParams={searchParams} />
        </Suspense>
      </section>

      <section className="container-page pt-10">
        <CityStrip base="/" />
      </section>

      {/* 4-6. One section per service: 1 Basic, 2 Standard, 1 Premium */}
      <Suspense fallback={<div className="container-page pt-12 text-sm text-muted">Loading packages…</div>}>
        <FilteredPackages searchParams={searchParams} groupBy="service" />
      </Suspense>

      {/* 8. States */}
      <section className="container-page pt-16">
        <h2 className="text-2xl font-bold tracking-tight">Browse States</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STATES.map((s) => (
            <Link key={s.slug} href={`/photographers/${s.slug}`} className="group">
              <Photo seed={`state-${s.slug}`} alt={s.name} className="aspect-[4/3] rounded-2xl" />
              <p className="mt-2 font-semibold group-hover:text-brand">{s.name}</p>
              <p className="text-sm text-muted">{s.cities.length} cities</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 9. Become a photographer */}
      <section className="container-page pt-16">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-brand-soft p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Shoot on a smartphone? Join as a photographer.</h2>
            <p className="mt-1 text-muted">Create your profile, list packages and get enquiries on WhatsApp.</p>
          </div>
          <Link href="/photographer/register" className="btn-primary shrink-0">Become a Photographer</Link>
        </div>
      </section>

      {/* 10. Services */}
      <section className="container-page pt-16">
        <h2 className="text-2xl font-bold tracking-tight">Browse Services</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="group">
              <Photo seed={`service-${s.slug}`} alt={s.name} className="aspect-square rounded-2xl" />
              <p className="mt-2 font-semibold group-hover:text-brand">{s.name}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

async function FiltersFromParams({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return <SearchFilters action="/#filters" values={{ service: v("service"), state: v("state"), city: v("city"), phone: v("phone"), price: v("price") }} />;
}
