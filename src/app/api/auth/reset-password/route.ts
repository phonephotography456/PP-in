import { createClient } from "@/lib/supabase/server";
import { limited } from "@/lib/rate-limit";
import { body, email, fail, otp, passwordOk } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await body(req);
  const addr = email(b.email);
  const code = otp(b.code);
  if (!addr || !code) return fail("Enter your email and the 6-digit code.");
  if (!passwordOk(b.password)) return fail("Password must be 8-72 characters.");

  const rl = limited(req, "reset", addr);
  if (rl) return rl;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: addr, token: code, type: "recovery" });
  if (error) return fail("Invalid or expired code.");

  const { error: upErr } = await supabase.auth.updateUser({ password: b.password });
  await supabase.auth.signOut({ scope: "local" }); // force a fresh login with the new password
  if (upErr) return fail("Could not update password. Choose a different one.");
  return Response.json({ ok: true, message: "Password updated. Please log in." });
}
