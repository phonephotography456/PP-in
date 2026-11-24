"use client";
import { useActionState, type ReactNode } from "react";
import type { Result } from "@/app/admin/actions";

type Action = (prev: Result, fd: FormData) => Promise<Result>;

function Message({ r }: { r: Result }) {
  if (!r) return null;
  return r.error
    ? <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{r.error}</p>
    : <p role="status" className="mt-1 text-xs text-green-700">{r.ok}</p>;
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

const VARIANT = { primary: "btn-primary btn-sm", outline: "btn-outline btn-sm", danger: "btn-outline btn-sm text-red-600" } as const;

/** One-click mutation button (approve, reject, delete…) with hidden fields. */
export function Act({ action, fields, label, variant = "outline", confirm }: {
  action: Action; fields: Record<string, string>; label: string; variant?: keyof typeof VARIANT; confirm?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline-block">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} className={`${VARIANT[variant]} disabled:opacity-60`}>{label}</button>
      {result?.error && <p role="alert" className="mt-1 max-w-48 text-xs font-semibold text-red-600">{result.error}</p>}
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
