// Upload tests: /api/photographer/uploads against the running dev server, local Supabase and the REAL R2 bucket,
// plus real-form deletion/cleanup in headless Chrome. Every R2 object and DB row created is removed afterwards.
// Needs playwright-core (not a project dependency):  npm i playwright-core --prefix <dir>
//   PW_DIR=<dir>/node_modules/playwright-core node --env-file=.env.local scripts/test-uploads.mjs
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";
import sharp from "sharp";

const { chromium, request } = createRequire(import.meta.url)(process.env.PW_DIR ?? "playwright-core");
const APP = process.env.APP_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_SUPABASE_URL, SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUB = process.env.R2_PUBLIC_URL.replace(/\/+$/, "");
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const s3 = new S3Client({
  region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
});
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`); };
const hdr = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

const tag = Date.now();
const password = "Upload-Test-123";
const mkUser = async (name, role = "photographer") => (await (await fetch(`${API}/auth/v1/admin/users`, {
  method: "POST", headers: hdr,
  body: JSON.stringify({ email: `${name}${tag}@example.test`, password, email_confirm: true, app_metadata: { role }, user_metadata: { business_name: name } }),
})).json());
const A = await mkUser("upa"), B = await mkUser("upb"), C = await mkUser("upc", "customer"), D = await mkUser("upd");
const userIds = [A.id, B.id, C.id, D.id];

const listKeys = async (prefix) => ((await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, Prefix: prefix }))).Contents ?? []).map((o) => o.Key);
const keyOf = (url) => url.slice(PUB.length + 1);
const head = (url) => fetch(url, { method: "HEAD" });
/** Remove rows (and their R2 objects) beyond the first `keep` images of a package, so size/format cases do not disturb the cap tests. */
const dropExtra = async (pkg, keep) => {
  const extra = (await imgs(pkg)).slice(keep);
  for (const x of extra) {
    await sql`delete from package_images where id = ${x.id}`;
    if (x.image_url.startsWith(PUB + "/")) await s3.send(new DeleteObjectsCommand({ Bucket: process.env.R2_BUCKET, Delete: { Objects: [{ Key: keyOf(x.image_url) }] } }));
  }
};

// ---- images ----
const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#c33" } }).png().toBuffer();
const jpg = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#3c3" } }).jpeg().toBuffer();
const webp = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#33c" } }).webp().toBuffer();
const big = await sharp({ create: { width: 3200, height: 3200, channels: 3, background: "#999" } }).png().toBuffer();
const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).gif().toBuffer();
const upload = (ctx, kind, targetId, file, { origin = APP, type = "image/png", name = "t.png" } = {}) =>
  ctx.post(APP + "/api/photographer/uploads", {
    headers: origin ? { origin } : {},
    multipart: { kind, ...(targetId ? { targetId } : {}), ...(file ? { file: { name, mimeType: type, buffer: file } } : {}) },
  });

const login = async (email) => {
  const ctx = await request.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.9.${tag % 250}.${Math.floor(Math.random() * 250)}` } });
  const r = await ctx.post(APP + "/api/auth/login", { data: { email, password, portal: email.startsWith("upc") ? "customer" : "photographer" } });
  if (!r.ok()) throw new Error("login failed " + (await r.text()));
  return ctx;
};

