"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Black "Login" button with a dropdown: Photographer Login / User Login.
export function LoginMenu() {
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

  const item = "block px-4 py-2.5 text-sm font-medium hover:bg-surface";

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="btn-primary btn-sm gap-1.5">
        Login
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition ${open ? "rotate-180" : ""}`} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-md border border-line bg-white py-1 shadow-lg">
          <Link role="menuitem" href="/photographer/login" onClick={() => setOpen(false)} className={item}>Photographer Login</Link>
          <Link role="menuitem" href="/reviewer/login" onClick={() => setOpen(false)} className={`${item} border-t border-line`}>User Login</Link>
        </div>
      )}
    </div>
  );
}
