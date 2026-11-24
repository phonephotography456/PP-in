// Form-level photographer panel tests: drives the real forms in headless Chrome against a running
// dev server + local Supabase, then removes everything it created.
// Needs playwright-core (not a project dependency):  npm i playwright-core --prefix <dir>
//   PW_DIR=<dir>/node_modules/playwright-core node --env-file=.env.local scripts/test-forms.mjs
// Package/portfolio image rows are inserted by SQL because R2 uploads are not implemented.
import { createRequire } from "node:module";
import postgres from "postgres";

const { chromium } = createRequire(import.meta.url)(process.env.PW_DIR ?? "playwright-core");
const APP = process.env.APP_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_SUPABASE_URL, SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const results = [];
let last = "";
const check = (name, ok, extra = last) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`); };
const hdr = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

const tag = Date.now();
const email = `forms${tag}@example.test`;
let password = "Forms-Test-123";
const mkUser = async (em, name) => (await (await fetch(`${API}/auth/v1/admin/users`, { method: "POST", headers: hdr, body: JSON.stringify({ email: em, password, email_confirm: true, app_metadata: { role: "photographer" }, user_metadata: { business_name: name } }) })).json());
const me = await mkUser(email, "Forms Studio");
const other = await mkUser(`other${tag}@example.test`, "Other Studio");
const userIds = [me.id, other.id];

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.7.${tag % 250}.1` } });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const go = async (p) => { await page.goto(APP + p, { waitUntil: "networkidle" }); };

/** Click a form's submit button; return its alert/status text (or "" if none) after the action settles. */
async function send(form, button) {
  const btn = button ?? form.locator("button[type=submit]").first();
  const msg = form.locator("[role=alert], [role=status]").first();
  const read = async () => ((await msg.count()) ? ((await msg.textContent())?.trim() ?? "") : "");
  const prev = await read();
  await btn.click();
  const end = Date.now() + 8000;
  while (Date.now() < end) { // wait for a new result to replace the previous one
    await page.waitForTimeout(150);
    const now = await read();
    if (now !== prev && now !== "") { last = now; await page.waitForLoadState("networkidle"); return now; }
  }
  await page.waitForLoadState("networkidle");
  return (last = await read() === prev ? (prev ? prev : "") : await read());
}
/** Forms that re-mount after success lose their message; DB state decides, message must be exact or absent. */
const soft = (m, want) => m === want || m === "";
const dbPh = async () => (await sql`select * from photographers where user_id = ${me.id}`)[0];
const pkgs = async () => sql`select p.*, (select count(*)::int from package_images i where i.package_id = p.id) as imgs from packages p where photographer_id = ${(await dbPh()).id} order by level`;
const tier = (level) => page.locator("div.border.border-line.p-4").filter({ has: page.getByText(level, { exact: true }) }).first();
const open = async (t, label) => { await t.locator(`summary:has-text("${label}")`).click(); return t.locator("form").filter({ has: page.locator("input[name=name]") }).first(); };
const actBtn = (scope, label) => scope.locator("form", { has: page.locator(`button:text-is("${label}")`) }).first();
const setStatus = async (s) => { await sql`update photographers set status = ${s} where user_id = ${me.id}`; };

