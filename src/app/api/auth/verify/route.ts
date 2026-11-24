import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, roleOf } from "@/lib/auth";
import { ensurePhotographerProfile } from "@/lib/photographer-profile";
import { limited } from "@/lib/rate-limit";
import { body, email, fail, otp } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await body(req);
  const addr = email(b.email);
  const code = otp(b.code);
  if (!addr || !code) return fail("Enter your email and the 6-digit code.");

  const rl = limited(req, "verify", addr);
  if (rl) return rl;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: addr, token: code, type: "email" });
  if (error || !data.user) return fail("Invalid or expired code.");

  const role = roleOf(data.user);
  if (role === "photographer") await ensurePhotographerProfile(data.user);
  // New photographers land on My Profile, where the photo, logo and banner are added.
  const redirect = role === "photographer" ? "/photographer/profile" : role ? ROLE_HOME[role] : "/";
  return Response.json({ ok: true, role, redirect });
}
