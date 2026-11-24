import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { JsonLd } from "@/components/JsonLd";
import { homeJsonLd } from "@/lib/jsonld";
import { CityStrip } from "@/components/CityStrip";
import { Faq } from "@/components/Faq";
import { FiltersBar, FiltersFallback } from "@/components/FiltersBar";
import { PackageCard } from "@/components/PackageCard";
import { Photo } from "@/components/Photo";
import { PhotographerCard } from "@/components/PhotographerCard";
import { readFilters, type SP } from "@/components/Listing";
import { getBanner, getFeaturedPhotographers, getFilterOptions, getHiddenSections, getLocationStrip, getServiceShowcase, getStatesWithCounts, type Filters } from "@/lib/public";
import type { HomeSectionKey } from "@/lib/home-sections";
import { isFiltered, pageMetadata, shareImage } from "@/lib/seo";

const HERO_TITLE = "Beautiful moments, shot on smartphones.";
const HERO_TEXT = "Discover photographers across India and compare packages for weddings, pre-weddings and more.";

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const [filters, banner, { services }] = await Promise.all([readFilters(searchParams), getBanner(), getFilterOptions()]);
  const names = services.slice(0, 3).map((s) => s.name.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return pageMetadata({
    path: "/",
    absoluteTitle: true,
    title: "PhonePhotography.in | Find smartphone photographers in India",
    description: `Find smartphone photographers across India. Compare Basic, Standard and Premium packages${list ? ` for ${list}` : ""} and contact them directly.`,
    index: !isFiltered(filters), // ?service=…&city=… variants are filtered duplicates of the homepage
    image: shareImage(banner?.imageUrl),
  });
}

// Order: header, banner, filters, one section per service, Browse States,
// Become a Photographer, Browse Services, footer (header/footer come from the site layout).
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <JsonLd data={homeJsonLd()} />
      <Suspense fallback={<div className="h-[380px] bg-ink sm:h-[480px]" />}>
        <Show k="banner"><Hero /></Show>
      </Suspense>

      <Suspense>
        <Show k="filters">
          <section id="filters" className="container-page relative z-10 -mt-8 px-4 sm:px-10">
            <Suspense fallback={<FiltersFallback action="/#filters" />}>
              <FiltersBar action="/#filters" searchParams={searchParams} />
            </Suspense>
          </section>
        </Show>
      </Suspense>

      <Suspense>
        <Show k="cities"><Cities /></Show>
      </Suspense>

      <Suspense>
        <Show k="packages"><ServiceSections searchParams={searchParams} /></Show>
      </Suspense>

      <Suspense>
        <Show k="featured"><Featured /></Show>
      </Suspense>

      <Suspense>
        <Show k="states"><States /></Show>
      </Suspense>

      <Suspense>
        <Show k="join">
          <section className="container-page pt-16">
            <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-brand-soft p-8 sm:flex-row sm:items-center sm:p-10">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Shoot on a smartphone? Join as a photographer.</h2>
                <p className="mt-1 text-muted">Create your profile, list packages and get enquiries on WhatsApp.</p>
              </div>
              <Link href="/photographer/register" className="btn-primary shrink-0">Become a Photographer</Link>
            </div>
          </section>
        </Show>
      </Suspense>

      <Suspense>
        <Show k="services"><Services /></Show>
      </Suspense>

      <Suspense>
        <Show k="faq"><Faq /></Show>
      </Suspense>
    </>
  );
}

/** Renders its children unless the admin switched this homepage section off. */
async function Show({ k, children }: { k: HomeSectionKey; children: ReactNode }) {
  return (await getHiddenSections()).has(k) ? null : children;
}

