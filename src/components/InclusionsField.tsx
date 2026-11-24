"use client";
import { useRef, useState } from "react";

let seq = 0;
const row = (text: string) => ({ id: seq++, text }); // ids only key the rows; they never reach the DOM

/** One input per inclusion line with an ✕ to delete it. Submitted as a single newline-separated `inclusions` value. */
export function InclusionsField({ defaultValue = "" }: { defaultValue?: string }) {
  const [rows, setRows] = useState(() => {
    const lines = defaultValue.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return (lines.length ? lines : [""]).map(row);
  });
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const add = () => {
    const r = row("");
    setRows((cur) => [...cur, r]);
    setTimeout(() => inputs.current[r.id]?.focus(), 0);
  };

  return (
    <div>
      <input type="hidden" name="inclusions" value={rows.map((r) => r.text.trim()).filter(Boolean).join("\n")} />
      <ul className="grid gap-2">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2">
            <input
              ref={(el) => { inputs.current[r.id] = el; }}
              value={r.text}
              maxLength={200}
              placeholder={`Inclusion ${i + 1}, e.g. 2 hours of coverage`}
              aria-label={`Inclusion ${i + 1}`}
              className="input"
              onChange={(e) => setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            />
            <button
              type="button"
              aria-label={`Delete inclusion ${i + 1}`}
              onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((x) => x.id !== r.id) : [{ ...r, text: "" }]))}
              className="grid h-10 w-10 shrink-0 place-items-center border border-line text-muted hover:border-ink hover:text-danger-strong"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={add} className="btn-outline btn-sm mt-2">+ Add line</button>
    </div>
  );
}
