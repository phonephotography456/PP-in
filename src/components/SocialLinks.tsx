// Instagram, YouTube, Website icon links; only the ones the photographer filled in (https URLs, validated on save).
const LINKS = [
  {
    label: "Instagram",
    key: "instagram",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    key: "youtube",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="m10 9 5 3-5 3z" fill="var(--color-on-brand)" />
      </svg>
    ),
  },
  {
    label: "Website",
    key: "website",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
      </svg>
    ),
  },
];

export function SocialLinks({ instagram, youtube, website }: { instagram: string | null; youtube: string | null; website: string | null }) {
  const urls = { instagram, youtube, website };
  const shown = LINKS.filter((l) => urls[l.key as keyof typeof urls]?.startsWith("https://"));
  if (!shown.length) return null;
  return (
    <div className="flex gap-2">
      {shown.map((l) => (
        <a key={l.label} href={urls[l.key as keyof typeof urls]!} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label} className="grid h-10 w-10 place-items-center rounded-xl border border-line transition hover:border-ink">
          {l.icon}
        </a>
      ))}
    </div>
  );
}
