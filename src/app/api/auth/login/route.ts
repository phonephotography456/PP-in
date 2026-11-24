import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, roleOf, type Role } from "@/lib/auth";
import { ensurePhotographerProfile } from "@/lib/photographer-profile";
import { limited } from "@/lib/rate-limit";
import { body, email, fail, str } from "@/lib/validate";

const PORTAL: Record<string, Role> = { photographer: "photographer", customer: "customer", admin: "admin" };

// Each portal (photographer / reviewer / admin) only admits its own role.
export async function POST(req: Request) {
  const b = await body(req);
  const addr = email(b.email);
  const password = str(b.password, 72);
  const portal = PORTAL[str(b.portal, 20)];
  if (!addr || !password || !portal) return fail("Enter your email and password.");

  const rl = limited(req, "login", addr);
  if (rl) return rl;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: addr, password });
  if (error?.code === "email_not_confirmed") return fail("Email not verified. Enter the code we sent you.", 403);
  if (error || !data.user) return fail("Invalid email or password.", 401);

  if (roleOf(data.user) !== portal) {
    await supabase.auth.signOut({ scope: "local" });
    return fail("Invalid email or password.", 401);
  }
  if (portal === "photographer") await ensurePhotographerProfile(data.user);
  return Response.json({ ok: true, role: portal, redirect: ROLE_HOME[portal] });
}