try {
  // ---- login through the real login endpoint (cookies land in the browser context) ----
  const login = await ctx.request.post(APP + "/api/auth/login", { data: { email, password, portal: "photographer" } });
  check("login", login.ok());
  await go("/photographer/dashboard");
  check("dashboard renders pending status + own name", (await page.textContent("main")).includes("Forms Studio") && (await page.textContent("main")).includes("Pending"));
  check("dashboard hides public profile link while pending", (await page.locator("a:has-text('View public profile')").count()) === 0);

  // ---- saveProfile ----
  await go("/photographer/profile");
  let form = page.locator("form").filter({ has: page.locator("input[name=businessName]") });
  await form.locator("input[name=phone]").fill("abc");
  check("saveProfile: invalid phone rejected", /valid phone/i.test(await send(form)));
  await form.locator("input[name=phone]").fill("+91 98765 43210");
  await form.locator("input[name=whatsapp]").fill("+91 98765 43210");
  await form.locator("select[name=stateId]").selectOption({ index: 1 });
  await form.locator("select[name=cityId]").selectOption({ index: 1 });
  await form.locator("input[name=modelId]:not([disabled])").first().check();
  await form.locator("textarea[name=about]").fill("Form test about.");
  await form.locator("input[name=instagramUrl]").fill("http://insecure.test/x");
  check("saveProfile: non-https social link rejected", /https/i.test(await send(form)));
  await form.locator("input[name=instagramUrl]").fill("https://instagram.com/formtest");
  check("saveProfile: valid save", (await send(form)) === "Profile saved.");
  let row = await dbPh();
  check("saveProfile: persisted (phone, city, about, instagram, model, completeness)",
    row.phone === "+91 98765 43210" && !!row.city_id && row.about === "Form test about." && row.instagram_url === "https://instagram.com/formtest"
    && (await sql`select 1 from photographer_phones where photographer_id = ${row.id}`).length === 1 && row.is_profile_complete === true);
  check("saveProfile: status untouched (still pending)", row.status === "pending");
  await form.locator("input[name=modelId]:not([disabled])").first().uncheck();
  await send(form);
  check("saveProfile: unchecking a model removes it", (await sql`select 1 from photographer_phones where photographer_id = ${row.id}`).length === 0);

  // ---- addService / removeService ----
  await go("/photographer/services");
  const addForm = page.locator("form").filter({ has: page.locator("select[name=serviceId]") });
  await addForm.locator("select[name=serviceId]").selectOption({ index: 1 });
  check("addService", (await send(addForm)) === "Service added." && (await sql`select 1 from photographer_services where photographer_id = ${row.id}`).length === 1);
  await go("/photographer/services");
  await send(actBtn(page, "Remove service"));
  check("removeService: removed", (await sql`select 1 from photographer_services where photographer_id = ${row.id}`).length === 0);
  await go("/photographer/services");
  await page.locator("select[name=serviceId]").selectOption({ index: 1 });
  await send(page.locator("form").filter({ has: page.locator("select[name=serviceId]") }));
  await go("/photographer/services");
  const svcId = (await sql`select service_id from photographer_services where photographer_id = ${row.id}`)[0].service_id;

  // ---- savePackage: create ----
  let t = tier("Basic");
  form = await open(t, "Add package");
  await form.locator("input[name=name]").fill("Form Basic");
  await form.locator("input[name=shortDescription]").fill("Short desc");
  await form.locator("textarea[name=inclusions]").fill("1 hour\n\n20 photos");
  await form.locator("input[name=basePrice]").fill("0");
  await form.locator("input[name=offerPrice]").fill("0");
  check("savePackage: base/offer 0 rejected", /price/i.test(await send(form)));
  await form.locator("input[name=basePrice]").fill("1000");
  await form.locator("input[name=offerPrice]").fill("1500");
  check("savePackage: offer > base rejected", /cannot be higher/i.test(await send(form)) && (await pkgs()).length === 0);
  await form.locator("input[name=basePrice]").fill("1000");
  await form.locator("input[name=offerPrice]").fill("0");
  check("savePackage: offer 0 rejected", /offer price/i.test(await send(form)));
  await form.locator("input[name=basePrice]").fill("6,999");
  await form.locator("input[name=offerPrice]").fill("4,999");
  await form.locator("input[name=shortDescription]").fill("Short desc");
  await form.locator("textarea[name=inclusions]").fill("1 hour\n\n20 photos");
  check("savePackage: create Basic (draft)", soft(await send(form), "Package created as a draft."));
  let [basic] = await pkgs();
  check("savePackage: stored draft, price 4999.00, inclusions normalised", basic?.status === "draft" && basic.offer_price === "4999.00" && basic.base_price === "6999.00" && basic.price === "4999.00" && basic.inclusions === "1 hour\n20 photos");
  await go("/photographer/services");
  t = tier("Premium");
  form = await open(t, "Add package");
  await form.locator("input[name=name]").fill("Form Premium");
  await form.locator("input[name=basePrice]").fill("25000");
  await form.locator("input[name=offerPrice]").fill("19999");
  await form.locator("input[name=shortDescription]").fill("Prem");
  await form.locator("textarea[name=inclusions]").fill("everything");
  await send(form);
  check("savePackage: incomplete tiers allowed (Basic + Premium, no Standard)", (await pkgs()).map((p) => p.level).join() === "basic,premium");

  // ---- savePackage: edit ----
  await go("/photographer/services");
  t = tier("Basic");
  form = await open(t, "Edit");
  await form.locator("input[name=name]").fill("Form Basic v2");
  check("savePackage: edit draft", (await send(form)) === "Package saved." && (await pkgs())[0].name === "Form Basic v2");

  // ---- movePackage: submit / withdraw, image-count rule ----
  await go("/photographer/services");
  t = tier("Basic");
  check("movePackage submit: blocked with 0 images", /between 3 and 5 images/.test(await send(actBtn(t, "Submit for review"))) && (await pkgs())[0].status === "draft");
  for (let i = 0; i < 2; i++) await sql`insert into package_images (package_id, image_url, sort_order) values (${basic.id}, ${"https://x.test/f" + i + ".jpg"}, ${i})`;
  await go("/photographer/services");
  t = tier("Basic");
  check("movePackage submit: blocked with 2 images", /between 3 and 5 images/.test(await send(actBtn(t, "Submit for review"))) && (await pkgs())[0].status === "draft");
  await sql`insert into package_images (package_id, image_url, sort_order) values (${basic.id}, 'https://x.test/f2.jpg', 2)`;
  await go("/photographer/services");
  t = tier("Basic");
  check("movePackage submit: ok with 3 images", soft(await send(actBtn(t, "Submit for review")), "Submitted for review.") && (await pkgs())[0].status === "pending_review");
  await go("/photographer/services");
  t = tier("Basic");
  check("movePackage withdraw: pending_review -> draft", soft(await send(actBtn(t, "Withdraw")), "Moved back to draft.") && (await pkgs())[0].status === "draft");
  await go("/photographer/services");
  t = tier("Basic");
  await send(actBtn(t, "Submit for review"));

  // ---- no publish control + tampered forms ----
  await go("/photographer/services");
  check("no Publish/Approve control exists in the photographer UI", (await page.locator("button:text-matches('publish|approve', 'i')").count()) === 0);
  t = tier("Basic");
  const wd = actBtn(t, "Withdraw");
  await wd.locator("input[name=move]").evaluate((el) => (el.value = "publish"));
  check("tampered move=publish rejected", (await send(wd)) === "Invalid action." && (await pkgs())[0].status === "pending_review");
  const [otherPh] = await sql`insert into photographers (user_id, business_name, slug, status) values (${other.id}, 'Other Studio', ${"other-" + tag}, 'approved') returning id`;
  const [otherPkg] = await sql`insert into packages (photographer_id, service_id, level, name, base_price, offer_price) values (${otherPh.id}, ${svcId}, 'basic', 'Other pkg', 100, 100) returning id`;
  await sql`insert into photographer_services (photographer_id, service_id) values (${otherPh.id}, ${svcId}) on conflict do nothing`;
  await go("/photographer/services");
  t = tier("Basic");
  const wd2 = actBtn(t, "Withdraw");
  await wd2.locator("input[name=id]").evaluate((el, v) => (el.value = v), otherPkg.id);
  check("tampered package id (other photographer) rejected", (await send(wd2)) === "Package not found.");
  const [{ status: otherStatus }] = await sql`select status from packages where id = ${otherPkg.id}`;
  check("other photographer's package untouched", otherStatus === "draft");

  // ---- edit published => pending_review; remove image from published => pending_review ----
  await sql`update packages set status = 'published' where id = ${basic.id}`; // admin action (superuser)
  await go("/photographer/services");
  t = tier("Basic");
  form = await open(t, "Edit");
  await form.locator("input[name=basePrice]").fill("7000");
  await form.locator("input[name=offerPrice]").fill("5500");
  const editMsg = await send(form);
  check("savePackage: editing published sends it to pending_review", /sent for review/i.test(editMsg) && (await pkgs())[0].status === "pending_review", editMsg);
  check("price edit stored (base 7000 / offer 5500, legacy price mirrors offer)", await pkgs().then(([k]) => k.base_price === "7000.00" && k.offer_price === "5500.00" && k.price === "5500.00"));
  await go("/photographer/services");
  check("panel shows offer price with struck-through base price", (await tier("Basic").locator("s:has-text('7,000')").count()) === 1 && (await tier("Basic").textContent()).includes("5,500"));
  await go("/photographer/services");
  form = await open(tier("Basic"), "Edit");
  check("edit form prefilled with existing base/offer", (await form.locator("input[name=basePrice]").inputValue()) === "7000" && (await form.locator("input[name=offerPrice]").inputValue()) === "5500");
  await form.locator("input[name=offerPrice]").fill("8000");
  check("edit: offer above base rejected, stored values unchanged", /cannot be higher/i.test(await send(form)) && await pkgs().then(([k]) => k.offer_price === "5500.00"));
  await sql`update packages set status = 'published' where id = ${basic.id}`;
  await go("/photographer/services");
  t = tier("Basic");
  const rm = actBtn(t, "Remove");
  const rmMsg = await send(rm);
  const afterRm = (await pkgs())[0];
  check("deletePackageImage: published -> pending_review (not draft), image removed", afterRm.status === "pending_review" && afterRm.imgs === 2, `${afterRm.status} ${afterRm.imgs} ${rmMsg}`);
  check("pending_review package with 2 images cannot be published (DB)", await sql`update packages set status = 'published' where id = ${basic.id}`.then(() => false, (e) => e.code === "P0001"));
  await sql`insert into package_images (package_id, image_url, sort_order) values (${basic.id}, 'https://x.test/f9.jpg', 9)`;
  await sql`update packages set status = 'draft' where id = ${basic.id}`;
  for (let i = 0; i < 2; i++) await sql`insert into package_images (package_id, image_url, sort_order) values (${basic.id}, ${"https://x.test/g" + i + ".jpg"}, ${20 + i})`;
  check("package image max 5 enforced", await sql`insert into package_images (package_id, image_url) values (${basic.id}, 'https://x.test/six.jpg')`.then(() => false, (e) => /more than 5/.test(e.message)));
  await sql`update packages set status = 'rejected' where id = ${basic.id}`;
  await go("/photographer/services");
  t = tier("Basic");
  check("movePackage: rejected package can be resubmitted", soft(await send(actBtn(t, "Submit for review")), "Submitted for review."));

  // ---- deletePackage / service removal guard ----
  await go("/photographer/services");
  check("removeService hidden while service has packages", (await page.locator("button:text-is('Remove service')").count()) === 0);
  t = tier("Premium");
  check("deletePackage", soft(await send(actBtn(t, "Delete")), "") && (await pkgs()).map((p) => p.level).join() === "basic");
  await sql`update packages set status = 'inactive' where id = ${basic.id}`;
  await go("/photographer/services");
  check("inactive (admin-deactivated) package shows no Edit/Delete controls", (await tier("Basic").locator("button:text-is('Delete')").count()) === 0 && (await tier("Basic").locator("summary:has-text('Edit')").count()) === 0);
  await sql`update packages set status = 'draft' where id = ${basic.id}`;
  await go("/photographer/services");
  await send(actBtn(tier("Basic"), "Delete"));
  check("deletePackage: Basic deleted with its images", (await pkgs()).length === 0 && (await sql`select 1 from package_images where package_id = ${basic.id}`).length === 0);

  // ---- portfolio ----
  await go("/photographer/portfolio");
  form = page.locator("form").filter({ has: page.locator("input[name=name]") }).first();
  await form.locator("input[name=name]").fill("Golden hour");
  check("createSegment", (await send(form)) === "Segment created.");
  await go("/photographer/portfolio");
  const seg = (await sql`select * from portfolio_segments where photographer_id = ${row.id}`)[0];
  check("createSegment: slug generated", seg?.slug === "golden-hour");
  await go("/photographer/portfolio");
  form = page.locator("section").first().locator("form").filter({ has: page.locator("input[name=id]") }).filter({ has: page.locator("input[name=name]") }).first();
  await page.locator("section").first().locator("summary:has-text('Rename')").click();
  await form.locator("input[name=name]").fill("Golden hour 2");
  check("renameSegment", (await send(form)) === "Segment updated." && (await sql`select name from portfolio_segments where id = ${seg.id}`)[0].name === "Golden hour 2");
  await sql`insert into portfolio_images (segment_id, image_url) values (${seg.id}, 'https://x.test/pi.jpg')`;
  await go("/photographer/portfolio");
  check("portfolio image listed as Pending review", (await page.textContent("main")).includes("Pending review"));
  check("no approve control in portfolio UI", (await page.locator("button:text-matches('approve|publish', 'i')").count()) === 0);
  await send(actBtn(page.locator("section").first(), "✕"));
  check("deletePortfolioImage", (await sql`select 1 from portfolio_images where segment_id = ${seg.id}`).length === 0);
  const [oSeg] = await sql`insert into portfolio_segments (photographer_id, name, slug) values (${otherPh.id}, 'O', 'o') returning id`;
  const [oImg] = await sql`insert into portfolio_images (segment_id, image_url) values (${oSeg.id}, 'https://x.test/o.jpg') returning id`;
  await sql`insert into portfolio_images (segment_id, image_url) values (${seg.id}, 'https://x.test/pi2.jpg')`;
  await go("/photographer/portfolio");
  const del = actBtn(page.locator("section").first(), "✕");
  await del.locator("input[name=id]").evaluate((el, v) => (el.value = v), oImg.id);
  check("tampered portfolio image id (other photographer) rejected", (await send(del)) === "Image not found." && (await sql`select 1 from portfolio_images where id = ${oImg.id}`).length === 1);
  await go("/photographer/portfolio");
  await send(actBtn(page.locator("section").first(), "Delete"));
  check("deleteSegment (cascades images)", (await sql`select 1 from portfolio_segments where id = ${seg.id}`).length === 0);

  // ---- status restrictions through the forms ----
  for (const status of ["rejected", "inactive"]) {
    await setStatus(status);
    await go("/photographer/portfolio");
    form = page.locator("form").filter({ has: page.locator("input[name=name]") }).first();
    await form.locator("input[name=name]").fill("Blocked");
    check(`${status}: createSegment blocked`, /not authorized/i.test(await send(form)) && (await sql`select 1 from portfolio_segments where photographer_id = ${row.id}`).length === 0);
    await go("/photographer/services");
    t = tier("Standard");
    form = await open(t, "Add package");
    await form.locator("input[name=name]").fill("Blocked");
    await form.locator("input[name=basePrice]").fill("100");
    await form.locator("input[name=offerPrice]").fill("100");
    await form.locator("input[name=shortDescription]").fill("x");
    await form.locator("textarea[name=inclusions]").fill("x");
    check(`${status}: savePackage create blocked`, /not authorized/i.test(await send(form)) && (await pkgs()).length === 0);
    await go("/photographer/dashboard");
    check(`${status}: dashboard shows status, no public link`, (await page.textContent("main")).toLowerCase().includes(status) && (await page.locator("a:has-text('View public profile')").count()) === 0);
    const pub = await sql.begin(async (tx) => { await tx`set local role anon`; return tx`select 1 from photographers where user_id = ${me.id}`; });
    check(`${status}: not visible to the public`, pub.length === 0);
  }
  await setStatus("pending");
  await go("/photographer/services");
  t = tier("Standard");
  form = await open(t, "Add package");
  await form.locator("input[name=name]").fill("Pending draft");
  await form.locator("input[name=basePrice]").fill("100");
  await form.locator("input[name=offerPrice]").fill("100");
  await form.locator("input[name=shortDescription]").fill("x");
  await form.locator("textarea[name=inclusions]").fill("x");
  check("pending: may create drafts", soft(await send(form), "Package created as a draft."));
  const pubPk = await sql.begin(async (tx) => { await tx`set local role anon`; return tx`select 1 from packages where photographer_id = ${row.id}`; });
  check("pending: drafts not visible to the public", pubPk.length === 0);
  await go("/photographer/dashboard");
  check("pending: dashboard has no public link", (await page.locator("a:has-text('View public profile')").count()) === 0);
  await go("/photographer/services");
  await send(actBtn(tier("Standard"), "Delete"));

  // ---- account settings ----
  await go("/photographer/settings");
  const pw = page.locator("form").filter({ has: page.locator("input[name=current]") });
  await pw.locator("input[name=current]").fill("wrong-password");
  await pw.locator("input[name=next]").fill("New-Password-456");
  await pw.locator("input[name=confirm]").fill("New-Password-456");
  check("changePassword: wrong current password rejected", /incorrect/i.test(await send(pw)));
  await pw.locator("input[name=current]").fill(password);
  await pw.locator("input[name=confirm]").fill("Mismatch-789");
  check("changePassword: mismatch rejected", /do not match/i.test(await send(pw)));
  await pw.locator("input[name=confirm]").fill("New-Password-456");
  check("changePassword: success", (await send(pw)) === "Password changed.");
  password = "New-Password-456";
  const relog = await (await fetch(APP + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "10.8.8.8" }, body: JSON.stringify({ email, password, portal: "photographer" }) })).status;
  check("changePassword: new password logs in", relog === 200);
  await go("/photographer/settings");
  const em = page.locator("form").filter({ has: page.locator("input[name=email]") });
  await em.locator("input[name=email]").fill("not-an-email");
  await em.locator("input[name=email]").evaluate((el) => el.form.setAttribute("novalidate", ""));
  check("updateAccountEmail: invalid address rejected", /valid email/i.test(await send(em)));
  await em.locator("input[name=email]").fill(`new${tag}@example.test`);
  const emMsg = await send(em);
  check("updateAccountEmail: valid address accepted (confirmation required)", /confirm/i.test(emMsg), emMsg);
  await go("/photographer/settings");
  await page.locator("button:text-is('Log out')").click();
  await page.waitForURL("**/photographer/login");
  check("logout: redirected to login", page.url().includes("/photographer/login"));
  await page.goto(APP + "/photographer/dashboard");
  check("logout: panel inaccessible afterwards", page.url().includes("/photographer/login"));
} catch (e) {
  console.error(e);
  results.push(false);
} finally {
  await browser.close();
  await sql.begin(async (tx) => {
    await tx`alter table photographers disable trigger cascade_photographer_deletion_trigger`;
    await tx`delete from photographers where user_id in ${tx(userIds)}`;
    await tx`alter table photographers enable trigger cascade_photographer_deletion_trigger`;
  }).catch((e) => console.log("cleanup:", e.message));
  for (const id of userIds) await fetch(`${API}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: hdr });
  await sql.end();
  const bad = results.filter((r) => !r).length;
  console.log(bad ? `\n${bad} FAILED of ${results.length}` : `\nAll ${results.length} form-level checks passed (test data removed).`);
  process.exit(bad ? 1 : 0);
}
