import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Empty } from "@/components/Listing";
import { inr } from "@/lib/format";
import { getCoverage, getFilterOptions } from "@/lib/public";
import { andList, pageMetadata, plural } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const cov = await getCoverage({});
  return pageMetadata({
    path: "/services",
    title: "Smartphone photography services in India",
    description: cov.services.length
      ? `Browse smartphone photography services in India: ${andList(cov.services.slice(0, 4).map((s) => s.name.toLowerCase()))}. Compare packages and prices from approved photographers.`
      : "Browse smartphone photography services in India and compare packages from approved photographers.",
    index: cov.services.length > 0,
  });
}

export default function ServicesPage() {
  return (
    <section className="container-page py-8">
      <h1 className="heading-page">Smartphone photography services</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Choose a service to compare Basic, Standard and Premium packages from smartphone photographers, see their portfolios and contact them directly.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading services…</p>}>
        <ServiceList />
      </Suspense>
    </section>
  );
}

async function ServiceList() {
  const [{ services }, cov] = await Promise.all([getFilterOptions(), getCoverage({})]);
  if (!services.length) return <div className="mt-8"><Empty title="No services yet" hint="Services will appear here once they are added." /></div>;
  const stats = new Map(cov.services.map((s) => [s.slug, s]));
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => {
        const x = stats.get(s.slug);
        return (
          <Link key={s.slug} href={`/services/${s.slug}`} className="card group p-5 transition hover:border-ink">
            <h2 className="font-semibold group-hover:text-brand">{s.name} photographers</h2>
            {s.description && <p className="mt-1 line-clamp-3 text-sm text-muted">{s.description}</p>}
            <p className="mt-3 text-sm font-medium">
              {x ? `${plural(x.photographers, "photographer")} · from ${inr(x.from)}` : "No packages yet"}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
