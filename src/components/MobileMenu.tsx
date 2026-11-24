"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SERVICES } from "@/lib/mock";

// Rendered in a portal: the header uses backdrop-blur, which would trap a fixed child inside the 64px header.
// Burger button + full-screen menu sheet (logo + close on top, plain rows, buttons at the bottom).
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);
  const row = "block border-b border-line py-4 text-lg font-medium";

  return (
    <div className="lg:hidden">
      <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-md border border-line">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close menu" onClick={close} className="absolute inset-0 bg-black/50" />
          <div className="absolute right-0 top-0 flex h-full w-3/4 flex-col bg-white shadow-xl" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 shrink-0 items-center justify-end border-b border-line px-4">
            <button type="button" aria-label="Close menu" onClick={close} className="grid h-10 w-10 place-items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          <form action="/search" onSubmit={close} className="shrink-0 px-6 pt-4">
            <div className="flex items-center gap-2 rounded-md border border-line px-3 focus-within:border-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0 text-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input type="search" name="q" placeholder="Search photographers, city, service" aria-label="Search" className="w-full bg-transparent py-3 text-sm outline-none" />
            </div>
          </form>

          <nav className="flex-1 overflow-y-auto px-6 pt-2">
            <Link href="/" onClick={close} className={row}>Home</Link>
            <Link href="/photographers" onClick={close} className={row}>Browse Photographers</Link>

            <button type="button" aria-expanded={services} onClick={() => setServices(!services)} className={`${row} flex w-full items-center justify-between text-left`}>
              Browse Services
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition ${services ? "rotate-180" : ""}`} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {services && SERVICES.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} onClick={close} className="block border-b border-line py-3.5 pl-4 text-base text-muted">{s.name}</Link>
            ))}
          </nav>

          <div className="grid shrink-0 gap-3 px-6 pb-6 pt-4">
            <Link href="/photographer/register" onClick={close} className="btn-outline w-full py-3.5 text-base">Become a Photographer</Link>
            <Link href="/photographer/login" onClick={close} className="btn-primary w-full py-3.5 text-base">Login</Link>
          </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
