export function VerifiedSeal({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0 text-[#1d78f2]" role="img" aria-label="Verified photographer">
      <path d="m12 1.5 2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1z" fill="currentColor" />
      <path d="m8 12.2 2.8 2.8L16.2 9.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Verified seal + rating + review count, shown next to a photographer's name.
// Only approved photographers are public, so every listed photographer is verified.
export function VerifiedRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 align-middle text-sm font-medium">
      <span className="inline-flex items-center gap-1 text-[#1d78f2]" title="Verified photographer">
        <VerifiedSeal />
        <span className="text-xs font-semibold">Verified</span>
      </span>
      <span className="inline-flex items-center gap-1 text-ink">
        <span aria-hidden className="text-[#f5a623]">★</span>
        <span className="font-semibold">{rating}</span>
        <span className="text-muted">({reviews} reviews)</span>
      </span>
    </span>
  );
}
