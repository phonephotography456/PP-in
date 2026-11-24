import Link from "next/link";
import { Photo } from "@/components/Photo";
import { PACKAGES, STATES } from "@/lib/mock";

export const metadata = { title: "Locations" };

export default function LocationsPage() {
  return (
    <section className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Locations</h1>
      <p className="mt-1 text-muted">Find smartphone photographers by state and city.</p>

      <div className="mt-8 space-y-10">
        {STATES.map((s) => (
          <div key={s.slug}>
            <div className="mb-4 flex items-end justify-between border-b border-line pb-2">
              <h2 className="text-xl font-bold">{s.name}</h2>
              <Link href={`/search?state=${s.slug}`} className="text-sm font-semibold underline">All of {s.name}</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {s.cities.map((c) => {
                const count = PACKAGES.filter((k) => k.photographer.city === c).length;
                return (
                  <Link key={c} href={`/search?state=${s.slug}&city=${encodeURIComponent(c)}`} className="group">
                    <Photo seed={`city-${c}`} alt={c} className="aspect-[4/3] rounded-2xl" />
                    <p className="mt-2 font-semibold group-hover:underline">{c}</p>
                    <p className="text-sm text-muted">{count} packages</p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
