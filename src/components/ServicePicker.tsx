"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type Option = { slug: string; name: string; href: string; content: ReactNode };

// "Select a service" cards (only this photographer's services). First (Pre-wedding when offered) is selected by default.
export function ServicePicker({ options, defaultSlug }: { options: Option[]; defaultSlug?: string }) {
  const [active, setActive] = useState(defaultSlug ?? options[0]?.slug);
  const current = options.find((o) => o.slug === active);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-semibold">Select a service</p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = o.slug === active;
            return (
              <button
                key={o.slug}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(o.slug)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      </div>

      {current ? (
        <div className="mt-6">
          <div className="mb-4 flex items-end justify-between border-b border-line pb-2">
            <h3 className="text-xl font-bold">{current.name} packages</h3>
            {current.slug !== defaultSlug && <Link href={current.href} className="text-sm font-semibold underline">View {current.name} page</Link>}
          </div>
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
