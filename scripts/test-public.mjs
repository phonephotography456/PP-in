// Phase 6 public-website tests against the REAL database (as the `anon` role + RLS) and a production build.
// Inserts committed fixtures (all named "zzt-<tag>"), starts `next start`, checks pages over HTTP and in headless
// Chrome (responsive), then deletes every fixture row. Run `npm run build` first.
//   PW_DIR=<dir>/node_modules/playwright-core node scripts/test-public.mjs
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const PORT = process.env.TEST_PORT ?? "3107";
const APP = `http://localhost:${PORT}`;
const T = `zzt${Date.now().toString(36)}`;
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`); if (!ok) failed++; };
const get = async (path) => { const r = await fetch(APP + path, { redirect: "manual" }); return { status: r.status, html: await r.text() }; };
const has = (html, s) => html.includes(s);
// Not-found streams after the shell (status stays 200, Next adds <meta robots noindex>); the visible 404 UI is asserted in the browser section.
const isNF = (html) => /name="robots" content="noindex"/.test(html);
const img = (n) => `https://img.test/${T}/${n}.webp`;

// ---------------------------------------------------------------- fixtures
const ids = {};
async function seed() {
  const [s1] = await sql`insert into states (name, slug, is_active) values (${"ZZT State " + T}, ${T + "-state"}, true) returning id`;
  const [s2] = await sql`insert into states (name, slug, is_active) values (${"ZZT Off State " + T}, ${T + "-offstate"}, false) returning id`;
  const [c1] = await sql`insert into cities (state_id, name, slug, is_active) values (${s1.id}, ${"ZZT City " + T}, ${T + "-city"}, true) returning id`;
  const [c2] = await sql`insert into cities (state_id, name, slug, is_active) values (${s1.id}, ${"ZZT Off City " + T}, ${T + "-offcity"}, false) returning id`;
  const [c3] = await sql`insert into cities (state_id, name, slug, is_active) values (${s1.id}, ${"ZZT Empty City " + T}, ${T + "-emptycity"}, true) returning id`;
  const [v1] = await sql`insert into services (name, slug, description, status) values (${"ZZT Wedding " + T}, ${T + "-wedding"}, 'Wedding stories on a phone.', 'active') returning id`;
  const [v2] = await sql`insert into services (name, slug, status) values (${"ZZT Birthday " + T}, ${T + "-birthday"}, 'active') returning id`;
  const [v3] = await sql`insert into services (name, slug, status) values (${"ZZT Hidden " + T}, ${T + "-hidden"}, 'inactive') returning id`;
  const [b] = await sql`insert into smartphone_brands (name, slug, status) values (${"ZZT Brand " + T}, ${T + "-brand"}, 'active') returning id`;
  const [m1] = await sql`insert into smartphone_models (brand_id, name, slug, status) values (${b.id}, ${"ZZT Phone " + T}, ${T + "-phone"}, 'active') returning id`;
  const [m2] = await sql`insert into smartphone_models (brand_id, name, slug, status) values (${b.id}, ${"ZZT Old Phone " + T}, ${T + "-oldphone"}, 'inactive') returning id`;
  const [s3] = await sql`insert into states (name, slug, is_active) values (${"ZZT Bulk State " + T}, ${T + "-bulkstate"}, true) returning id`;
  const [c4] = await sql`insert into cities (state_id, name, slug, is_active) values (${s3.id}, ${"ZZT Bulk City " + T}, ${T + "-bulkcity"}, true) returning id`;
  Object.assign(ids, { s3: s3.id, c4: c4.id, s1: s1.id, s2: s2.id, c1: c1.id, c2: c2.id, c3: c3.id, v1: v1.id, v2: v2.id, v3: v3.id, b: b.id, m1: m1.id, m2: m2.id });

  const photographer = async (key, status, cityId, stateId = s1.id) => {
    const [p] = await sql`insert into photographers (user_id, business_name, slug, status, about, phone, whatsapp, instagram_url, banner_url, profile_photo_url, logo_url, state_id, city_id)
      values (${randomUUID()}, ${`ZZT ${key} ${T}`}, ${`${T}-${key.toLowerCase()}`}, ${status}, ${`About ${key} ${T}`}, '9876543210', '+91 98765 43211', 'https://instagram.com/zzt', ${img(key + "-banner")}, ${img(key + "-dp")}, ${img(key + "-logo")}, ${stateId}, ${cityId}) returning id, slug`;
    ids[key] = p.id; ids[key + "Slug"] = p.slug;
    return p;
  };
  const pkg = async (ph, svc, level, base, offer, status, name) => {
    const [p] = await sql`insert into packages (photographer_id, service_id, level, name, base_price, offer_price, status, short_description, inclusions, detailed_description)
      values (${ph.id}, ${svc}, ${level}, ${name}, ${base}, ${offer}, 'draft', ${`Short ${name}`}, ${`Incl one ${name}\nIncl two ${name}`}, ${`Detail ${name}`}) returning id`;
    for (let i = 0; i < 3; i++) await sql`insert into package_images (package_id, image_url, alt_text, sort_order) values (${p.id}, ${img(`${name.replace(/\W/g, "")}-${i}`)}, ${`alt ${name} ${i}`}, ${i})`;
    if (status !== "draft") await sql`update packages set status = ${status} where id = ${p.id}`;
    return p;
  };
  const A = await photographer("A", "approved", c1.id);
  const B = await photographer("B", "pending", c1.id);
  const C = await photographer("C", "rejected", c1.id);
  const D = await photographer("D", "approved", c2.id); // approved but in an inactive city
  const E = await photographer("E", "approved", c1.id); // approved, no published packages
  for (const ph of [A, B, C, D, E]) for (const v of [v1, v2]) await sql`insert into photographer_services (photographer_id, service_id) values (${ph.id}, ${v.id})`;
  await sql`insert into photographer_services (photographer_id, service_id) values (${A.id}, ${v3.id})`;
  await sql`insert into photographer_phones (photographer_id, model_id) values (${A.id}, ${m1.id}), (${A.id}, ${m2.id})`;

  await pkg(A, v1.id, "basic", 6000, 4500, "published", `ZZTBasic${T}`); // discounted
  await pkg(A, v1.id, "standard", 12000, 12000, "published", `ZZTStandard${T}`); // no discount
  await pkg(A, v1.id, "premium", 40000, 30000, "draft", `ZZTPremiumDraft${T}`); // draft: hidden
  await pkg(A, v2.id, "basic", 3000, 2500, "published", `ZZTBirthdayBasic${T}`);
  await pkg(A, v3.id, "basic", 3000, 2500, "published", `ZZTHiddenSvc${T}`); // inactive service: hidden
  await pkg(B, v1.id, "basic", 1000, 900, "published", `ZZTPending${T}`); // pending photographer: hidden
  await pkg(C, v1.id, "basic", 1000, 900, "published", `ZZTRejected${T}`);
  await pkg(D, v1.id, "basic", 1000, 900, "published", `ZZTOffCity${T}`); // inactive city: hidden from listings
  await pkg(E, v1.id, "premium", 50000, 50000, "pending_review", `ZZTReview${T}`); // not published: hidden

  const seg = async (ph, name, slug) => (await sql`insert into portfolio_segments (photographer_id, name, slug) values (${ph.id}, ${name}, ${slug}) returning id`)[0].id;
  const segSvc = await seg(A, `ZZT Wedding Seg ${T}`, `${T}-wedding`);
  const segGen = await seg(A, `ZZT General ${T}`, `${T}-general`);
  const segB = await seg(B, "B seg", `${T}-bseg`);
  const segBd = await seg(A, `ZZT Birthday Seg ${T}`, `${T}-birthday`);
  for (let i = 0; i < 10; i++) await sql`insert into portfolio_images (segment_id, image_url, alt_text, status) values (${segBd}, ${img("bday-" + i)}, ${"alt bday " + i}, 'approved')`;
  await sql`update packages set youtube_url = ${"https://www.youtube.com/watch?v=" + "aaaaaaaaa" + "A1"} where name = ${`ZZTBasic${T}`}`;
  await sql`update packages set youtube_url = ${"https://www.youtube.com/watch?v=" + "bbbbbbbbb" + "B2"} where name = ${`ZZTStandard${T}`}`;
  await sql`update packages set youtube_url = ${"https://www.youtube.com/watch?v=" + "ccccccccc" + "C3"} where name = ${`ZZTBirthdayBasic${T}`}`;
  await sql`update packages set youtube_url = ${"https://www.youtube.com/watch?v=" + "ddddddddd" + "D4"} where name = ${`ZZTPending${T}`}`; // pending photographer: never public
  const pimg = (s, n, status) => sql`insert into portfolio_images (segment_id, image_url, alt_text, status) values (${s}, ${img(n)}, ${"alt " + n}, ${status})`;
  await pimg(segSvc, "svc-approved", "approved"); await pimg(segSvc, "svc-pending", "pending_review"); await pimg(segSvc, "svc-rejected", "rejected"); await pimg(segSvc, "svc-inactive", "inactive");
  await pimg(segGen, "gen-approved", "approved"); await pimg(segGen, "gen-pending", "pending_review");
  await pimg(segB, "b-approved", "approved"); // photographer B is pending: hidden

  await sql`insert into homepage_banners (image_url, heading, description, sort_order, is_active) values (${img("banner")}, ${"ZZT Banner Heading " + T}, 'ZZT banner text', -1000, true)`;
  await sql`insert into homepage_banners (image_url, heading, sort_order, is_active) values (${img("banner-off")}, ${"ZZT Inactive Banner " + T}, -2000, false)`;
  await sql`insert into homepage_featured_items (photographer_id, sort_order, is_active) values (${A.id}, -1000, true)`;
  await sql`insert into homepage_featured_items (photographer_id, sort_order, is_active) values (${E.id}, -999, false)`;

  // 13 extra published packages (service v2) so a second page exists.
  for (let i = 0; i < 13; i++) {
    const ph = await photographer(`P${i}`, "approved", c4.id, s3.id);
    await sql`insert into photographer_services (photographer_id, service_id) values (${ph.id}, ${v2.id})`;
    await pkg(ph, v2.id, "standard", 20000 + i, 20000 + i, "published", `ZZTBulk${i}${T}`);
  }
}

