import { Suspense } from "react";
import { FilteredPackages } from "@/components/FilteredPackages";
import { SearchFilters } from "@/components/SearchFilters";

export const metadata = { title: "Search photographers" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <section className="container-page pt-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Search results</h1>
        <p className="mt-1 text-muted">Packages grouped by level. Click any card to see the photographer&apos;s full service page.</p>
        <div className="mt-6">
          <Suspense fallback={<SearchFilters action="/search" />}>
            <Filters searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <Suspense fallback={<div className="container-page pt-12 text-sm text-muted">Loading packages…</div>}>
        <FilteredPackages searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Filters({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return <SearchFilters action="/search" values={{ service: v("service"), state: v("state"), city: v("city"), phone: v("phone"), price: v("price") }} />;
}
