"use client";
import { useState } from "react";

// Two-line clamp; "Read more" sits at the end of line 2 (black, underlined).
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const link = "font-semibold text-ink underline";
  return (
    <div className="relative leading-relaxed text-muted">
      <p className={open ? "" : "line-clamp-2"}>
        {text}
        {open && <> <button type="button" onClick={() => setOpen(false)} className={link}>Show less</button></>}
      </p>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={`${link} absolute bottom-0 right-0 bg-white pl-6`}>
          Read more
        </button>
      )}
    </div>
  );
}
