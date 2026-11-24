"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Photo } from "./Photo";

type Img = { url: string; alt: string | null };

const arrow = "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-canvas/90 text-xl text-ink hover:bg-canvas sm:h-12 sm:w-12";

/** Thumbnail grid. Clicking a photo opens a full-screen viewer with left/right arrows (also keyboard and swipe). */
export function PhotoGallery({ images, title }: { images: Img[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + count) % count)), [count]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);

  const current = open === null ? null : images[open];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((i, n) => (
          <button key={i.url} type="button" onClick={() => setOpen(n)} aria-label={`Open photo ${n + 1} of ${count}`} className="block cursor-zoom-in text-left">
            <Photo src={i.url} alt={i.alt || `${title} photo`} className="aspect-square rounded-2xl transition hover:opacity-90" />
          </button>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photo viewer`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <button type="button" onClick={() => setOpen(null)} aria-label="Close" className={`${arrow} !top-4 right-4 translate-y-0 text-base`}>✕</button>
          {count > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" className={`${arrow} left-3 sm:left-6`}>‹</button>}
          <div className="relative h-[85vh] w-[92vw] max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image key={current.url} src={current.url} alt={current.alt || `${title} photo`} fill unoptimized sizes="92vw" className="object-contain" />
          </div>
          {count > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" className={`${arrow} right-3 sm:right-6`}>›</button>}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">{(open ?? 0) + 1} / {count}</p>
        </div>
      )}
    </>
  );
}
