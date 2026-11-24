"use client";
import Link from "next/link";
import { useState } from "react";
import { Photo } from "./Photo";
import { STATES } from "@/lib/mock";

const SHOW_DESKTOP = 9; // + 1 "more" card
const SHOW_MOBILE = 3; // + 1 "more" card
const CITIES = STATES.flatMap((s) => s.cities.map((name) => ({ name, state: s.slug })));

// Round city photos with names. Clicking one filters `base` by that state + city.
export function CityStrip({ base }: { base: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? CITIES : CITIES.slice(0, SHOW_DESKTOP);
  const cell = "text-center sm:w-[96px] sm:shrink-0";
  const circle = "mx-auto h-16 w-16 rounded-full sm:h-20 sm:w-20";

  return (
    <nav aria-label="Browse by city" className={`grid grid-cols-4 gap-3 sm:flex sm:gap-5 sm:pb-2 ${all ? "sm:flex-wrap" : "sm:overflow-x-auto"}`}>
      {shown.map((c, i) => (
        <Link
          key={c.name}
          href={`${base}?state=${c.state}&city=${encodeURIComponent(c.name)}`}
          className={`group ${cell} ${!all && i >= SHOW_MOBILE ? "hidden sm:block" : ""}`}
        >
          <Photo seed={`city-${c.name}`} alt={c.name} className={`${circle} border border-line transition group-hover:border-ink`} />
          <span className="mt-2 block truncate text-xs font-medium group-hover:underline sm:text-sm">{c.name}</span>
        </Link>
      ))}
      <button type="button" onClick={() => setAll(!all)} className={cell}>
        <span className={`${circle} grid place-items-center bg-ink text-sm font-semibold text-white`}>
          {all ? "Less" : (<><span className="sm:hidden">+{CITIES.length - SHOW_MOBILE}</span><span className="hidden sm:inline">+{CITIES.length - SHOW_DESKTOP}</span></>)}
        </span>
        <span className="mt-2 block truncate text-xs font-medium sm:text-sm">{all ? "Show less" : "More cities"}</span>
      </button>
    </nav>
  );
}
