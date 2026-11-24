import { Suspense } from "react";
import { FiltersBar, FiltersFallback } from "@/components/FiltersBar";
import { PackageResults } from "@/components/Listing";
import { pageMetadata } from "@/lib/seo";

// Internal search results: every filter combination is a duplicate view of other pages, so never indexed.
export const metadata = pageMetadata({
  path: "/search",
  title: "Search smartphone photographer packages",
  description: "Search smartphone photographer packages by service, location, phone and price.",
  index: false,
});

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <section className="container-page pt-8">
        <h1 className="heading-page">Search results</h1>
        <p className="mt-1 text-muted">Click any package to see the photographer&apos;s full service page.</p>
        <div className="mt-6">
          <Suspense fallback={<FiltersFallback action="/search" />}>
            <FiltersBar action="/search" searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <Suspense fallback={<div className="container-page pt-12 text-sm text-muted">Loading packages…</div>}>
        <PackageResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
