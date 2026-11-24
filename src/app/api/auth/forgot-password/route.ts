import { createClient } from "@/lib/supabase/server";
import { limited } from "@/lib/rate-limit";
import { body, email, fail } from "@/lib/validate";

export async function POST(req: Request) {
  const addr = email((await body(req)).email);
  if (!addr) return fail("Enter a valid email.");

  const rl = limited(req, "forgot", addr);
  if (rl) return rl;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(addr);
  // Always the same answer: never reveal whether the email has an account.
  return Response.json({ ok: true, message: "If that email has an account, a reset code is on its way." });
}
