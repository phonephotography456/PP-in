"use client";
import { useEffect, useRef, useState } from "react";

// Two-line clamp. "Read more" sits right after the last word when the text fits, or at the end of line 2 when it is cut off.
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const link = "font-semibold text-ink underline";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);

  return (
    <div className="relative leading-relaxed text-muted">
      <p ref={ref} className={open ? "" : "line-clamp-2"}>
        {text}
        {open && <> <button type="button" onClick={() => setOpen(false)} className={link}>Show less</button></>}
        {!open && <> <button type="button" onClick={() => setOpen(true)} className={link}>Read more</button></>}
      </p>
      {!open && cut && (
        <button type="button" onClick={() => setOpen(true)} className={`${link} absolute bottom-0 right-0 bg-canvas pl-6`}>
          Read more
        </button>
      )}
    </div>
  );
}
