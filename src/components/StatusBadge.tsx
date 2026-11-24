const TONES: Record<string, string> = {
  Approved: "status-success",
  Published: "status-success",
  Active: "status-success",
  Pending: "status-warning",
  "Pending review": "status-warning",
  Draft: "status-neutral",
  Rejected: "status-danger",
  Inactive: "status-neutral",
};

/** Accepts display labels ("Approved") or raw enum values ("pending_review"). */
export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return <span className={`status ${TONES[label] ?? TONES.Draft}`}>{label}</span>;
}
