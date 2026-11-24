import Link from "next/link";
import { PackageCard } from "./PackageCard";
import { PhotographerCard } from "./PhotographerCard";
import { PAGE_SIZE, listPhotographers, searchPackages, type Filters } from "@/lib/public";

export type SP = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function readFilters(searchParams: SP, force: Filters = {}): Promise<Filters & { page: number }> {
  const sp = await searchParams;
  return {
    service: one(sp.service), state: one(sp.state), city: one(sp.city), phone: one(sp.phone),
    price: one(sp.price), level: one(sp.level), q: one(sp.q),
    page: Math.max(1, Math.floor(Number(one(sp.page))) || 1), ...force,
  };
}

const grid = (inline: boolean) => `mt-4 grid gap-5 sm:grid-cols-2 ${inline ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`;

export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

/** Link to page n of `basePath`, keeping the other query params. */
function pageHref(basePath: string, query: Record<string, string | undefined>, n: number) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v && k !== "page") q.set(k, v);
  if (n > 1) q.set("page", String(n));
  const qs = q.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function Pagination({ basePath, query, page, total }: { basePath: string; query: Record<string, string | undefined>; page: number; total: number }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const cls = (on: boolean) => `grid h-9 min-w-9 place-items-center rounded-md border px-3 text-sm font-semibold ${on ? "border-ink bg-ink text-on-brand" : "border-line hover:border-ink"}`;
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link href={pageHref(basePath, query, page - 1)} className={cls(false)}>Previous</Link>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={pageHref(basePath, query, n)} aria-current={n === page ? "page" : undefined} className={cls(n === page)}>{n}</Link>
      ))}
      {page < pages && <Link href={pageHref(basePath, query, page + 1)} className={cls(false)}>Next</Link>}
    </nav>
  );
}

/** Paginated package grid for search / service pages. Filters come from the URL. */
export async function PackageResults({ searchParams, basePath = "/search", force, inline = false }: { searchParams: SP; basePath?: string; force?: Filters; inline?: boolean }) {
  const { page, ...f } = await readFilters(searchParams, force);
  const { items, total } = await searchPackages(f, { page });
  if (!items.length) {
    return (
      <div className={inline ? "py-10" : "container-page py-16"}>
        <Empty title="No packages match these filters" hint="Try another city, price range or service." />
      </div>
    );
  }
  const query: Record<string, string | undefined> = { ...f };
  if (force?.service) delete query.service;
  return (
    <section className={inline ? "" : "container-page pt-10"}>
      <p className="text-sm text-muted">{total} {total === 1 ? "package" : "packages"}</p>
      <div className={grid(inline)}>{items.map((k) => <PackageCard key={k.id} pkg={k} />)}</div>
      <Pagination basePath={basePath} query={query} page={page} total={total} />
    </section>
  );
}

/** Paginated photographer grid for the /photographers/... listing pages. */
export async function PhotographerResults({ filters, searchParams, basePath }: { filters: { state?: string; city?: string; service?: string }; searchParams: SP; basePath: string }) {
  const { page } = await readFilters(searchParams);
  const { items, total } = await listPhotographers(filters, page);
  if (!items.length) return <Empty title="No photographers found here yet" hint="Check back soon, or browse another location or service." />;
  return (
    <>
      <p className="text-sm text-muted">{total} {total === 1 ? "photographer" : "photographers"}</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((p) => <PhotographerCard key={p.slug} p={p} service={filters.service} />)}</div>
      <Pagination basePath={basePath} query={{}} page={page} total={total} />
    </>
  );
}
