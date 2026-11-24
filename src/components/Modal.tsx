"use client";
import { useRef, type ReactNode } from "react";

/** Button that opens a native <dialog> (focus trap, Esc to close, backdrop click to close). */
export function Modal({ label, title, subtitle, children, triggerClass = "btn-outline btn-sm" }: {
  label: string; title: string; subtitle?: string; children: ReactNode; triggerClass?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog
        ref={ref}
        aria-label={title}
        // Clicking the dimmed backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(640px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden border border-ink bg-canvas p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-bold leading-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <button type="button" aria-label="Close" onClick={() => ref.current?.close()} className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center text-muted hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
      </dialog>
    </>
  );
}
