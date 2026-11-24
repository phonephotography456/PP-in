import type { Level } from "@/lib/format";

// Basic = bronze medal, Standard = silver medal, Premium = gold crown.
const MEDAL = {
  basic: { ribbon: "var(--color-medal-bronze-ribbon)", face: "var(--color-medal-bronze-face)", ring: "var(--color-medal-bronze-ring)" },
  standard: { ribbon: "var(--color-medal-silver-ribbon)", face: "var(--color-medal-silver-face)", ring: "var(--color-medal-silver-ring)" },
} as const;

export function LevelIcon({ level, size = 20 }: { level: Level; size?: number }) {
  if (level === "premium") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path d="M2.5 7.5 7.5 12 12 4.5 16.5 12l5-4.5-2 11.5h-15z" fill="var(--color-medal-gold-face)" stroke="var(--color-medal-gold-ring)" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="5" y="17.2" width="14" height="2" rx="1" fill="var(--color-medal-gold-ring)" />
        <circle cx="2.5" cy="7.5" r="1.4" fill="var(--color-medal-gold-gem)" /><circle cx="12" cy="4.5" r="1.4" fill="var(--color-medal-gold-gem)" /><circle cx="21.5" cy="7.5" r="1.4" fill="var(--color-medal-gold-gem)" />
      </svg>
    );
  }
  const c = MEDAL[level];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M6.5 1.5h4.2l2 6.5H8.5z" fill={c.ribbon} />
      <path d="M17.5 1.5h-4.2l-2 6.5h4.2z" fill={c.ribbon} opacity=".8" />
      <circle cx="12" cy="15" r="7" fill={c.face} stroke={c.ring} strokeWidth="1.5" />
      <path d="m12 11 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill={c.ring} />
    </svg>
  );
}
