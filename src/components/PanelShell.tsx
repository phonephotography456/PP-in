"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = { href: string; label: string };

// Shared shell for photographer + admin panels: sidebar on desktop, scrolling tabs on mobile.
export function PanelShell({ title, items, children }: { title: string; items: Item[]; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-6 lg:py-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-brand">PhonePhotography</Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted lg:mt-1">{title}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {items.map((i) => {
            const on = path === i.href;
            return (
              <Link key={i.href} href={i.href} className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${on ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface"}`}>
                {i.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
