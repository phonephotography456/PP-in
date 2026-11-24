import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotographerResults, readFilters } from "@/components/Listing";
import { PAGE_SIZE, countPhotographers } from "@/lib/public";
import { pageInRange, pageMetadata, pagePath, withPage } from "@/lib/seo";

export async function generateMetadata({ searchParams }: PageProps<"/photographers">): Promise<Metadata> {
  const [{ page }, total] = await Promise.all([readFilters(searchParams), countPhotographers()]);
  return pageMetadata({
    path: pagePath("/photographers", page),
    title: withPage("Browse smartphone photographers in India", page),
    description: `Browse ${total} approved smartphone ${total === 1 ? "photographer" : "photographers"} across India. Compare packages, view portfolios and contact them directly.`,
    index: total > 0 && pageInRange(page, total, PAGE_SIZE),
  });
}

export default function PhotographersPage({ searchParams }: PageProps<"/photographers">) {
  return (
    <section className="container-page py-8">
      <h1 className="heading-page">Browse photographers</h1>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading photographers…</p>}>
          <PhotographerResults filters={{}} searchParams={searchParams} basePath="/photographers" />
        </Suspense>
      </div>
    </section>
  );
}
