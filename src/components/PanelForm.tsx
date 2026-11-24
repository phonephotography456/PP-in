"use client";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { Result } from "@/app/photographer/(panel)/actions";

type Action = (prev: Result, fd: FormData) => Promise<Result>;

/**
 * Like AdminForm, but submits via onSubmit so React does not reset the fields after the action:
 * a validation error keeps what the photographer typed. Native `required`/type checks still run first.
 */
export function PanelForm({ action, children, submit, className = "grid gap-4", submitClass = "btn-primary", clearOnSuccess = false, onSuccess, busy = false }: {
  action: Action; children: ReactNode; submit: string; className?: string; submitClass?: string; clearOnSuccess?: boolean;
  /** Runs once after each successful save (client wrappers only). */
  onSuccess?: (result: NonNullable<Result>) => void | Promise<void>; busy?: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (clearOnSuccess && result?.ok) ref.current?.reset(); }, [clearOnSuccess, result]);
  const done = useRef<Result>(null);
  useEffect(() => { if (result?.ok && done.current !== result) { done.current = result; void onSuccess?.(result); } }, [result, onSuccess]);
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
        <button type="submit" disabled={pending || busy} className={`${submitClass} disabled:opacity-60`}>{pending || busy ? "Saving…" : submit}</button>
        {result?.error && <p role="alert" className="mt-1 text-xs font-semibold text-danger-strong">{result.error}</p>}
        {result?.ok && <p role="status" className="mt-1 text-xs text-success">{result.ok}</p>}
      </div>
    </form>
  );
}
