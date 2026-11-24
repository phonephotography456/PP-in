export function VerifiedSeal({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0 text-verified" role="img" aria-label="Verified photographer">
      <path d="m12 1.5 2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1z" fill="currentColor" />
      <path d="m8 12.2 2.8 2.8L16.2 9.6" fill="none" stroke="var(--color-on-brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Verified" badge next to a photographer's name. Only approved photographers are public.
export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 align-middle text-verified" title="Verified photographer">
      <VerifiedSeal />
      <span className="text-xs font-semibold">Verified</span>
    </span>
  );
}
