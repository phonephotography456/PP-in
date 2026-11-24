// Secure admin provisioning. Server-side only; there is no public admin signup.
// Usage:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' node --env-file=.env.local scripts/create-admin.mjs
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!email || !password || password.length < 12) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) are required");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
  app_metadata: { role: "admin" }, // app_metadata is not user-editable
});
if (error) throw error;
console.log(`Admin created: ${data.user.email} (${data.user.id})`);
