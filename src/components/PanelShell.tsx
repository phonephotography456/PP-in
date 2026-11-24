"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = { href: string; label: string };

// Shared shell for photographer + admin panels: sidebar on desktop, scrolling tabs on mobile.
export function PanelShell({ title, items, logout, children }: { title: string; items: Item[]; logout: () => Promise<void>; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="flex flex-col border-b border-line bg-canvas lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
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
        <form action={logout} className="mt-auto hidden border-t border-line p-3 lg:block">
          <button className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surface"><LogoutIcon />Log out</button>
        </form>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3 sm:px-8">
          <p className="text-sm font-semibold text-muted">{title}</p>
          <form action={logout}><button className="btn-outline btn-sm inline-flex items-center gap-2"><LogoutIcon />Log out</button></form>
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
