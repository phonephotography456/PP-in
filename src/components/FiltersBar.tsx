import { SearchFilters } from "./SearchFilters";
import { readFilters, type SP } from "./Listing";
import { getFilterOptions } from "@/lib/public";

/** Search filters pre-filled from the URL (search params make it request-time, so callers wrap it in Suspense). */
export async function FiltersBar({ action, searchParams, vertical, fixedService }: { action: string; searchParams: SP; vertical?: boolean; fixedService?: string }) {
  const [options, f] = await Promise.all([getFilterOptions(), readFilters(searchParams)]);
  return <SearchFilters action={action} options={options} vertical={vertical} fixedService={fixedService} values={{ service: f.service, state: f.state, city: f.city, phone: f.phone, price: f.price, level: f.level }} />;
}

/** Same form with no pre-filled values: Suspense fallback. */
export async function FiltersFallback({ action, vertical, fixedService }: { action: string; vertical?: boolean; fixedService?: string }) {
  return <SearchFilters action={action} options={await getFilterOptions()} vertical={vertical} fixedService={fixedService} />;
}
