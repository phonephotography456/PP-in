import { createClient } from "@/lib/supabase/server";
import { limited } from "@/lib/rate-limit";
import { body, email, fail, passwordOk, str } from "@/lib/validate";

// Public registration. role: "photographer" | "customer" only; anything else is a customer.
// The role is stamped into app_metadata by the assign_default_role DB trigger.
export async function POST(req: Request) {
  const b = await body(req);
  const addr = email(b.email);
  const photographer = b.role === "photographer";
  const name = str(b.name, 150);
  if (!addr || !passwordOk(b.password)) return fail("Enter a valid email and a password of 8-72 characters.");
  if (!name) return fail(photographer ? "Business name is required." : "Name is required.");

  const rl = limited(req, "register", addr);
  if (rl) return rl;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: addr,
    password: b.password,
    options: {
      data: photographer
        ? { signup_role: "photographer", business_name: name, phone: str(b.phone, 20) }
        : { full_name: name },
    },
  });
  if (error?.status === 429) return fail("Too many attempts. Please try again later.", 429);
  if (error && error.code !== "user_already_exists") return fail("Could not register. Please try again.");
  // Same response whether or not the email already exists (no account enumeration).
  return Response.json({ ok: true, message: "Check your email for a 6-digit verification code." });
}
