import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Empty } from "@/components/Listing";
import { getLocations } from "@/lib/public";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const states = await getLocations();
  const cities = states.reduce((n, s) => n + s.cities.length, 0);
  return pageMetadata({
    path: "/locations",
    title: "Smartphone photographers by state and city",
    description: states.length
      ? `Find smartphone photographers in ${cities} ${cities === 1 ? "city" : "cities"} across ${states.length} ${states.length === 1 ? "state" : "states"} in India.`
      : "Find smartphone photographers by state and city in India.",
    index: states.length > 0,
  });
}

export default function LocationsPage() {
  return (
    <section className="container-page py-8">
      <h1 className="heading-page">Locations</h1>
      <p className="mt-1 text-muted">Find smartphone photographers by state and city.</p>
      <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading locations…</p>}>
        <States />
      </Suspense>
    </section>
  );
}

async function States() {
  const states = await getLocations();
  if (!states.length) return <div className="mt-8"><Empty title="No locations yet" hint="Photographers will appear here once they join." /></div>;
  return (
    <div className="mt-8 space-y-10">
      {states.map((s) => (
        <div key={s.slug}>
          <div className="mb-4 flex items-end justify-between border-b border-line pb-2">
            <h2 className="text-xl font-bold">{s.name}</h2>
            <Link href={`/photographers/${s.slug}`} className="text-sm font-semibold underline">All of {s.name}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {s.cities.map((c) => (
              <Link key={c.slug} href={`/photographers/${s.slug}/${c.slug}`} className="card group p-5 transition hover:border-ink">
                <p className="font-semibold group-hover:underline">{c.name}</p>
                <p className="text-sm text-muted">{c.photographers} {c.photographers === 1 ? "photographer" : "photographers"}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
