// End-to-end auth tests against a running dev server + local Supabase (mailpit for OTP).
// Run: node --env-file=.env.local scripts/test-auth.mjs
import postgres from "postgres";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAIL = "http://127.0.0.1:54324/api/v1";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

let pass = 0, failN = 0;
const check = (name, ok, extra = "") => {
  ok ? pass++ : failN++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
};

// Minimal cookie jar
class Client {
  jar = new Map();
  ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`; // own rate-limit bucket per client
  async req(path, { method = "GET", json } = {}) {
    const res = await fetch(APP + path, {
      method,
      redirect: "manual",
      headers: { "Content-Type": "application/json", "x-forwarded-for": this.ip, Cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ") },
      body: json ? JSON.stringify(json) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [kv, ...attrs] = c.split(";");
      const i = kv.indexOf("=");
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      /max-age=0|expires=thu, 01 jan 1970/i.test(attrs.join(";")) || v === "" ? this.jar.delete(k) : this.jar.set(k, v);
    }
    let body = null;
    try { body = await res.clone().json(); } catch {}
    return { status: res.status, body, location: res.headers.get("location") };
  }
  post = (p, json) => this.req(p, { method: "POST", json });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function otpFor(email) {
  for (let i = 0; i < 20; i++) {
    const { messages } = await (await fetch(`${MAIL}/messages`)).json();
    const m = messages.find((x) => x.To.some((t) => t.Address === email));
    if (m) {
      const full = await (await fetch(`${MAIL}/message/${m.ID}`)).json();
      await fetch(`${MAIL}/messages`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IDs: [m.ID] }) });
      return full.Text.match(/\b(\d{6})\b/)[1];
    }
    await sleep(500);
  }
  throw new Error("no email for " + email);
}

const run = Date.now();
const P = `photog${run}@example.com`, C = `cust${run}@example.com`, PW = "Passw0rd!long";
const ADMIN = `admin${run}@example.com`, APW = "AdminPassw0rd!long";

// ---------- 1. Photographer registration + OTP ----------
const ph = new Client();
let r = await ph.post("/api/auth/register", { email: P, password: PW, name: "Test Studio", role: "photographer", phone: "9999999999" });
check("photographer register returns ok", r.status === 200 && r.body.ok, JSON.stringify(r));
r = await ph.post("/api/auth/login", { email: P, password: PW, portal: "photographer" });
check("login blocked before OTP verification (403)", r.status === 403, JSON.stringify(r));
r = await ph.post("/api/auth/verify", { email: P, code: "000000" });
check("wrong OTP rejected", r.status === 400, JSON.stringify(r));
const code = await otpFor(P);
r = await ph.post("/api/auth/verify", { email: P, code });
check("correct OTP verifies, role=photographer", r.status === 200 && r.body.role === "photographer", JSON.stringify(r));
const [prof] = await sql`select status, business_name, email, user_id from photographers where email = ${P}`;
check("pending photographer profile created", prof?.status === "pending" && prof.business_name === "Test Studio", JSON.stringify(prof));
const [{ n }] = await sql`select count(*)::int n from photographers where email = ${P}`;
r = await ph.post("/api/auth/login", { email: P, password: PW, portal: "photographer" });
const [{ n: n2 }] = await sql`select count(*)::int n from photographers where email = ${P}`;
check("photographer login ok; profile not duplicated", r.status === 200 && n === 1 && n2 === 1, JSON.stringify(r));
r = await ph.post("/api/auth/login", { email: P, password: "wrong-password" , portal: "photographer" });
check("wrong password rejected (401)", r.status === 401);
r = await new Client().post("/api/auth/register", { email: P, password: PW, name: "x", role: "photographer" });
check("duplicate registration gives same generic answer", r.status === 200, JSON.stringify(r));

// ---------- 2. Customer registration + login ----------
const cu = new Client();
r = await cu.post("/api/auth/register", { email: C, password: PW, name: "Cust One", role: "customer" });
check("customer register ok", r.status === 200);
r = await cu.post("/api/auth/verify", { email: C, code: await otpFor(C) });
check("customer OTP verify, role=customer", r.status === 200 && r.body.role === "customer", JSON.stringify(r));
const [{ n: cphotos }] = await sql`select count(*)::int n from photographers where email = ${C}`;
check("customer gets NO photographer profile", cphotos === 0);
cu.jar.clear();
r = await cu.post("/api/auth/login", { email: C, password: PW, portal: "customer" });
check("customer login ok", r.status === 200 && r.body.role === "customer", JSON.stringify(r));
r = await new Client().post("/api/auth/login", { email: C, password: PW, portal: "photographer" });
check("customer cannot log in via photographer portal", r.status === 401, JSON.stringify(r));

// ---------- 3. Password reset ----------
const rs = new Client();
r = await rs.post("/api/auth/forgot-password", { email: P });
const r2 = await rs.post("/api/auth/forgot-password", { email: `nobody${run}@example.com` });
check("forgot-password identical for known/unknown email", r.status === 200 && r2.status === 200 && r.body.message === r2.body.message);
const rcode = await otpFor(P);
r = await rs.post("/api/auth/reset-password", { email: P, code: "123456", password: "NewPassw0rd!long" });
check("reset with bad code rejected", r.status === 400);
r = await rs.post("/api/auth/reset-password", { email: P, code: rcode, password: "short" });
check("reset with weak password rejected", r.status === 400);
r = await rs.post("/api/auth/reset-password", { email: P, code: rcode, password: "NewPassw0rd!long" });
check("reset with valid code succeeds", r.status === 200, JSON.stringify(r));
r = await rs.post("/api/auth/reset-password", { email: P, code: rcode, password: "Another0ne!long" });
check("reset code is single-use", r.status === 400);
check("old password no longer works", (await new Client().post("/api/auth/login", { email: P, password: PW, portal: "photographer" })).status === 401);
const phNew = new Client();
check("new password works", (await phNew.post("/api/auth/login", { email: P, password: "NewPassw0rd!long", portal: "photographer" })).status === 200);

// ---------- 4. Admin provisioning (script only) + portal ----------
const { execFileSync } = await import("node:child_process");
execFileSync("node", ["--env-file=.env.local", "scripts/create-admin.mjs"], { env: { ...process.env, ADMIN_EMAIL: ADMIN, ADMIN_PASSWORD: APW }, stdio: "pipe" });
const ad = new Client();
r = await ad.post("/api/auth/login", { email: ADMIN, password: APW, portal: "admin" });
check("provisioned admin logs in", r.status === 200 && r.body.role === "admin", JSON.stringify(r));
r = await new Client().post("/api/auth/register", { email: `evil${run}@example.com`, password: PW, name: "x", role: "admin" });
const evil = new Client();
r = await evil.post("/api/auth/verify", { email: `evil${run}@example.com`, code: await otpFor(`evil${run}@example.com`) });
check("register with role=admin yields customer, not admin", r.body?.role === "customer", JSON.stringify(r));
const sneaky = new Client();
await sneaky.post("/api/auth/register", { email: `sneak${run}@example.com`, password: PW, name: "x", role: "customer", app_metadata: { role: "admin" }, signup_role: "admin" });
r = await sneaky.post("/api/auth/verify", { email: `sneak${run}@example.com`, code: await otpFor(`sneak${run}@example.com`) });
check("extra app_metadata/role fields ignored at register", r.body?.role === "customer", JSON.stringify(r));

// ---------- 5. Route protection ----------
const anon = new Client();
for (const [p, loc] of [["/admin/dashboard", "/login"], ["/photographer/dashboard", "/photographer/login"], ["/photographer/profile", "/photographer/login"]]) {
  r = await anon.req(p);
  check(`anon ${p} -> redirect ${loc}`, [302, 307, 308].includes(r.status) && r.location?.endsWith(loc), JSON.stringify(r));
}
r = await phNew.req("/photographer/dashboard");
check("photographer can open /photographer/dashboard", r.status === 200, JSON.stringify(r));
r = await phNew.req("/admin/dashboard");
check("photographer blocked from /admin (redirect to own home)", [302, 307].includes(r.status) && r.location?.endsWith("/photographer/dashboard"), JSON.stringify(r));
r = await cu.req("/photographer/dashboard");
check("customer blocked from /photographer", [302, 307].includes(r.status) && r.location?.endsWith("/"), JSON.stringify(r));
r = await cu.req("/admin/dashboard");
check("customer blocked from /admin", [302, 307].includes(r.status), JSON.stringify(r));
r = await ad.req("/admin/dashboard");
check("admin can open /admin/dashboard", r.status === 200, JSON.stringify(r));
r = await ad.req("/photographer/dashboard");
check("admin blocked from /photographer", [302, 307].includes(r.status), JSON.stringify(r));
r = await ad.req("/photographer/login");
check("public auth page reachable", r.status === 200);
await phNew.post("/api/auth/logout");
r = await phNew.req("/photographer/dashboard");
check("after logout, panel redirects to login", [302, 307].includes(r.status));

// ---------- 6. Privilege escalation attempts (direct Supabase API with user JWT) ----------
async function tokenFor(email, password) {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return (await res.json()).access_token;
}
const hdr = (t) => ({ apikey: ANON, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation" });

const custTok = await tokenFor(C, PW);
let res = await fetch(`${API}/auth/v1/user`, { method: "PUT", headers: hdr(custTok), body: JSON.stringify({ data: { role: "admin", signup_role: "admin" } }) });
const afterMeta = await res.json();
const custTok2 = await tokenFor(C, PW);
const payload = JSON.parse(Buffer.from(custTok2.split(".")[1], "base64url"));
check("customer self-edit of user_metadata.role does NOT change app_metadata role", payload.app_metadata.role === "customer", JSON.stringify(payload.app_metadata));
res = await fetch(`${API}/rest/v1/photographers?select=id&status=eq.pending`, { headers: hdr(custTok2) });
const seen = await res.json();
check("customer w/ forged user_metadata.role=admin is NOT admin in RLS (cannot read pending profiles)", Array.isArray(seen) && seen.length === 0, JSON.stringify(seen).slice(0, 200));
res = await fetch(`${API}/auth/v1/user`, { method: "PUT", headers: hdr(custTok2), body: JSON.stringify({ app_metadata: { role: "admin" } }) });
const tok3 = await tokenFor(C, PW);
check("customer cannot set app_metadata via user API", JSON.parse(Buffer.from(tok3.split(".")[1], "base64url")).app_metadata.role === "customer");

const phTok = await tokenFor(P, "NewPassw0rd!long");
res = await fetch(`${API}/rest/v1/photographers?user_id=eq.${prof.user_id}`, { method: "PATCH", headers: hdr(phTok), body: JSON.stringify({ status: "approved" }) });
const pr = await res.json();
check("photographer cannot self-approve (status)", res.status >= 400, res.status + JSON.stringify(pr));
res = await fetch(`${API}/rest/v1/photographers?user_id=eq.${prof.user_id}`, { method: "PATCH", headers: hdr(phTok), body: JSON.stringify({ about: "hello" }) });
check("photographer can still edit own non-privileged fields", res.status === 200, res.status + "");
res = await fetch(`${API}/rest/v1/photographers`, { method: "POST", headers: hdr(custTok2), body: JSON.stringify({ user_id: payload.sub, business_name: "Fake", slug: "fake-" + run }) });
check("customer cannot insert photographer profile", res.status >= 400, res.status + "");
res = await fetch(`${API}/rest/v1/photographers`, { method: "POST", headers: hdr(phTok), body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000001", business_name: "Fake2", slug: "fake2-" + run }) });
check("photographer cannot insert profile for another user", res.status >= 400, res.status + "");
const adTok = await tokenFor(ADMIN, APW);
res = await fetch(`${API}/rest/v1/photographers?user_id=eq.${prof.user_id}`, { method: "PATCH", headers: hdr(adTok), body: JSON.stringify({ status: "approved" }) });
check("admin CAN approve photographer (RLS admin policy)", res.status === 200, res.status + "");

// ---------- 7. Rate limits ----------
const rl = new Client();
const target = `ratelimit${run}@example.com`;
const codes = [];
for (let i = 0; i < 7; i++) codes.push((await rl.post("/api/auth/login", { email: target, password: "bad-password-x", portal: "customer" })).status);
check("login rate limit: 429 after 5 attempts/email", codes.slice(0, 5).every((c) => c === 401) && codes.slice(5).every((c) => c === 429), codes.join(","));
const vcodes = [];
for (let i = 0; i < 7; i++) vcodes.push((await rl.post("/api/auth/verify", { email: target, code: "111111" })).status);
check("OTP verify rate limit: 429 after 5 attempts/email", vcodes[5] === 429, vcodes.join(","));
const fcodes = [];
for (let i = 0; i < 5; i++) fcodes.push((await rl.post("/api/auth/forgot-password", { email: target })).status);
check("forgot-password rate limit: 429 after 3/hour/email", fcodes[3] === 429, fcodes.join(","));
const gcodes = [];
for (let i = 0; i < 5; i++) gcodes.push((await rl.post("/api/auth/register", { email: `rl2${run}@example.com`, password: PW, name: "x" })).status);
check("registration rate limit: 429 after 3/hour/email", gcodes[3] === 429, gcodes.join(","));
r = await rl.req("/api/auth/login", { method: "POST", json: { email: target, password: "x".repeat(10), portal: "customer" } });

// ---------- cleanup ----------
await sql`delete from photographers where email = ${P}`.catch(() => {});
await sql.end();
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
