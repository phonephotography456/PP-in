// Review workflow end-to-end in a real browser against a running app (npm run build && npm start).
// Uses the first approved photographer service with published packages and no approved reviews.
// Creates temporary customer/admin users and deletes them (and their reviews) at the end.
//   PW_DIR=<path to playwright-core> node scripts/test-reviews-browser.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const { chromium } = createRequire(import.meta.url)(process.env.PW_DIR ?? "playwright-core");
const APP = process.env.APP_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_SUPABASE_URL, SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOTS = process.env.SHOTS_DIR;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const hdr = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
const CONFIRMATION = "Your review has been submitted successfully and is awaiting admin approval. It will appear publicly once approved.";
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !extra ? "" : "  -> " + extra}`); if (!ok) failed++; };

const tag = Date.now();
const password = "Review-Test-123";
const users = [];
const mkUser = async (role, name) => {
  const u = await (await fetch(`${API}/auth/v1/admin/users`, { method: "POST", headers: hdr, body: JSON.stringify({ email: `rv-${role}-${users.length}-${tag}@example.test`, password, email_confirm: true, app_metadata: { role }, user_metadata: { full_name: name } }) })).json();
  users.push(u);
  return u;
};

const [target] = await sql`select ph.slug, s.slug svc, s.name from photographers ph join packages pk on pk.photographer_id = ph.id join services s on s.id = pk.service_id
  where ph.status = 'approved' and pk.status = 'published'
    and not exists (select 1 from service_reviews r where r.photographer_id = ph.id and r.service_id = s.id and r.status = 'approved')
  group by ph.slug, s.slug, s.name having count(*) >= 2 limit 1`;
if (!target) { console.error("No approved photographer service with 2+ published packages and no approved reviews."); process.exit(1); }
const PAGE = `/photographers/p/${target.slug}?service=${target.svc}`;

const browser = await chromium.launch();
const newCtx = (n, opts = {}) => browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.9.${tag % 250}.${n}` }, ...opts });
/** Waits for the element (streamed sections arrive after `load`). */
const shows = (loc) => loc.first().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
const login = async (ctx, u, portal) => (await ctx.request.post(APP + "/api/auth/login", { data: { email: u.email, password, portal } })).ok();