const mkPh = async (u, name, status = "approved") => (await sql`insert into photographers (user_id, business_name, slug, status) values (${u.id}, ${name}, ${"up-" + name + tag}, ${status}) returning id`)[0];
const phA = await mkPh(A, "upa"), phB = await mkPh(B, "upb"), phD = await mkPh(D, "upd");
const [svc] = await sql`insert into services (name, slug) values ('UpSvc', ${"up-svc-" + tag}) returning id`;
for (const p of [phA, phB]) await sql`insert into photographer_services (photographer_id, service_id) values (${p.id}, ${svc.id})`;
const mkPkg = async (p, level, status = "draft") => (await sql`insert into packages (photographer_id, service_id, level, name, base_price, offer_price, status) values (${p.id}, ${svc.id}, ${level}, 'P', 100, 100, ${status}) returning id`)[0];
const pkgA = await mkPkg(phA, "basic"), pkgB = await mkPkg(phB, "basic");
const [segA] = await sql`insert into portfolio_segments (photographer_id, name, slug) values (${phA.id}, 'SA', 'sa') returning id`;
const [segB] = await sql`insert into portfolio_segments (photographer_id, name, slug) values (${phB.id}, 'SB', 'sb') returning id`;
const imgs = (pkg) => sql`select * from package_images where package_id = ${pkg.id} order by sort_order`;
const portCount = () => sql`select count(*)::int n from portfolio_images i join portfolio_segments s on s.id = i.segment_id where s.photographer_id = ${phA.id}`.then((r) => r[0].n);

