"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export type Portal = "photographer" | "customer" | "admin";
type Mode = "login" | "register" | "verify" | "forgot" | "reset";

const BASE: Record<Portal, string> = { photographer: "/photographer", customer: "/reviewer", admin: "" };

const COPY: Record<Mode, { title: string; submit: string; endpoint: string }> = {
  login: { title: "Log in", submit: "Log in", endpoint: "login" },
  register: { title: "Create account", submit: "Register", endpoint: "register" },
  verify: { title: "Verify your email", submit: "Verify", endpoint: "verify" },
  forgot: { title: "Forgot password", submit: "Send reset code", endpoint: "forgot-password" },
  reset: { title: "Reset password", submit: "Set new password", endpoint: "reset-password" },
};

// Minimal auth form shared by every portal. Posts JSON to /api/auth/*.
export function AuthForm({ mode, portal }: { mode: Mode; portal: Portal }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = BASE[portal];
  // Customers sent here from a service page return to it afterwards. Same-site paths only.
  const rawNext = params.get("next") ?? "";
  const next = portal === "customer" && /^\/(?![/\\])/.test(rawNext) ? rawNext : "";
  const q = next ? `&next=${encodeURIComponent(next)}` : "";
  const c = COPY[mode];
  const needsCode = mode === "verify" || mode === "reset";
  const needsPassword = mode === "login" || mode === "register" || mode === "reset";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${c.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, portal, role: portal === "photographer" ? "photographer" : "customer" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Something went wrong.");
    const email = encodeURIComponent(String(data.email ?? ""));
    if (mode === "login" || mode === "verify") return router.replace(next || (json.redirect ?? "/"));
    if (mode === "register") return router.push(`${base}/verify?email=${email}${q}`);
    if (mode === "forgot") return router.push(`${base}/reset-password?email=${email}`);
    router.push(`${base}/login`);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-extrabold">{c.title}</h1>
      <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <input name="name" required maxLength={150} className="input" aria-label="Name"
            placeholder={portal === "photographer" ? "Business name" : "Your name"} />
        )}
        {mode === "register" && portal === "photographer" && (
          <input name="phone" maxLength={20} className="input" aria-label="Phone" placeholder="Phone (optional)" />
        )}
        <input name="email" type="email" required className="input" aria-label="Email" placeholder="Email"
            defaultValue={params.get("email") ?? ""} autoComplete="email" />
        {needsCode && (
          <input name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} className="input"
            aria-label="6-digit code" placeholder="6-digit code" autoComplete="one-time-code" />
        )}
        {needsPassword && (
          <input name="password" type="password" required minLength={8} maxLength={72} className="input"
            aria-label="Password" placeholder={mode === "reset" ? "New password (min 8)" : "Password (min 8)"}
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        )}
        {error && <p role="alert" className="text-sm font-semibold text-brand">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "Please wait…" : c.submit}</button>
      </form>
      <p className="mt-6 space-x-4 text-sm">
        {mode === "login" && portal !== "admin" && (
          <>
            <Link href={`${base}/register${q.replace("&", "?")}`} className="underline">Create account</Link>
            <Link href={`${base}/forgot-password`} className="underline">Forgot password?</Link>
          </>
        )}
        {mode !== "login" && <Link href={`${base}/login${q.replace("&", "?")}`} className="underline">Back to log in</Link>}
      </p>
    </main>
  );
}
