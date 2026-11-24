const TONES: Record<string, string> = {
  Approved: "bg-green-50 text-green-700",
  Published: "bg-green-50 text-green-700",
  Active: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  "Pending review": "bg-amber-50 text-amber-700",
  Draft: "bg-surface text-muted",
  Rejected: "bg-red-50 text-red-700",
  Inactive: "bg-surface text-muted",
};

/** Accepts display labels ("Approved") or raw enum values ("pending_review"). */
export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return <span className={`inline-block rounded-sm px-2.5 py-0.5 text-xs font-semibold ${TONES[label] ?? TONES.Draft}`}>{label}</span>;
}
