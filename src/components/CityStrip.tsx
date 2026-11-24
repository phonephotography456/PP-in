import Link from "next/link";

const SHOW_DESKTOP = 9; // + 1 "more" card
const SHOW_MOBILE = 3; // + 1 "more" card

export type StripItem = { key: string; name: string; href: string; imageUrl: string | null };

// Round chips (logo, or initial letter when none) for states and cities. Each links to its own page; "More" opens /locations.
export function CityStrip({ items }: { items: StripItem[] }) {
  if (!items.length) return null;
  const cell = "text-center sm:w-[96px] sm:shrink-0";
  const circle = "mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-line bg-surface text-lg font-bold sm:h-20 sm:w-20";

  return (
    <nav aria-label="Browse by location" className="grid grid-cols-4 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-5 sm:pb-2">
      {items.slice(0, SHOW_DESKTOP).map((c, i) => (
        <Link key={c.key} href={c.href} className={`group ${cell} ${i >= SHOW_MOBILE ? "hidden sm:block" : ""}`}>
          <span className={`${circle} transition group-hover:border-ink`}>
            {c.imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              : c.name.charAt(0)}
          </span>
          <span className="mt-2 block truncate text-xs font-medium group-hover:underline sm:text-sm">{c.name}</span>
        </Link>
      ))}
      {/* Always shown: opens the full locations page. Count = items not visible at this breakpoint. */}
      <Link href="/locations" className={cell}>
        <span className={`${circle} bg-ink text-sm font-semibold text-on-brand`}>
          <span className="sm:hidden">{items.length > SHOW_MOBILE ? `+${items.length - SHOW_MOBILE}` : "All"}</span>
          <span className="hidden sm:inline">{items.length > SHOW_DESKTOP ? `+${items.length - SHOW_DESKTOP}` : "All"}</span>
        </span>
        <span className="mt-2 block truncate text-xs font-medium sm:text-sm">More cities</span>
      </Link>
    </nav>
  );
}
