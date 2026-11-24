"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
type Svc = { slug: string; name: string };

// "Services" nav item with a dropdown listing every service.
export function ServicesMenu({ services }: { services: Svc[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-brand">
        Services
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition ${open ? "rotate-180" : ""}`} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-3 w-52 overflow-hidden menu-panel">
          {services.map((s) => (
            <Link key={s.slug} role="menuitem" href={`/services/${s.slug}`} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm font-medium hover:bg-surface">{s.name}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