async function Hero() {
  const b = await getBanner();
  const content = (
    <>
      <Photo src={b?.imageUrl} alt={b?.heading ?? "PhonePhotography banner"} className={`h-[380px] sm:h-[480px] ${b?.imageUrl ? "" : "!bg-ink"}`} priority />
      <div className="absolute inset-0 bg-gradient-to-t -scrim/60 -scrim/10 to-transparent">
        <div className="container-page flex h-full flex-col justify-end pb-14 sm:pb-16">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-on-brand sm:whitespace-nowrap sm:text-5xl">{b?.heading || HERO_TITLE}</h1>
          <p className="mt-3 max-w-xl text-on-brand/90 sm:text-lg">{b?.description || HERO_TEXT}</p>
        </div>
      </div>
    </>
  );
  const link = b?.linkUrl;
  const internal = !!link && link.startsWith("/") && !link.startsWith("//");
  if (link && internal) return <Link href={link} className="relative block">{content}</Link>;
  if (link?.startsWith("https://")) return <a href={link} target="_blank" rel="noopener noreferrer" className="relative block">{content}</a>;
  return <section className="relative">{content}</section>;
}

async function Cities() {
  const items = await getLocationStrip();
  if (!items.length) return null;
  return (
    <section className="container-page pt-10">
      <CityStrip items={items} />
    </section>
  );
}

// One section per service the admin marked "show on home": 4 packages (1 Basic, 2 Standard, 1 Premium) from different photographers. The filter bar applies to all.
async function ServiceSections({ searchParams }: { searchParams: SP }) {
  const [{ page, ...f }, { services }] = await Promise.all([readFilters(searchParams), getFilterOptions()]);
  void page;
  const shown = f.service ? services.filter((s) => s.slug === f.service) : services.filter((s) => s.showOnHome);
  return shown.map((s) => (
    <Suspense key={s.slug} fallback={<div className="container-page pt-12 text-sm text-muted">Loading {s.name} packages…</div>}>
      <ServiceSection name={s.name} slug={s.slug} filters={f} />
    </Suspense>
  ));
}

async function ServiceSection({ name, slug, filters }: { name: string; slug: string; filters: Filters }) {
  const items = await getServiceShowcase({ ...filters, service: slug });
  if (!items.length) return null;
  const q = new URLSearchParams(Object.entries({ ...filters, service: slug, level: undefined }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <section className="container-page pt-12">
      <div className="flex items-end justify-between">
        <h2 className="heading-section">{name} Packages</h2>
        <Link href={`/search?${q}`} className="text-sm font-semibold underline">View all</Link>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((k) => <PackageCard key={k.id} pkg={k} />)}</div>
    </section>
  );
}

async function Featured() {
  const items = await getFeaturedPhotographers();
  if (!items.length) return null;
  return (
    <section className="container-page pt-16">
      <h2 className="heading-section">Featured Photographers</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((p) => <PhotographerCard key={p.slug} p={p} viewServices />)}</div>
    </section>
  );
}

async function States() {
  const states = await getStatesWithCounts();
  if (!states.length) return null;
  return (
    <section className="container-page pt-16">
      <h2 className="heading-section">Browse States</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {states.map((s) => (
          <Link key={s.slug} href={`/photographers/${s.slug}`} className="card group w-[calc(50%-0.5rem)] p-5 transition hover:border-ink sm:w-[calc(33.333%-0.75rem)] lg:w-[calc(20%-0.8rem)]">
            <p className="font-semibold group-hover:text-brand">{s.name}</p>
            <p className="mt-1 text-sm text-muted">{s.cities} {s.cities === 1 ? "city" : "cities"} · {s.photographers} {s.photographers === 1 ? "photographer" : "photographers"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function Services() {
  const { services } = await getFilterOptions();
  if (!services.length) return null;
  return (
    <section className="container-page pt-16">
      <h2 className="heading-section">Browse Services</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {services.map((s) => (
          <Link key={s.slug} href={`/services/${s.slug}`} className="card group p-5 transition hover:border-ink">
            <p className="font-semibold group-hover:text-brand">{s.name}</p>
            {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