let browser;
try {
  const ctxA = await login(A.email);

  // ---- unauthorized access ----
  const anon = await request.newContext();
  let r = await upload(anon, "package", pkgA.id, png);
  check("unauthenticated upload -> 401", r.status() === 401, r.status());
  const ctxC = await login(C.email);
  r = await upload(ctxC, "package", pkgA.id, png);
  check("customer (non-photographer) upload -> 403", r.status() === 403, r.status());
  r = await upload(ctxA, "package", pkgA.id, png, { origin: null });
  check("missing Origin (CSRF) -> 403", r.status() === 403, r.status());
  r = await upload(ctxA, "package", pkgA.id, png, { origin: "https://evil.example" });
  check("foreign Origin (CSRF) -> 403", r.status() === 403, r.status());
  r = await upload(ctxA, "package", pkgB.id, png);
  check("upload to another photographer's package -> 404, nothing stored", r.status() === 404 && (await imgs(pkgB)).length === 0 && (await listKeys(`packages/${phB.id}/`)).length === 0, r.status());
  r = await upload(ctxA, "portfolio", segB.id, png);
  check("upload to another photographer's segment -> 404", r.status() === 404, r.status());
  r = await upload(ctxA, "package", "not-a-uuid", png);
  check("invalid target id -> 400", r.status() === 400, r.status());
  r = await upload(ctxA, "avatar", pkgA.id, png);
  check("invalid kind -> 400", r.status() === 400, r.status());
  r = await upload(ctxA, "package", pkgA.id, null);
  check("missing file -> 400", r.status() === 400, r.status());
  check("rejected requests stored nothing", (await imgs(pkgA)).length === 0 && (await listKeys(`packages/${phA.id}/`)).length === 0);

  // ---- valid uploads ----
  r = await upload(ctxA, "package", pkgA.id, png);
  const ok1 = await r.json();
  check("PNG package upload -> 201", r.status() === 201 && ok1.ok, JSON.stringify(ok1));
  const rows = await imgs(pkgA);
  const url1 = rows[0]?.image_url ?? "";
  check("row stored with R2 public URL + secure key (photographer/package/uuid.webp)",
    url1.startsWith(PUB + "/") && new RegExp(`^packages/${phA.id}/${pkgA.id}/[0-9a-f-]{36}\\.webp$`).test(keyOf(url1)), url1);
  const h = await head(url1);
  check("object is publicly readable as image/webp", h.status === 200 && h.headers.get("content-type") === "image/webp", `${h.status} ${h.headers.get("content-type")}`);
  r = await upload(ctxA, "package", pkgA.id, jpg, { type: "image/jpeg", name: "t.jpg" });
  check("JPEG upload -> 201", r.status() === 201, r.status());
  r = await upload(ctxA, "package", pkgA.id, webp, { type: "image/webp", name: "t.webp" });
  check("WebP upload -> 201", r.status() === 201, r.status());
  const stored = Buffer.from(await (await fetch(url1)).arrayBuffer());
  const meta = await sharp(stored).metadata();
  check("stored file is WebP re-encoded from the PNG", meta.format === "webp" && meta.width === 800 && meta.height === 600);
  r = await upload(ctxA, "package", pkgA.id, big, { name: "big.png" });
  const bigRow = (await imgs(pkgA)).at(-1);
  const bigMeta = await sharp(Buffer.from(await (await fetch(bigRow.image_url)).arrayBuffer())).metadata();
  check("large image downscaled to max 2400px", r.status() === 201 && Math.max(bigMeta.width, bigMeta.height) === 2400, `${r.status()} ${bigMeta.width}`);
  check("sort order increments", (await imgs(pkgA)).map((x) => x.sort_order).join() === "0,1,2,3");

  // ---- validation ----
  r = await upload(ctxA, "package", pkgA.id, Buffer.from("<?php echo 1; ?> not an image"), { type: "image/jpeg", name: "evil.jpg" });
  check("text file renamed .jpg with image/jpeg MIME -> 415", r.status() === 415, r.status());
  r = await upload(ctxA, "package", pkgA.id, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), { type: "image/png", name: "x.png" });
  check("SVG with image/png MIME -> 415", r.status() === 415, r.status());
  r = await upload(ctxA, "package", pkgA.id, gif, { type: "image/png", name: "x.png" });
  check("GIF with image/png MIME -> 415 (format checked from content)", r.status() === 415, r.status());
  r = await upload(ctxA, "package", pkgA.id, png.subarray(0, 40), { name: "trunc.png" });
  check("truncated/corrupt PNG -> 415", r.status() === 415, r.status());
  r = await upload(ctxA, "package", pkgA.id, Buffer.alloc(0), { name: "empty.png" });
  check("empty file -> rejected (4xx)", r.status() >= 400 && r.status() < 500, r.status());
  r = await upload(ctxA, "package", pkgA.id, Buffer.concat([png, Buffer.from("<script>alert(1)</script>")]), { name: "poly.png" });
  const poly = (await imgs(pkgA)).at(-1);
  const polyBytes = r.status() === 201 ? Buffer.from(await (await fetch(poly.image_url)).arrayBuffer()) : Buffer.alloc(0);
  check("PNG with appended payload: stored copy is re-encoded WebP with payload gone", r.status() === 201 && !polyBytes.includes("<script>") && (await sharp(polyBytes).metadata()).format === "webp", r.status());
  await dropExtra(pkgA, 4); // that last upload was a valid 5th image; drop it so later cases are not affected

  // ---- size limits (random bytes: incompressible, MIME claims PNG) ----
  const under = Buffer.concat([png, randomBytes(5 * 1024 * 1024 - png.length)]); // exactly 5 MB
  const over1 = Buffer.concat([png, randomBytes(5 * 1024 * 1024 - png.length + 1)]); // 5 MB + 1 byte
  const over2 = randomBytes(8 * 1024 * 1024);
  r = await upload(ctxA, "package", pkgA.id, over1, { name: "o1.png" });
  check("5 MB + 1 byte -> 413", r.status() === 413, r.status());
  r = await upload(ctxA, "package", pkgA.id, over2, { name: "o2.png" });
  check("8 MB -> 413 (rejected from Content-Length)", r.status() === 413, r.status());
  r = await upload(ctxA, "package", pkgA.id, under, { name: "u.png" });
  check("exactly 5 MB passes the size check (then fails content validation only if not an image)", r.status() === 201 || r.status() === 415 || r.status() === 409, r.status());
  await dropExtra(pkgA, 4);
  check("no row/object stored for oversize files", (await imgs(pkgA)).length === 4 && (await listKeys(`packages/${phA.id}/`)).length === 4, (await listKeys(`packages/${phA.id}/`)).length);

  // ---- package image cap (3-5 rule) ----
  r = await upload(ctxA, "package", pkgA.id, png);
  check("5th package image accepted", r.status() === 201, r.status());
  r = await upload(ctxA, "package", pkgA.id, png);
  const capBody = await r.json();
  check("6th package image -> 409 and nothing stored", r.status() === 409 && (await imgs(pkgA)).length === 5 && (await listKeys(`packages/${phA.id}/`)).length === 5, `${r.status()} ${capBody.error}`);
  const results2 = await Promise.all(Array.from({ length: 3 }, () => upload(ctxA, "package", pkgB.id, png).then((x) => x.status())));
  check("(other photographer's package unaffected by A's context) rejected", results2.every((s) => s === 404), results2.join());

  // ---- moderation: upload to a published package sends it back to review ----
  const ctxB = await login(B.email);
  for (let i = 0; i < 3; i++) await sql`insert into package_images (package_id, image_url, sort_order) values (${pkgB.id}, ${"https://x.test/b" + i}, ${i})`;
  await sql`update packages set status = 'published' where id = ${pkgB.id}`;
  r = await upload(ctxB, "package", pkgB.id, png);
  check("upload to published package -> 201 and status pending_review", r.status() === 201 && (await sql`select status from packages where id = ${pkgB.id}`)[0].status === "pending_review", r.status());
  await sql`update packages set status = 'inactive' where id = ${pkgB.id}`;
  r = await upload(ctxB, "package", pkgB.id, png);
  check("upload to admin-deactivated package -> 403", r.status() === 403, r.status());

  // ---- portfolio ----
  r = await upload(ctxA, "portfolio", segA.id, jpg, { type: "image/jpeg", name: "p.jpg" });
  const pBody = await r.json();
  const [pRow] = await sql`select * from portfolio_images where segment_id = ${segA.id}`;
  check("portfolio upload -> 201, status pending_review, key under portfolio/<photographer>/<segment>/",
    r.status() === 201 && pRow?.status === "pending_review" && new RegExp(`^portfolio/${phA.id}/${segA.id}/[0-9a-f-]{36}\\.webp$`).test(keyOf(pRow.image_url)), JSON.stringify(pBody));
  const pending = await sql`select count(*)::int n from portfolio_images where status <> 'pending_review' and segment_id = ${segA.id}`;
  check("uploaded portfolio images are never auto-approved", pending[0].n === 0);

  // 50-image cap: fill to 49 with direct rows, then upload the 50th, then the 51st fails
  const have = await portCount();
  for (let i = 0; i < 49 - have; i++) await sql`insert into portfolio_images (segment_id, image_url) values (${segA.id}, ${"https://x.test/fill" + i})`;
  r = await upload(ctxA, "portfolio", segA.id, png);
  check("50th portfolio image accepted", r.status() === 201 && (await portCount()) === 50, r.status());
  r = await upload(ctxA, "portfolio", segA.id, png);
  check("51st portfolio image -> 409, nothing stored", r.status() === 409 && (await portCount()) === 50 && (await listKeys(`portfolio/${phA.id}/`)).length === 2, `${r.status()}`);
  const segA2 = (await sql`insert into portfolio_segments (photographer_id, name, slug) values (${phA.id}, 'SA2', 'sa2') returning id`)[0];
  r = await upload(ctxA, "portfolio", segA2.id, png);
  check("cap is per photographer, across segments -> 409", r.status() === 409, r.status());
  const dbErr = await sql`insert into portfolio_images (segment_id, image_url) values (${segA2.id}, 'https://x.test/direct')`.then(() => "", (e) => e.message);
  check("DB trigger also enforces the 50 cap (direct insert)", /more than 50/.test(dbErr), dbErr);
  await sql`update portfolio_images set status = 'inactive' where id = (select id from portfolio_images where segment_id = ${segA.id} limit 1)`;
  r = await upload(ctxA, "portfolio", segA2.id, png);
  check("admin-deactivated images do not count toward the cap", r.status() === 201, r.status());

  // ---- locked photographers ----
  await sql`update photographers set status = 'rejected' where id = ${phB.id}`;
  await sql`update packages set status = 'draft' where id = ${pkgB.id}`;
  const keysB = (await listKeys(`packages/${phB.id}/`)).length;
  r = await upload(ctxB, "package", pkgB.id, png);
  check("rejected photographer cannot upload -> 403, no row, no orphan object", r.status() === 403 && (await listKeys(`packages/${phB.id}/`)).length === keysB, r.status());
  r = await upload(ctxB, "portfolio", segB.id, png);
  check("rejected photographer cannot upload portfolio -> 403", r.status() === 403, r.status());
  await sql`update photographers set status = 'inactive' where id = ${phB.id}`;
  r = await upload(ctxB, "package", pkgB.id, png);
  check("inactive photographer cannot upload -> 403", r.status() === 403, r.status());

  // ---- profile images: photo / logo / banner (separate photographer D, own rate-limit bucket) ----
  const ctxD = await login(D.email);
  await sql`update photographers set status = 'pending' where id = ${phD.id}`; // not public until approved
  const col = { profile_photo: "profile_photo_url", logo: "logo_url", banner: "banner_url" };
  const slot = { profile_photo: "photo", logo: "logo", banner: "banner" };
  const phRow = async (ph) => (await sql`select * from photographers where id = ${ph.id}`)[0];
  const pf = (ctx, kind, file, o = {}) => upload(ctx, kind, undefined, file, o);
  const pfUrls = {};
  for (const kind of ["profile_photo", "logo", "banner"]) {
    r = await pf(ctxD, kind, png);
    const url = (await phRow(phD))[col[kind]] ?? "";
    pfUrls[kind] = url;
    const hh = url ? await head(url) : { status: 0, headers: new Headers() };
    check(`${kind} upload -> 201, stored under profile/<photographer>/${slot[kind]}/<uuid>.webp and publicly readable`,
      r.status() === 201 && new RegExp(`^profile/${phD.id}/${slot[kind]}/[0-9a-f-]{36}\\.webp$`).test(keyOf(url)) && hh.status === 200 && hh.headers.get("content-type") === "image/webp", `${r.status()} ${url}`);
  }
  r = await pf(ctxD, "logo", jpg, { type: "image/jpeg", name: "l.jpg" });
  const logo2 = (await phRow(phD)).logo_url;
  check("replace logo (JPEG over PNG) -> 201 'Image replaced.', row points to new key", r.status() === 201 && (await r.json()).message === "Image replaced." && logo2 !== pfUrls.logo && logo2.startsWith(PUB + "/"));
  check("replacement deleted the old R2 object and kept the new one", (await head(pfUrls.logo)).status === 404 && (await head(logo2)).status === 200);
  check("other slots untouched by the replacement", (await phRow(phD)).profile_photo_url === pfUrls.profile_photo && (await phRow(phD)).banner_url === pfUrls.banner);
  const beforeBad = await phRow(phD);
  r = await pf(ctxD, "banner", Buffer.from("<html>not an image</html>"), { type: "image/jpeg", name: "b.jpg" });
  check("profile: fake JPEG -> 415, existing image kept", r.status() === 415 && (await phRow(phD)).banner_url === beforeBad.banner_url && (await head(beforeBad.banner_url)).status === 200);
  r = await pf(ctxD, "banner", gif, { name: "b.png" });
  check("profile: GIF with image/png MIME -> 415", r.status() === 415);
  r = await pf(ctxD, "banner", Buffer.concat([png, randomBytes(5 * 1024 * 1024)]), { name: "b.png" });
  check("profile: > 5 MB -> 413, existing image kept", r.status() === 413 && (await phRow(phD)).banner_url === beforeBad.banner_url);
  r = await pf(anon, "logo", png);
  check("profile: unauthenticated -> 401", r.status() === 401);
  r = await pf(ctxC, "logo", png);
  check("profile: customer -> 403", r.status() === 403);
  r = await pf(ctxD, "logo", png, { origin: "https://evil.example" });
  check("profile: foreign Origin -> 403", r.status() === 403);
  // tampering: another photographer's id as targetId must not redirect the write
  const upBefore = await phRow(phA);
  r = await upload(ctxD, "logo", phA.id, png);
  const upAfter = await phRow(phA);
  check("profile: targetId pointing at another photographer is ignored (only caller's own profile changes)",
    r.status() === 201 && upAfter.logo_url === upBefore.logo_url && (await phRow(phD)).logo_url !== logo2);
  r = await pf(ctxD, "avatar", png);
  check("profile: unknown kind -> 400", r.status() === 400);
  const anonView = await sql.begin(async (tx) => {
    await tx`set local role anon`;
    return tx`select profile_photo_url, logo_url, banner_url, business_name from photographers where id = ${phD.id}`;
  });
  check("public (anon) cannot read profile images of a pending photographer", anonView.length === 0);
  await sql`update photographers set status = 'approved' where id = ${phD.id}`;
  const approvedView = await sql.begin(async (tx) => {
    await tx`set local role anon`;
    return tx`select profile_photo_url, logo_url, banner_url from photographers where id = ${phD.id}`;
  });
  check("public (anon) can read photo, logo and banner URLs of an approved photographer", approvedView.length === 1 && !!approvedView[0].profile_photo_url && !!approvedView[0].logo_url && !!approvedView[0].banner_url);
  const pubImg = approvedView[0] ?? {};
  check("public image URLs load without credentials", (await fetch(pubImg.profile_photo_url)).ok && (await fetch(pubImg.logo_url)).ok && (await fetch(pubImg.banner_url)).ok);
  // RLS: photographer B cannot change D's profile images at the DB level either
  const rlsRows = await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: B.id, role: "authenticated" })}, true)`;
    await tx`set local role authenticated`;
    return tx`update photographers set logo_url = null where id = ${phD.id} returning id`;
  });
  check("RLS: another photographer cannot clear/replace D's images", rlsRows.length === 0 && !!(await phRow(phD)).logo_url);

  // locked accounts
  await sql`update photographers set status = 'rejected' where id = ${phD.id}`;
  const lockBefore = await phRow(phD);
  r = await pf(ctxD, "banner", png);
  check("rejected photographer cannot upload a profile image -> 403, nothing changed", r.status() === 403 && (await phRow(phD)).banner_url === lockBefore.banner_url);
  await sql`update photographers set status = 'inactive' where id = ${phD.id}`;
  r = await pf(ctxD, "banner", png);
  check("inactive photographer cannot upload a profile image -> 403", r.status() === 403);
  await sql`update photographers set status = 'approved' where id = ${phD.id}`;

  // ---- deletion through the real forms (removes the R2 object too) ----
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const bctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.8.${tag % 250}.1` } });
  const login2 = await bctx.request.post(APP + "/api/auth/login", { data: { email: A.email, password, portal: "photographer" } });
  check("browser login", login2.ok());
  const page = await bctx.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(APP + "/photographer/services", { waitUntil: "networkidle" });
  const tier = page.locator("div.border.border-line.p-4").filter({ has: page.getByText("Basic", { exact: true }) }).first();
  check("package page shows upload control", (await tier.locator("input[type=file]").count()) === 1);
  const victim = (await imgs(pkgA))[0];
  const victimKey = keyOf(victim.image_url);
  await tier.locator("button:text-is('Remove')").first().click();
  for (let i = 0; i < 40 && (await imgs(pkgA)).length === 5; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  const gone = await head(victim.image_url);
  check("deletePackageImage removes the DB row and the R2 object", (await imgs(pkgA)).length === 4 && !(await listKeys(victimKey)).length && gone.status === 404, `${(await imgs(pkgA)).length} ${gone.status}`);

  // UI upload through the file input
  await page.goto(APP + "/photographer/services", { waitUntil: "networkidle" });
  await tier.locator("input[type=file]").setInputFiles({ name: "ui.png", mimeType: "image/png", buffer: png });
  for (let i = 0; i < 40 && (await imgs(pkgA)).length === 4; i++) await page.waitForTimeout(250);
  check("upload through the form control stores a 5th image", (await imgs(pkgA)).length === 5);
  await page.goto(APP + "/photographer/services", { waitUntil: "networkidle" });
  await tier.locator("input[type=file]").setInputFiles({ name: "bad.png", mimeType: "image/png", buffer: Buffer.from("not an image at all") });
  await page.waitForTimeout(600);
  check("form control reports an error for a non-image", (await page.locator("[role=alert]").filter({ hasText: /bad\.png|JPEG|image/i }).count()) > 0);

  // profile image removal through the real form (user D)
  const dctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.6.${tag % 250}.1` } });
  await dctx.request.post(APP + "/api/auth/login", { data: { email: D.email, password, portal: "photographer" } });
  const dpage = await dctx.newPage();
  dpage.on("dialog", (d) => d.accept());
  await dpage.goto(APP + "/photographer/profile", { waitUntil: "networkidle" });
  check("profile page shows 3 image previews with upload controls", (await dpage.locator("section img").count()) === 3 && (await dpage.locator("section input[type=file]").count()) === 3);
  check("previews point at the stored URLs", (await dpage.locator(`section img[src="${(await phRow(phD)).logo_url}"]`).count()) === 1);
  const doomed = await phRow(phD);
  const bogus = dpage.locator("form:has(input[name=slot])").nth(2); // photo, logo, banner order
  await bogus.locator("input[name=slot]").evaluate((el) => (el.value = "../../x"));
  await bogus.locator("button").click();
  await dpage.waitForTimeout(1200);
  check("removeProfileImage: tampered slot rejected, nothing removed", (await phRow(phD)).banner_url === doomed.banner_url);
  await dpage.goto(APP + "/photographer/profile", { waitUntil: "networkidle" });
  await dpage.locator("form", { has: dpage.locator("input[name=slot][value=banner]") }).first().locator("button").click();
  for (let i = 0; i < 40 && (await phRow(phD)).banner_url; i++) await dpage.waitForTimeout(250);
  await dpage.waitForTimeout(1500);
  check("removeProfileImage (form): clears the column and deletes the R2 object", (await phRow(phD)).banner_url === null && (await head(doomed.banner_url)).status === 404);
  check("removing the banner left photo and logo alone", (await phRow(phD)).profile_photo_url === doomed.profile_photo_url && (await phRow(phD)).logo_url === doomed.logo_url);
  // cross-owner safety: a tampered URL pointing at someone else's object must never be deleted by remove/replace
  const foreignKey = (await listKeys(`packages/${phA.id}/`))[0] ?? (await listKeys(`portfolio/${phA.id}/`))[0];
  check("(setup) found another photographer's object to protect", !!foreignKey);
  await sql`update photographers set logo_url = ${PUB + "/" + foreignKey} where id = ${phD.id}`;
  await dpage.goto(APP + "/photographer/profile", { waitUntil: "networkidle" });
  await dpage.locator("form", { has: dpage.locator("input[name=slot][value=logo]") }).first().locator("button").click();
  for (let i = 0; i < 40 && (await phRow(phD)).logo_url; i++) await dpage.waitForTimeout(250);
  await dpage.waitForTimeout(1500);
  check("remove never deletes an object owned by another photographer", (await phRow(phD)).logo_url === null && (await head(PUB + "/" + foreignKey)).status === 200);
  await sql`update photographers set logo_url = ${PUB + "/" + foreignKey} where id = ${phD.id}`;
  r = await pf(ctxD, "logo", png);
  check("replace never deletes an object owned by another photographer", r.status() === 201 && (await head(PUB + "/" + foreignKey)).status === 200);
  // UI upload through the profile form control
  await dpage.goto(APP + "/photographer/profile", { waitUntil: "networkidle" });
  await dpage.locator("section input[type=file]").nth(2).setInputFiles({ name: "ban.png", mimeType: "image/png", buffer: png });
  for (let i = 0; i < 40 && !(await phRow(phD)).banner_url; i++) await dpage.waitForTimeout(250);
  await dpage.waitForTimeout(800);
  check("profile form upload stores the banner and the preview refreshes", !!(await phRow(phD)).banner_url && (await dpage.locator(`section img[src="${(await phRow(phD)).banner_url}"]`).count()) === 1);

  // portfolio image delete
  await page.goto(APP + "/photographer/portfolio", { waitUntil: "networkidle" });
  const [uploaded] = await sql`select * from portfolio_images where segment_id = ${segA.id} and status <> 'inactive' and image_url like ${PUB + "%"} order by created_at limit 1`;
  const delBtn = page.locator("section").first().locator("form", { has: page.locator(`input[name=id][value="${uploaded.id}"]`) }).locator("button");
  await delBtn.click();
  for (let i = 0; i < 40 && (await sql`select 1 from portfolio_images where id = ${uploaded.id}`).length; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  check("deletePortfolioImage removes the DB row and the R2 object", !(await sql`select 1 from portfolio_images where id = ${uploaded.id}`).length && !(await listKeys(keyOf(uploaded.image_url))).length);

  // deleteSegment / deletePackage purge their files
  const segKeys = await listKeys(`portfolio/${phA.id}/${segA2.id}/`);
  await page.goto(APP + "/photographer/portfolio", { waitUntil: "networkidle" });
  const secA2 = page.locator("section").filter({ has: page.getByRole("heading", { name: "SA2" }) });
  await secA2.locator("form", { has: page.locator("button:text-is('Delete')") }).first().locator("button").click();
  for (let i = 0; i < 40 && (await sql`select 1 from portfolio_segments where id = ${segA2.id}`).length; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  check("deleteSegment purges its R2 files", segKeys.length === 1 && !(await sql`select 1 from portfolio_segments where id = ${segA2.id}`).length && (await listKeys(`portfolio/${phA.id}/${segA2.id}/`)).length === 0, `${segKeys.length}`);
  const pkgKeys = await listKeys(`packages/${phA.id}/${pkgA.id}/`);
  await page.goto(APP + "/photographer/services", { waitUntil: "networkidle" });
  await tier.locator("form", { has: page.locator("button:text-is('Delete')") }).first().locator("button").click();
  for (let i = 0; i < 40 && (await sql`select 1 from packages where id = ${pkgA.id}`).length; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  check("deletePackage purges all its R2 files", pkgKeys.length === 5 && (await listKeys(`packages/${phA.id}/`)).length === 0, `${pkgKeys.length} -> ${(await listKeys(`packages/${phA.id}/`)).length}`);
} catch (e) {
  console.error(e);
  results.push(false);
} finally {
  await browser?.close();
  // remove whatever objects remain for the test photographers, then DB rows and users
  for (const id of [phA.id, phB.id, phD.id]) {
    for (const prefix of [`packages/${id}/`, `portfolio/${id}/`, `profile/${id}/`]) {
      const keys = await listKeys(prefix);
      if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket: process.env.R2_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
    }
  }
  await sql.begin(async (tx) => {
    await tx`alter table photographers disable trigger cascade_photographer_deletion_trigger`;
    await tx`delete from photographers where id in (${phA.id}, ${phB.id}, ${phD.id})`;
    await tx`alter table photographers enable trigger cascade_photographer_deletion_trigger`;
    await tx`delete from services where id = ${svc.id}`;
  }).catch((e) => console.log("cleanup:", e.message));
  for (const id of userIds) await fetch(`${API}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: hdr });
  const left = (await listKeys(`packages/${phA.id}/`)).length + (await listKeys(`portfolio/${phA.id}/`)).length + (await listKeys(`packages/${phB.id}/`)).length + (await listKeys(`profile/${phD.id}/`)).length;
  console.log(`R2 objects left for test users: ${left}`);
  await sql.end();
  const bad = results.filter((x) => !x).length + (left ? 1 : 0);
  console.log(bad ? `\n${bad} FAILED of ${results.length}` : `\nAll ${results.length} upload checks passed (test data and R2 objects removed).`);
  process.exit(bad ? 1 : 0);
}