// `--purge` removes leftovers of any earlier run (every fixture slug starts with "zzt").
const PREFIX = process.argv.includes("--purge") ? "zzt" : T;
async function cleanup() {
  const ph = await sql`select id from photographers where slug like ${PREFIX + "%-%"}`;
  const [admin] = await sql`select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1`;
  for (const p of ph) {
    await sql.begin(async (tx) => {
      // The delete guard triggers only allow the owner or an admin: act as an admin.
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: admin.id, role: "authenticated" })}, true)`;
      await tx`delete from homepage_featured_items where photographer_id = ${p.id}`;
      await tx`delete from photographers where id = ${p.id}`; // cascades packages, images, segments, phones, services
    });
  }
  await sql`delete from homepage_banners where image_url like ${`https://img.test/${PREFIX}%`}`;
  await sql`delete from services where slug like ${PREFIX + "%"}`;
  await sql`delete from smartphone_brands where slug like ${PREFIX + "%"}`; // cascades models
  await sql`delete from states where slug like ${PREFIX + "%"}`; // cascades cities
}

// ---------------------------------------------------------------- tests
const order = (html, parts) => { let at = -1; for (const p of parts) { const i = html.indexOf(p, at + 1); if (i < 0) return `missing "${p}"`; at = i; } return null; };
const cards = (html) => [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*after:absolute[^"]*"/g)].map((m) => m[1]);
const hrefOfCards = (html) => [...html.matchAll(/<a[^>]*class="[^"]*after:absolute[^"]*"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*class="[^"]*after:absolute[^"]*"/g)].map((m) => m[1] ?? m[2]);

async function dbVisibility() {
  const as = async (fn) => { try { return await sql.begin(async (tx) => { await tx`set local role anon`; return fn(tx); }); } catch (e) { return e; } };
  const rows = await as((tx) => tx`select business_name from photographers where slug like ${T + "-%"} and status <> 'approved'`);
  check("DB anon: pending/rejected photographers invisible", rows.length === 0, JSON.stringify(rows));
  const pk = await as((tx) => tx`select name from packages where name like ${"ZZT%" + T}`);
  const names = pk.map((p) => p.name);
  check("DB anon: only published packages of approved photographers", names.includes(`ZZTBasic${T}`) && !names.some((n) => /Draft|Pending|Rejected|Review/.test(n)), names.join());
  const im = await as((tx) => tx`select image_url from portfolio_images where image_url like ${`https://img.test/${T}/%`}`);
  const urls = im.map((i) => i.image_url.split("/").pop());
  check("DB anon: only approved portfolio images of approved photographers", urls.filter((u) => !u.startsWith("bday-")).sort().join() === "gen-approved.webp,svc-approved.webp", urls.join());
  const wr = await as((tx) => tx`update packages set offer_price = 1`);
  check("DB anon: cannot write", wr instanceof Error);
  const pe = await as((tx) => tx`select id from photographers limit 1`);
  check("DB anon: cannot read auth.users", (await as((tx) => tx`select id from auth.users limit 1`)) instanceof Error);
  void pe;
}

async function httpTests() {
  // ---- homepage
  let home = (await get("/")).html;
  const deadline = Date.now() + 150_000; // cached master data refreshes within ~1 minute
  while (!has(home, `ZZT Wedding ${T}`) && Date.now() < deadline) { await new Promise((r) => setTimeout(r, 5000)); home = (await get("/")).html; }
  check("home: shows the active banner heading from the DB", has(home, `ZZT Banner Heading ${T}`) && has(home, "ZZT banner text"));
  check("home: inactive banner not shown", !has(home, `ZZT Inactive Banner ${T}`));
  check("home: banner image from DB", has(home, encodeURIComponent(img("banner"))) || has(home, img("banner")));
  // The homepage lists the 4 cheapest packages per level, so seeded data can crowd fixtures out of the unfiltered page.
  // Package assertions use the homepage filtered to this run's own service (same sections, only our fixtures).
  const homeF = (await get(`/?service=${T}-wedding`)).html;
  check("home: Basic and Standard sections present, Premium hidden when empty (ORDER is checked in the browser DOM below)", /Basic(<!-- -->)? Packages/.test(homeF) && /Standard(<!-- -->)? Packages/.test(homeF) && !/Premium(<!-- -->)? Packages/.test(homeF));
  check("home: approved package + featured photographer shown", has(home, `ZZT A ${T}`));
  check("home: pending/rejected/inactive-city/no-package photographers hidden", ![`ZZT B ${T}`, `ZZT C ${T}`, `ZZT D ${T}`].some((n) => has(home, n)));
  check("home: inactive featured photographer hidden from Top Photographers", !has(home, `ZZT E ${T}`));
  check("home: Browse States + Browse Services from DB", has(home, `ZZT State ${T}`) && has(home, `ZZT Wedding ${T}`) && !has(home, `ZZT Off State ${T}`) && !has(home, `ZZT Hidden ${T}`));
  check("home: no mock content", !has(home, "picsum.photos") && !has(home, "Sagar Neel"));
  const bad = hrefOfCards(home).filter((h) => !/^\/photographers\/p\/[^/?]+(\?service=[^/]+)?$/.test(h));
  check("home: every card link opens a photographer page", bad.length === 0, bad.join());
  const pkgLinks = hrefOfCards(homeF).filter((h) => h.includes("?service="));
  check("home: package cards link to the photographer page with ?service=", pkgLinks.includes(`/photographers/p/${ids.ASlug}?service=${T}-wedding`), pkgLinks.join());
  check("home: no per-package detail routes", !/href="\/(packages|package)\//.test(home));
  check("price: discounted package shows offer + struck base + % off", /₹4,500/.test(homeF) && /<s[^>]*>₹6,000<\/s>/.test(homeF) && /25(<!-- -->)?% off/.test(homeF));
  check("price: no strikethrough when base == offer", !/<s[^>]*>₹12,000<\/s>/.test(homeF) && has(homeF, "₹12,000"));

  // ---- search
  const S = async (qs) => (await get(`/search${qs}`)).html;
  const base = `service=${T}-wedding`;
  let h = await S(`?${base}`);
  check("search: service filter lists published packages of approved photographers only", has(h, `ZZT A ${T}`) && !has(h, `ZZT B ${T}`) && !has(h, `ZZT C ${T}`) && !has(h, `ZZT D ${T}`) && !has(h, `ZZT E ${T}`) && !has(h, "ZZTReview"));
  check("search: filter form order Photography service > State > City > Smartphone > Price", order(h, ["Photography service", ">State<", ">City<", "Smartphone brand / model", "Price range"]) === null);
  check("search: filters pre-filled from URL", /<option value="[^"]*wedding"[^>]*selected|selected=""[^>]*value="[^"]*wedding"/.test(h) || has(h, `${T}-wedding`));
  h = await S(`?${base}&price=0-5000`);
  check("search: price filter uses offer_price (4,500 <= 5,000 although base is 6,000)", has(h, `ZZT A ${T}`) && has(h, "₹4,500") && !has(h, "₹12,000"));
  h = await S(`?${base}&price=5000-15000`);
  check("search: price filter uses offer_price (base 6,000 does NOT match 5,000-15,000, offer 12,000 does)", has(h, "₹12,000") && !has(h, "₹4,500"));
  h = await S(`?${base}&price=15000-30000`);
  check("search: price range with no match -> empty state", has(h, "No packages match these filters"));
  h = await S(`?${base}&level=standard`);
  check("search: level filter", has(h, "₹12,000") && !has(h, "₹4,500"));
  h = await S(`?state=${T}-state&city=${T}-city&${base}`);
  check("search: state + city + service combination", has(h, `ZZT A ${T}`));
  h = await S(`?state=${T}-state&city=${T}-offcity&${base}`);
  check("search: inactive city yields nothing", has(h, "No packages match"));
  h = await S(`?state=${T}-offstate`);
  check("search: inactive state yields nothing", has(h, "No packages match") || !has(h, "ZZT A"));
  h = await S(`?${base}&phone=${ids.m1}`);
  check("search: smartphone model filter", has(h, `ZZT A ${T}`));
  h = await S(`?${base}&phone=${ids.m2}`);
  check("search: inactive smartphone model matches nothing", has(h, "No packages match"));
  h = await S(`?${base}&phone=b:${T}-brand`);
  check("search: smartphone brand filter", has(h, `ZZT A ${T}`));
  h = await S(`?${base}&phone=not-a-uuid`);
  check("search: invalid phone value -> empty, no crash", has(h, "No packages match"));
  h = await S(`?${base}&price=bogus&level=bogus&page=-5`);
  check("search: invalid price/level/page ignored, no crash", has(h, `ZZT A ${T}`));
  h = await S(`?q=${encodeURIComponent("%")}&${base}`);
  check("search: LIKE wildcards in q are escaped", has(h, "No packages match"));
  h = await S(`?q=ZZT%20A%20${T}`);
  check("search: text query matches photographer name", has(h, `ZZT A ${T}`));
  const p1 = await S(`?service=${T}-birthday`);
  const p2 = await S(`?service=${T}-birthday&page=2`);
  check("search: pagination (12 per page, 14 birthday-service packages incl. A)", has(p1, 'aria-label="Pagination"') && hrefOfCards(p1).length === 12 && hrefOfCards(p2).length === 2, `${hrefOfCards(p1).length}/${hrefOfCards(p2).length}`);

  // ---- listings
  const L = async (path) => get(`/photographers${path}`);
  const st = `/${T}-state`;
  let r = await L("");
  const all = r.html + (await L("?page=2")).html; // 15 approved photographers => 2 pages
  check("photographers: lists approved photographers with an active location only", has(all, `ZZT A ${T}`) && has(all, `ZZT E ${T}`) && !has(all, `ZZT B ${T}`) && !has(all, `ZZT C ${T}`) && !has(all, `ZZT D ${T}`) && has(r.html, 'aria-label="Pagination"'));
  r = await L(st);
  check("state page: photographers of the state + city links", r.status === 200 && has(r.html, `ZZT A ${T}`) && has(r.html, `ZZT City ${T}`) && !has(r.html, `ZZT B ${T}`) && !has(r.html, `ZZT Off City ${T}`));
  r = await L(`${st}/${T}-city`);
  check("city page", r.status === 200 && has(r.html, `ZZT A ${T}`) && !has(r.html, `ZZT D ${T}`));
  r = await L(`${st}/${T}-wedding`);
  check("state + service page", r.status === 200 && has(r.html, `ZZT A ${T}`) && !has(r.html, `ZZT E ${T}`), "E has no published wedding package");
  r = await L(`${st}/${T}-city/${T}-wedding`);
  check("state + city + service page", r.status === 200 && has(r.html, `ZZT A ${T}`) && !has(r.html, `ZZT E ${T}`));
  r = await L(`${st}/${T}-emptycity`);
  check("empty city -> empty state, not an error", has(r.html, "No photographers found here yet") && !isNF(r.html));
  for (const [label, path] of [["unknown state", "/zzt-nope"], ["inactive state", `/${T}-offstate`], ["unknown city/service", `${st}/zzt-nope`], ["inactive city", `${st}/${T}-offcity`], ["inactive service", `${st}/${T}-hidden`], ["city + unknown service", `${st}/${T}-city/zzt-nope`], ["unknown city + service", `${st}/zzt-nope/${T}-wedding`], ["city + inactive service", `${st}/${T}-city/${T}-hidden`]]) {
    r = await L(path);
    check(`listing 404: ${label}`, isNF(r.html) && !has(r.html, `ZZT A ${T}`), `status ${r.status}`);
  }

  // ---- service page
  r = await get(`/services/${T}-wedding`);
  check("service page: packages of that service only", r.status === 200 && has(r.html, `ZZT A ${T}`) && has(r.html, "₹4,500") && !has(r.html, "ZZTBirthday"));
  r = await get(`/services/${T}-hidden`);
  check("service page: inactive service -> not found", isNF(r.html));
  r = await get(`/services/zzt-nope`);
  check("service page: unknown slug -> not found", isNF(r.html));

  // ---- photographer profile
  const pa = `/photographers/p/${ids.ASlug}`;
  r = await get(pa);
  const html = r.html;
  check("profile: name, about, location", r.status === 200 && has(html, `ZZT A ${T}`) && has(html, `About A ${T}`) && has(html, `ZZT City ${T}`) && has(html, `ZZT State ${T}`));
  check("profile: banner, profile photo and logo images", [img("A-banner"), img("A-dp"), img("A-logo")].every((u) => has(html, u) || has(html, encodeURIComponent(u))));
  check("profile: active smartphone models only", has(html, `ZZT Phone ${T}`) && !has(html, `ZZT Old Phone ${T}`) && has(html, `ZZT Brand ${T}`));
  check("profile: phone, WhatsApp and Instagram links", has(html, 'href="tel:+919876543210"') && has(html, "https://wa.me/919876543211") && has(html, "https://instagram.com/zzt"));
  check("profile: no email / user id leaked", !/@example|user_id/.test(html));
  check("profile: services with published packages only (no inactive service, no empty one)", has(html, `ZZT Wedding ${T}`) && has(html, `ZZT Birthday ${T}`) && !has(html, `ZZT Hidden ${T}`));
  check("profile: 'Other services' tabs link to the same page with ?service= (no separate pages)", has(html, "Other services") && (has(html, `href="${pa}?service=${T}-wedding"`) || has(html, `href="${pa}?service=${T}-birthday"`)) && !has(html, `href="${pa}/`));
  check("profile: shows ONE service at a time (not all packages at once)", !(has(html, `ZZTBasic${T}`) && has(html, `ZZTBirthdayBasic${T}`)));
  for (const [label, slug] of [["pending", ids.BSlug], ["rejected", ids.CSlug], ["unknown", "zzt-nope"]]) {
    r = await get(`/photographers/p/${slug}`);
    check(`profile 404: ${label} photographer`, isNF(r.html) && !has(r.html, "ZZT B ") && !has(r.html, "b-approved"));
  }

  // ---- one page per photographer; ?service= switches the service shown
  const sp = (await get(`${pa}?service=${T}-wedding`)).html;
  check("profile ?service=wedding: service name + description", has(sp, `ZZT Wedding ${T}`) && has(sp, "Wedding stories on a phone."));
  check("profile ?service=wedding: Basic and Standard shown, draft Premium replaced by 'Not offered'", has(sp, `ZZTBasic${T}`) && has(sp, `ZZTStandard${T}`) && !has(sp, "ZZTPremiumDraft") && has(sp, "Not offered for this service"));
  check("profile ?service=wedding: sections ordered Basic < Standard < Premium", order(sp, ['aria-label="Basic package"', 'aria-label="Standard package"', 'aria-label="Premium package"']) === null);
  check("profile ?service=wedding: inclusions + main package image; no description text or thumbnails", has(sp, `Incl one ZZTBasic${T}`) && has(sp, "ZZTBasic" + T.replace(/\W/g, "") + "-0") && !has(sp, `Short ZZTBasic${T}`) && !has(sp, `Detail ZZTBasic${T}`) && !has(sp, "ZZTBasic" + T.replace(/\W/g, "") + "-1"));
  check("profile ?service=wedding: prices (offer, struck base)", has(sp, "₹4,500") && /<s[^>]*>₹6,000<\/s>/.test(sp) && has(sp, "₹12,000") && !/<s[^>]*>₹12,000<\/s>/.test(sp));
  check("profile ?service=wedding: other services' packages NOT shown, birthday offered as a tab", !has(sp, `ZZTBirthdayBasic${T}`) && has(sp, `href="${pa}?service=${T}-birthday"`) && !has(sp, `href="${pa}?service=${T}-wedding"`));
  check("profile ?service=wedding: Reviews block, no draft/other-photographer packages", has(sp, ">Reviews<") && !has(sp, "ZZTHiddenSvc") && !has(sp, "ZZTPending") && !has(sp, "ZZTOffCity"));
  check("profile ?service=wedding: no per-package routes", !/href="\/packages?\//.test(sp));
  check("profile ?service=wedding: portfolio = that service's approved images only (not the whole portfolio)", has(sp, "svc-approved") && !has(sp, "gen-approved") && !/svc-pending|svc-rejected|svc-inactive|gen-pending|b-approved/.test(sp));
  check("portfolio ?service=wedding: Portfolio shows its 2 package videos (youtube-nocookie embeds), then Photos, then Reviews", has(sp, "youtube-nocookie.com/embed/aaaaaaaaaA1") && has(sp, "youtube-nocookie.com/embed/bbbbbbbbbB2") && !has(sp, "ccccccccc") && !has(sp, "ddddddddd") && order(sp, ['aria-label="Basic package"', ">Videos<", ">Photos<", ">Reviews<"]) === null);
  const bd = (await get(`${pa}?service=${T}-birthday`)).html;
  check("portfolio ?service=birthday: its own video and exactly 8 photos (10 exist)", has(bd, "embed/cccccccccC3") && !has(bd, "aaaaaaaaaA1") && (bd.replace(/<script[\s\S]*?<\/script>/g, "").match(/<img[^>]*bday-\d/g) ?? []).length === 8 && has(bd, "bday-0"));
  check("profile ?service=birthday: wedding images not loaded", !has(bd, "svc-approved") && !has(bd, "gen-approved"));
  check("profile ?service=birthday: shows birthday packages only, wedding becomes a tab", has(bd, `ZZTBirthdayBasic${T}`) && !has(bd, `ZZTBasic${T}`) && has(bd, `href="${pa}?service=${T}-wedding"`));
  const unk = (await get(`${pa}?service=zzt-nope`)).html;
  check("profile ?service=unknown falls back to the first service (no 404)", has(unk, `ZZT A ${T}`) && !isNF(unk));
  for (const [label, path] of [["service of this photographer", `${pa}/${T}-wedding`], ["pending photographer", `/photographers/p/${ids.BSlug}/${T}-wedding`]]) {
    r = await fetch(APP + path, { redirect: "manual" });
    const loc = r.headers.get("location");
    check(`old service URL redirects (308) to the profile with ?service=: ${label}`, r.status === 308 && new URL(loc, APP).pathname === path.split("/").slice(0, 4).join("/") && new URL(loc, APP).searchParams.get("service") === `${T}-wedding`, `status ${r.status} -> ${loc}`);
  }
  r = await get(`${pa}/${T}-wedding/extra`);
  check("three-segment profile URL is a 404", isNF(r.html));

  // ---- misc
  r = await get("/locations");
  check("locations: active states/cities from the DB with photographer counts", has(r.html, `ZZT City ${T}`) && !has(r.html, `ZZT Off City ${T}`) && !has(r.html, `ZZT Off State ${T}`));
  for (const path of ["/", "/search", "/photographers", pa, "/locations"]) {
    r = await get(path);
    check(`responsive meta + mobile menu on ${path.replace(T, "…")}`, has(r.html, 'name="viewport"') && has(r.html, "lg:hidden"));
  }
}

