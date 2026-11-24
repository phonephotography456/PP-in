import "server-only";
import { withUser } from "@/db/with-user";
import { requireRole } from "@/lib/auth";

/** Verified admin or redirect. Every admin page query and server action goes through this. */
export const requireAdmin = () => requireRole("admin", "/login");

/** Admin check + transaction as the admin's own JWT, so RLS (is_admin()) is enforced by Postgres too. */
export async function asAdmin<T>(fn: Parameters<typeof withUser<T>>[1]) {
  const admin = await requireAdmin();
  return withUser(admin.id, fn);
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

/** Turns a Postgres error into a message that is safe and useful to show an admin. */
export function dbMessage(e: unknown): string {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err.cause?.code ?? err.code;
  const msg = err.cause?.message ?? err.message ?? "";
  if (code === "23505") return "That name or slug already exists.";
  if (code === "23503") return "This record is still referenced elsewhere. Deactivate it instead.";
  if (code === "42501") return "Not authorized.";
  if (code === "P0001") return msg; // RAISE EXCEPTION from our triggers (e.g. 3-5 package images)
  if (code === "22P02") return "Invalid value.";
  return "Something went wrong. Try again.";
}