try {
  const custA = await mkUser("customer", "Alice Reviewer");
  const custB = await mkUser("customer", "Bob Reviewer");
  const admin = await mkUser("admin", "Review Admin");

  // ---- anonymous visitor: empty state, sign-in prompt ----
  const anon = await newCtx(1);
  const ap = await anon.newPage();
  await ap.goto(APP + PAGE, { waitUntil: "load" });
  check("empty state shown with no approved reviews", await shows(ap.getByText("No reviews yet. Be the first to review this service.")));
  await ap.getByRole("button", { name: "Write a review" }).click();
  check("anonymous visitor is asked to sign in", await shows(ap.getByRole("dialog", { name: "Sign in to write a review" })));

  // ---- customer A: server-side rating validation, then submit with rating only ----
  const ca = await newCtx(2);
  check("customer A logs in", await login(ca, custA, "customer"));
  const pa = await ca.newPage();
  await pa.goto(APP + PAGE, { waitUntil: "load" });
  await pa.getByRole("button", { name: "Write a review" }).click();
  const dlg = pa.getByRole("dialog", { name: "Write a review" });
  await dlg.locator("select[name=packageId]").selectOption({ index: 1 });
  // Bypass the browser's `required` check so the server action's validation is what answers.
  await dlg.locator("input[name=rating]").evaluateAll((els) => els.forEach((e) => e.removeAttribute("required")));
  await dlg.getByRole("button", { name: "Submit review" }).click();
  await dlg.getByRole("alert").waitFor();
  check("server rejects a review without rating", (await dlg.getByRole("alert").textContent()) === "Choose a rating from 1 to 5 stars.");
  check("chosen package kept after server error", (await dlg.locator("select[name=packageId]").inputValue()) !== "");
  await dlg.locator("label", { hasText: "4 stars" }).click();
  await dlg.getByRole("button", { name: "Submit review" }).click();
  await dlg.getByRole("status").waitFor();
  check("confirmation message shown (title + text left empty)", (await dlg.getByRole("status").textContent()) === CONFIRMATION);
  const [rowA] = await sql`select status, title, review_text, rating, reviewer_name from service_reviews where reviewer_user_id = ${custA.id}`;
  check("stored as pending with null title/text", rowA?.status === "pending" && rowA.title === null && rowA.review_text === null && rowA.rating === 4, JSON.stringify(rowA));

  await pa.goto(APP + PAGE, { waitUntil: "load" });
  check("customer does not see own pending review as published", await shows(pa.getByText("No reviews yet. Be the first to review this service.")));
  await pa.getByRole("button", { name: "Write a review" }).click();
  check("customer sees own review marked Pending", await shows(pa.getByRole("dialog", { name: "Write a review" }).getByText(/Pending/i).first()));
  await pa.screenshot({ path: SHOTS ? `${SHOTS}/customer-pending.png` : undefined });

  // ---- customer B: review with title + text (to be rejected) ----
  const cb = await newCtx(3);
  check("customer B logs in", await login(cb, custB, "customer"));
  const pb = await cb.newPage();
  await pb.goto(APP + PAGE, { waitUntil: "load" });
  await pb.getByRole("button", { name: "Write a review" }).click();
  const dlgB = pb.getByRole("dialog", { name: "Write a review" });
  await dlgB.locator("select[name=packageId]").selectOption({ index: 2 });
  await dlgB.locator("label", { hasText: "2 stars" }).click();
  await dlgB.locator("input[name=title]").fill(`Rejected title ${tag}`);
  await dlgB.locator("textarea[name=text]").fill("Rejected body text");
  await dlgB.getByRole("button", { name: "Submit review" }).click();
  await dlgB.getByRole("status").waitFor();
  check("customer B submission confirmed", (await dlgB.getByRole("status").textContent()) === CONFIRMATION);

  // ---- non-admins cannot reach moderation ----
  const anonAdmin = await ap.goto(APP + "/admin/photographers?tab=reviews", { waitUntil: "load" });
  check("anonymous visitor cannot open admin reviews", !ap.url().includes("/admin/photographers"), ap.url() + " " + anonAdmin?.status());
  await pa.goto(APP + "/admin/photographers?tab=reviews", { waitUntil: "load" });
  check("customer cannot open admin reviews", !pa.url().includes("/admin/photographers") || !(await pa.getByRole("button", { name: "Approve" }).count()), pa.url());

  // ---- admin: moderation queue shows details; approve A, reject B ----
  const cad = await newCtx(4);
  check("admin logs in", await login(cad, admin, "admin"));
  const pd = await cad.newPage();
  await pd.goto(APP + "/admin/photographers?tab=reviews&rstatus=pending", { waitUntil: "load" });
  const cardA = pd.locator(".card", { hasText: custA.email });
  const cardB = pd.locator(".card", { hasText: custB.email });
  const textA = (await cardA.textContent()) ?? "";
  check("pending queue shows customer A review with photographer, service, package", textA.includes("Alice Reviewer") && textA.includes(target.name) && textA.includes("Basic package") && textA.includes("No written review."), textA);
  check("pending queue shows rating", (await cardA.locator("[aria-label='4 out of 5']").count()) === 1);
  const textB = (await cardB.textContent()) ?? "";
  check("pending queue shows customer B title + description", textB.includes(`Rejected title ${tag}`) && textB.includes("Rejected body text"), textB);
  check("status badge shows Pending", /pending/i.test(textA));
  await pd.screenshot({ path: SHOTS ? `${SHOTS}/admin-pending.png` : undefined, fullPage: true });

  await cardA.getByRole("button", { name: "Approve" }).click();
  await pd.waitForLoadState("load");
  await pd.waitForFunction((e) => ![...document.querySelectorAll(".card")].some((c) => c.textContent.includes(e)), custA.email);
  await cardB.getByRole("button", { name: "Reject" }).click();
  await pd.waitForFunction((e) => ![...document.querySelectorAll(".card")].some((c) => c.textContent.includes(e)), custB.email);
  const st = await sql`select reviewer_user_id, status, reviewed_by from service_reviews where reviewer_user_id in (${custA.id}, ${custB.id})`;
  const by = Object.fromEntries(st.map((r) => [r.reviewer_user_id, r]));
  check("DB: A approved, B rejected, reviewed_by = admin", by[custA.id]?.status === "approved" && by[custB.id]?.status === "rejected" && by[custA.id].reviewed_by === admin.id, JSON.stringify(st));

  await pd.goto(APP + "/admin/photographers?tab=reviews&rstatus=approved", { waitUntil: "load" });
  check("approved filter lists A, not B", (await pd.locator(".card", { hasText: custA.email }).count()) === 1 && (await pd.locator(".card", { hasText: custB.email }).count()) === 0);
  await pd.goto(APP + "/admin/photographers?tab=reviews&rstatus=rejected", { waitUntil: "load" });
  check("rejected filter lists B, not A", (await pd.locator(".card", { hasText: custB.email }).count()) === 1 && (await pd.locator(".card", { hasText: custA.email }).count()) === 0);
  check("rejected card offers Approve, not Reject", (await pd.locator(".card", { hasText: custB.email }).getByRole("button", { name: "Reject" }).count()) === 0);

  // ---- public page: approved only, count + average from approved only ----
  await ap.goto(APP + PAGE, { waitUntil: "load" });
  const body = (await ap.locator("body").textContent()) ?? "";
  check("public shows approved review by name", body.includes("Alice Reviewer"));
  check("public hides rejected review", !body.includes(`Rejected title ${tag}`) && !body.includes("Bob Reviewer"));
  check("average 4.0 from approved only", body.includes("4.0"));
  check("count shows (1 review)", body.includes("(1 review)"));

  // ---- responsive: no horizontal overflow ----
  for (const [w, h] of [[375, 812], [768, 1024], [1280, 900]]) {
    for (const [pg, path, name] of [[ap, PAGE, "public"], [pd, "/admin/photographers?tab=reviews&rstatus=all", "admin"]]) {
      await pg.setViewportSize({ width: w, height: h });
      await pg.goto(APP + path, { waitUntil: "load" });
      const over = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${name} reviews at ${w}px: no horizontal overflow`, over <= 0, `overflow ${over}px`);
      if (SHOTS) {
        if (name === "public") await pg.locator("section[aria-labelledby^=reviews-]").screenshot({ path: `${SHOTS}/${name}-${w}.png` });
        else await pg.screenshot({ path: `${SHOTS}/${name}-${w}.png`, fullPage: true });
      }
    }
  }
  await ap.setViewportSize({ width: 375, height: 812 });
  await pa.setViewportSize({ width: 375, height: 812 });
  await pa.goto(APP + PAGE, { waitUntil: "load" });
  await pa.getByRole("button", { name: "Write a review" }).click();
  const dlgBox = await pa.getByRole("dialog", { name: "Write a review" }).boundingBox();
  check("review dialog fits 375px viewport", !!dlgBox && dlgBox.x >= 0 && dlgBox.x + dlgBox.width <= 375, JSON.stringify(dlgBox));
  if (SHOTS) await pa.screenshot({ path: `${SHOTS}/dialog-375.png` });

  // ---- admin un-publishes the approved review through the UI: public page drops it at once (cache invalidated) ----
  await pd.goto(APP + "/admin/photographers?tab=reviews&rstatus=approved", { waitUntil: "load" });
  await pd.locator(".card", { hasText: custA.email }).getByRole("button", { name: "Reject" }).click();
  await pd.waitForFunction((e) => ![...document.querySelectorAll(".card")].some((c) => c.textContent.includes(e)), custA.email);
  await ap.goto(APP + PAGE, { waitUntil: "load" });
  check("rejecting an approved review removes it publicly; empty state returns", await shows(ap.getByText("No reviews yet. Be the first to review this service.")));
} catch (e) {
  console.error(e);
  failed++;
} finally {
  await browser.close();
  const ids = users.map((u) => u.id).filter(Boolean);
  if (ids.length) await sql`delete from service_reviews where reviewer_user_id in ${sql(ids)}`;
  for (const u of users) if (u.id) await fetch(`${API}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: hdr });
  await sql.end();
}
if (SHOTS && !fs.existsSync(SHOTS)) console.log("(screenshots dir missing)");
console.log(failed ? `\n${failed} FAILED` : "\nAll browser checks passed (test users and their reviews deleted).");
process.exit(failed ? 1 : 0);