async function browserTests() {
  if (!process.env.PW_DIR) return console.log("SKIP  browser responsive tests (set PW_DIR to a playwright-core install)");
  const { chromium } = createRequire(import.meta.url)(process.env.PW_DIR);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const pa = `/photographers/p/${ids.ASlug}`;
    for (const [label, w, h] of [["mobile 375", 375, 800], ["tablet 768", 768, 1024], ["desktop 1280", 1280, 900]]) {
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
      for (const path of ["/", `/search?service=${T}-wedding`, pa, `/photographers/${T}-state`]) {
        await page.goto(APP + path, { waitUntil: "load" });
        await page.waitForSelector("h1", { timeout: 30000 }).catch(() => {}); // pages stream after the shell
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h1: document.querySelectorAll("h1").length }));
        check(`browser ${label}: no horizontal scroll on ${path.replace(T, "…").slice(0, 60)}`, m.sw <= m.iw + 1 && m.h1 >= 1, JSON.stringify(m));
      }
      if (w === 1280) {
        await page.goto(APP + "/", { waitUntil: "load" });
        await page.waitForFunction(() => document.querySelectorAll("#city").length === 1 && document.body.innerText.includes("Browse Services") && document.body.innerText.includes("Top Photographers") && document.body.innerText.includes("Basic Packages") && document.body.innerText.includes("Standard Packages"));
        const seq = await page.evaluate(() => {
          const els = [...document.querySelectorAll("header, h1, label[for=service], label[for=state], label[for=city], label[for=phone], label[for=price], h2")].filter((e) => !e.closest("[role=menu]"));
          return els.map((e) => (e.tagName === "LABEL" ? "L:" + e.textContent.trim() : e.tagName === "HEADER" ? "HEADER" : e.tagName + ":" + e.textContent.trim().slice(0, 40))).concat(document.querySelector("footer") ? ["FOOTER"] : []);
        });
        const wantOrder = ["HEADER", "H1:ZZT Banner Heading", "L:Photography service", "L:State", "L:City", "L:Smartphone brand / model", "L:Price range", "H2:Basic Packages", "H2:Standard Packages", "H2:Top Photographers", "H2:Browse States", "H2:Shoot on a smartphone", "H2:Browse Services", "FOOTER"];
        let at = -1, miss = null;
        for (const x of wantOrder) { const i = seq.findIndex((v, k) => k > at && v.startsWith(x)); if (i < 0) { miss = x; break; } at = i; }
        check("browser: home section order (header, banner, 5 filters, Basic, Standard, Top Photographers, States, Become, Services, footer)", miss === null, `missing/misordered "${miss}" in ${JSON.stringify(seq)}`);
      }
      if (w === 1280) {
        for (const path of ["/zzt-nope", `/photographers/${T}-state/zzt-nope`, `/services/${T}-hidden`, "/photographers/p/zzt-nope", `/photographers/p/${ids.BSlug}`]) {
          await page.goto(APP + (path.startsWith("/zzt") || path.startsWith("/photographers") || path.startsWith("/services") ? path : path), { waitUntil: "load" });
          await page.waitForFunction(() => document.body.innerText.includes("could not be found"), null, { timeout: 15000 }).catch(() => {});
          check(`browser: invalid slug shows the 404 page: ${path.replace(T, "…")}`, (await page.locator("body").innerText()).includes("This page could not be found"));
        }
      }
      if (w < 1024) {
        await page.goto(APP + "/");
        check(`browser ${label}: mobile menu button visible, desktop nav hidden`, (await page.getByRole("button", { name: /menu/i }).first().isVisible().catch(() => false)));
      }
      // Package card click opens that photographer's service page.
      if (w === 1280) {
        await page.goto(APP + `/search?service=${T}-wedding`, { waitUntil: "load" });
        await page.locator(`a[href="${pa}?service=${T}-wedding"]`).first().click();
        await page.waitForURL((u) => u.pathname === pa);
        await page.waitForFunction((n) => document.querySelector("h1")?.innerText.includes(n), `ZZT A ${T}`);
        const h1 = await page.locator("h1").first().innerText();
        check("browser: clicking a package card opens the photographer's page", h1.includes(`ZZT A ${T}`), `${page.url()} h1=${h1}`);
        // Home filters: submit with a service + price navigates with those params.
        // Master data is cached for ~1 minute: reload until the fixture service is offered by the filter form.
        for (let i = 0; i < 15; i++) {
          await page.goto(APP + "/", { waitUntil: "load" });
          await page.waitForFunction(() => document.querySelectorAll("#city").length === 1);
          if (await page.locator(`#service option[value="${T}-wedding"]`).count()) break;
          await page.waitForTimeout(8000);
        }
        await page.selectOption("#service", `${T}-wedding`);
        await page.selectOption("#state", `${T}-state`);
        await page.selectOption("#city", `${T}-city`);
        await page.selectOption("#price", "0-5000");
        await page.getByRole("button", { name: "Search" }).click();
        await page.waitForURL(/price=0-5000/);
        const url = new URL(page.url());
        check("browser: home filter form submits service/state/city/price", url.searchParams.get("service") === `${T}-wedding` && url.searchParams.get("city") === `${T}-city` && url.searchParams.get("price") === "0-5000", url.search);
      }
    }
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- run
if (process.argv.includes("--purge")) { await cleanup(); await sql.end(); console.log("purged"); process.exit(0); }
let server;
try {
  await seed();
  await dbVisibility();
  server = spawn("npx", ["next", "start", "-p", PORT], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { await fetch(APP); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  await httpTests();
  await browserTests();
} catch (e) {
  console.error("ERROR", e);
  failed++;
} finally {
  if (server) { spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true, stdio: "ignore" }); }
  if (!process.argv.includes("--keep")) await cleanup().catch((e) => { console.error("CLEANUP FAILED", e); failed++; });
  await sql.end();
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
