import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type Role = "customer" | "photographer" | "admin";

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  photographer: "/photographer/dashboard",
  customer: "/",
};

/** Role lives in app_metadata, which only the service role can write. user_metadata is never trusted. */
export function roleOf(user: User | null | undefined): Role | null {
  const r = user?.app_metadata?.role;
  return r === "admin" || r === "photographer" || r === "customer" ? r : null;
}

/** Verified user (round-trips to Supabase Auth; does not trust the cookie alone). */
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Defense in depth behind proxy.ts: redirect unless the caller has the given role. */
export async function requireRole(role: Role, loginPath: string) {
  const user = await getUser();
  if (!user) redirect(loginPath);
  const actual = roleOf(user);
  if (actual !== role) redirect(actual ? ROLE_HOME[actual] : loginPath);
  return user;
}
