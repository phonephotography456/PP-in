"use client";
import { useActionState, useState, type ReactNode } from "react";
import type { Result } from "@/app/admin/actions";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "./ImageUpload";

type Action = (prev: Result, fd: FormData) => Promise<Result>;

function Message({ r }: { r: Result }) {
  if (!r) return null;
  return r.error
    ? <p role="alert" className="mt-1 text-xs font-semibold text-danger-strong">{r.error}</p>
    : <p role="status" className="mt-1 text-xs text-success">{r.ok}</p>;
}

/** Form bound to an admin server action; shows pending state and the action's error/success message. */
export function AdminForm({ action, children, submit, className = "grid gap-4", submitClass = "btn-primary" }: {
  action: Action; children: ReactNode; submit: string; className?: string; submitClass?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <div>
        <button type="submit" disabled={pending} className={`${submitClass} disabled:opacity-60`}>{pending ? "Saving…" : submit}</button>
        <Message r={result} />
      </div>
    </form>
  );
}

/** Image picker for admin forms: uploads the chosen file to /api/admin/uploads and submits the resulting URL as `name`. */
export function AdminImageField({ name, defaultUrl, optional = false, round = false }: { name: string; defaultUrl?: string; optional?: boolean; round?: boolean }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return setError("Only JPEG, PNG or WebP.");
    if (file.size > IMAGE_MAX_BYTES) return setError("Image is larger than 5 MB.");
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) setUrl(data.url);
      else setError(data.error ?? "Upload failed.");
    } catch {
      setError("Network error.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="hidden" name={name} value={url} required />
      {url && (/* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt="Selected" className={round ? "h-14 w-14 rounded-full bg-surface object-cover" : "aspect-[16/10] w-32 rounded-xl bg-surface object-cover"} />
      )}
      <label className="btn-outline btn-sm cursor-pointer">
        {busy ? "Uploading…" : url ? "Replace image" : "Upload image"}
        <input type="file" accept={IMAGE_TYPES.join(",")} disabled={busy} className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      </label>
      {url && optional && <button type="button" onClick={() => setUrl("")} className="btn-outline btn-sm text-danger-strong">Remove</button>}
      <span className="text-xs text-muted">JPEG, PNG or WebP, up to 5 MB.</span>
      {error && <p role="alert" className="w-full text-xs font-semibold text-danger-strong">{error}</p>}
    </div>
  );
}

const VARIANT ={ primary: "btn-primary btn-sm", outline: "btn-outline btn-sm", danger: "btn-outline btn-sm text-danger-strong" } as const;

/** One-click mutation button (approve, reject, delete…) with hidden fields. */
export function Act({ action, fields, label, variant = "outline", confirm }: {
  action: Action; fields: Record<string, string>; label: string; variant?: keyof typeof VARIANT; confirm?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline-block">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} className={`${VARIANT[variant]} disabled:opacity-60`}>{label}</button>
      {result?.error && <p role="alert" className="mt-1 max-w-48 text-xs font-semibold text-danger-strong">{result.error}</p>}
    </form>
  );
}

/** Native disclosure that styles like a button; keeps edit forms off the page until needed. */
export function Disclose({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <details className={className}>
      <summary className="btn-outline btn-sm cursor-pointer list-none">{label}</summary>
      <div className="card mt-2 p-4">{children}</div>
    </details>
  );
}
