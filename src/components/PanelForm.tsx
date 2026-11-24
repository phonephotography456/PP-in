"use client";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { Result } from "@/app/photographer/(panel)/actions";

type Action = (prev: Result, fd: FormData) => Promise<Result>;

/**
 * Like AdminForm, but submits via onSubmit so React does not reset the fields after the action:
 * a validation error keeps what the photographer typed. Native `required`/type checks still run first.
 */
export function PanelForm({ action, children, submit, className = "grid gap-4", submitClass = "btn-primary", clearOnSuccess = false }: {
  action: Action; children: ReactNode; submit: string; className?: string; submitClass?: string; clearOnSuccess?: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (clearOnSuccess && result?.ok) ref.current?.reset(); }, [clearOnSuccess, result]);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className={className}
    >
      {children}
      <div>
        <button type="submit" disabled={pending} className={`${submitClass} disabled:opacity-60`}>{pending ? "Saving…" : submit}</button>
        {result?.error && <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{result.error}</p>}
        {result?.ok && <p role="status" className="mt-1 text-xs text-green-700">{result.ok}</p>}
      </div>
    </form>
  );
}
