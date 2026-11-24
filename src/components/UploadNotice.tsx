/** Shown wherever an image upload control would be. Uploads need Cloudflare R2, which is not configured yet. */
export function UploadNotice({ className = "mt-3" }: { className?: string }) {
  return (
    <p role="note" className={`${className} border border-line bg-surface px-3 py-2 text-xs text-muted`}>
      Image upload is not available yet: Cloudflare R2 storage has not been configured for this site.
    </p>
  );
}
