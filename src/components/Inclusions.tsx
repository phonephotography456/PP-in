import type { Pkg } from "@/lib/mock";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS = {
  travel: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...P} aria-hidden><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 11h18M5 16v3M19 16v3" /><circle cx="8" cy="14" r=".8" /><circle cx="16" cy="14" r=".8" /></svg>
  ),
  costume: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...P} aria-hidden><path d="m8 3-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0Z" /></svg>
  ),
  makeup: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...P} aria-hidden><path d="M9 21v-7h6v7zM10 14V9h4v5M10 9l1-6h2l1 6" /></svg>
  ),
  location: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...P} aria-hidden><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
};

// Four small icon cells in one line: Travel & stay (extra?), Costume, Makeup, Location (included?).
export function Inclusions({ pkg }: { pkg: Pkg }) {
  const items = [
    { key: "travel", label: "Travel & stay", status: pkg.travelExtra ? "Extra" : "Included", ok: !pkg.travelExtra },
    { key: "costume", label: "Costume", status: pkg.costume ? "Included" : "Not incl.", ok: pkg.costume },
    { key: "makeup", label: "Makeup", status: pkg.makeup ? "Included" : "Not incl.", ok: pkg.makeup },
    { key: "location", label: "Location", status: pkg.location ? "Included" : "Not incl.", ok: pkg.location },
  ] as const;

  return (
    <ul className="grid grid-cols-4 divide-x divide-line rounded-md border border-line text-center">
      {items.map((i) => (
        <li key={i.key} className={`flex flex-col items-center gap-0.5 px-1 py-2 ${i.ok ? "text-ink" : "text-muted"}`}>
          {ICONS[i.key]}
          <span className="text-[11px] font-semibold leading-tight">{i.label}</span>
          <span className={`text-[10px] leading-tight ${i.ok ? "font-semibold" : "text-price"}`}>{i.status}</span>
        </li>
      ))}
    </ul>
  );
}
