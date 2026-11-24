import Link from "next/link";
import { PackageCard } from "./PackageCard";
import { filterPackages, serviceMix, SERVICES, type Filters } from "@/lib/mock";

const PAGE_SIZE = 15;

type SP = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

// Filters apply to all three level sections (homepage + search).
export async function FilteredPackages({ searchParams, groupBy = "none", inline = false, basePath = "/search" }: { searchParams: SP; groupBy?: "none" | "service"; inline?: boolean; basePath?: string }) {
  const sp = await searchParams;
  const f: Filters = { service: one(sp.service), state: one(sp.state), city: one(sp.city), phone: one(sp.phone), price: one(sp.price), level: one(sp.level), q: one(sp.q) };
  const all = filterPackages(f);

  if (!all.length) {
    return (
      <div className={inline ? "py-10" : "container-page py-16"}>
        <div className="card mx-auto max-w-lg p-10 text-center">
          <p className="text-lg font-semibold">No packages match these filters</p>
          <p className="mt-1 text-sm text-muted">Try another city, price range or service.</p>
        </div>
      </div>
    );
  }

  if (groupBy === "service") {
    return (
      <>
        {SERVICES.map((s) => {
          const items = serviceMix(all.filter((k) => k.service.slug === s.slug));
          if (!items.length) return null;
          return (
            <section key={s.slug} className={inline ? "mb-10" : "container-page pt-12"}>
              <div className="flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{s.name}</h2>
                <Link href={`/services/${s.slug}`} className="text-sm font-semibold underline">View all</Link>
              </div>
              <div className={`mt-5 grid gap-5 sm:grid-cols-2 ${inline ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
                {items.map((k) => <PackageCard key={k.seed} pkg={k} />)}
              </div>
            </section>
          );
        })}
      </>
    );
  }

  const pages = Math.ceil(all.length / PAGE_SIZE);
  const page = Math.min(Math.max(Number(one(sp.page)) || 1, 1), pages);
  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = one(v);
      if (val && k !== "page" && !(k === "service" && basePath !== "/search")) q.set(k, val);
    }
    if (n > 1) q.set("page", String(n));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pageCls = (on: boolean) => `grid h-9 min-w-9 place-items-center rounded-md border px-3 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`;

  return (
    <section className={inline ? "" : "container-page pt-10"}>
      <p className="text-sm text-muted">{all.length} packages</p>
      <div className={`mt-4 grid gap-5 sm:grid-cols-2 ${inline ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
        {all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((k) => <PackageCard key={k.seed} pkg={k} />)}
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && <Link href={href(page - 1)} className={pageCls(false)}>Previous</Link>}
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined} className={pageCls(n === page)}>{n}</Link>
          ))}
          {page < pages && <Link href={href(page + 1)} className={pageCls(false)}>Next</Link>}
        </nav>
      )}
    </section>
  );
}
