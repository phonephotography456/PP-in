// Phase 8 SEO tests against the LOCAL database and a production build (`npm run build` first).
// Inserts committed fixtures (slugs start with "zzs<tag>"), starts `next start`, checks HTTP status, metadata, sitemap,
// robots and (optional) responsive layout in headless Chrome, then deletes every fixture row.
//   PW_DIR=<dir>/node_modules/playwright-core node scripts/test-seo.mjs        (add --purge to remove leftovers)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const PORT = process.env.TEST_PORT ?? "3109";
const APP = `http://localhost:${PORT}`;
const ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonephotography.in").replace(/\/+$/, "");
const T = `zzs${Date.now().toString(36)}`;
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`); if (!ok) failed++; };
// A social-crawler UA makes Next put metadata in <head>; a plain UA gets the same tags streamed into <body>.
const get = async (path, ua = "facebookexternalhit/1.1") => { const r = await fetch(APP + path, { redirect: "manual", headers: { "user-agent": ua } }); return { status: r.status, html: await r.text(), headers: r.headers }; };
const attr = (html, re) => html.match(re)?.[1];
const meta = (html) => ({
  title: attr(html, /<title>([^<]*)<\/title>/),
  desc: attr(html, /<meta name="description" content="([^"]*)"/),
  robots: attr(html, /<meta name="robots" content="([^"]*)"/),
  canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
  ogImage: attr(html, /<meta property="og:image" content="([^"]*)"/),
  ogUrl: attr(html, /<meta property="og:url" content="([^"]*)"/),
  ogTitle: attr(html, /<meta property="og:title" content="([^"]*)"/),
  twCard: attr(html, /<meta name="twitter:card" content="([^"]*)"/),
});
const img = (n) => `https://img.test/${T}/${n}.webp`;
const ids = {};

async function seed() {
  const [s1] = await sql`insert into states (name, slug, is_active) values (${"ZZS State " + T}, ${T + "-state"}, true) returning id`;
  const [s2] = await sql`insert into states (name, slug, is_active) values (${"ZZS Bulk " + T}, ${T + "-bulk"}, true) returning id`;
  const [c1] = await sql`insert into cities (state_id, name, slug, is_active) values (${s1.id}, ${"ZZS City " + T}, ${T + "-city"}, true) returning id`;
  await sql`insert into cities (state_id, name, slug, is_active) values (${s1.id}, ${"ZZS Empty " + T}, ${T + "-empty"}, true)`;
  const [c3] = await sql`insert into cities (state_id, name, slug, is_active) values (${s1.id}, ${"ZZS Off " + T}, ${T + "-off"}, false) returning id`;
  const [c4] = await sql`insert into cities (state_id, name, slug, is_active) values (${s2.id}, ${"ZZS Bulk City " + T}, ${T + "-bulkcity"}, true) returning id`;
  const [v1] = await sql`insert into services (name, slug, description, status) values (${"ZZS Wedding " + T}, ${T + "-wedding"}, 'Wedding stories.', 'active') returning id`;
  const [v2] = await sql`insert into services (name, slug, status) values (${"ZZS Draft Only " + T}, ${T + "-draftonly"}, 'active') returning id`;
  const [v3] = await sql`insert into services (name, slug, status) values (${"ZZS Hidden " + T}, ${T + "-hidden"}, 'inactive') returning id`;
  const ph = async (key, status, cityId, stateId, o = {}) => {
    const bare = !!o.bare; // no about / images / social links: tests incomplete data
    const [p] = await sql`insert into photographers (user_id, business_name, slug, status, about, phone, whatsapp, banner_url, profile_photo_url, instagram_url, state_id, city_id)
      values (${randomUUID()}, ${o.name ?? `ZZS ${key} ${T}`}, ${`${T}-${key.toLowerCase()}`}, ${status}, ${bare ? null : `About ${key} ${T}`}, '9876543210', '9876543210', ${bare ? null : img(key + "-banner")}, ${bare ? null : img(key + "-dp")}, ${key === "A" ? "https://instagram.com/zzs" + T : null}, ${stateId}, ${cityId}) returning id, slug`;
    ids[key] = p.slug;
    return p;
  };
  const pkg = async (p, svc, level, status, name) => {
    const [k] = await sql`insert into packages (photographer_id, service_id, level, name, base_price, offer_price, status, short_description, inclusions)
      values (${p.id}, ${svc}, ${level}, ${name}, 6000, 4500, 'draft', ${`Short ${name}`}, 'One') returning id`;
    for (let i = 0; i < 3; i++) await sql`insert into package_images (package_id, image_url, alt_text, sort_order) values (${k.id}, ${img(i ? `${name}-${i}` : name)}, 'alt', ${i})`;
    if (status !== "draft") await sql`update packages set status = ${status} where id = ${k.id}`;
  };
  const A = await ph("A", "approved", c1.id, s1.id), B = await ph("B", "pending", c1.id, s1.id), E = await ph("E", "approved", c1.id, s1.id), D = await ph("D", "approved", c3.id, s1.id);
  for (const p of [A, B, E, D]) await sql`insert into photographer_services (photographer_id, service_id) values (${p.id}, ${v1.id})`;
  await pkg(A, v1.id, "basic", "published", `pkgA${T}`);
  await pkg(A, v2.id, "basic", "draft", `draftA${T}`); // draft: hidden
  await pkg(A, v3.id, "basic", "published", `hiddenA${T}`); // inactive service: hidden
  await pkg(B, v1.id, "basic", "published", `pkgB${T}`); // pending photographer: hidden
  await pkg(D, v1.id, "basic", "published", `pkgD${T}`); // approved, inactive city
  await pkg(E, v1.id, "premium", "pending_review", `pendE${T}`); // not published
  const F = await ph("F", "approved", c1.id, s1.id, { bare: true });
  const G = await ph("G", "approved", c1.id, s1.id, { name: `ZZS </script><b>G ${T}` });
  for (const p of [F, G]) await sql`insert into photographer_services (photographer_id, service_id) values (${p.id}, ${v1.id})`;
  await pkg(F, v1.id, "basic", "published", `pkgF${T}`);
  await pkg(G, v1.id, "basic", "published", `pkgG${T}`);
  const rv = (n, status) => sql`insert into service_reviews (reviewer_user_id, photographer_id, service_id, rating, title, reviewer_name, status) values (${randomUUID()}, ${A.id}, ${v1.id}, ${n}, ${"Review " + status}, 'Tester', ${status})`;
  await rv(4, "approved"); await rv(1, "pending"); await rv(1, "rejected"); // only the approved one may count
  for (let i = 0; i < 13; i++) await ph(`P${i}`, "approved", c4.id, s2.id);
}

const PREFIX = process.argv.includes("--purge") ? "zzs" : T;
async function cleanup() {
  const rows = await sql`select id from photographers where slug like ${PREFIX + "%-%"}`;
  const [admin] = await sql`select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1`;
  for (const p of rows) {
    await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: admin.id, role: "authenticated" })}, true)`;
      await tx`delete from photographers where id = ${p.id}`;
    });
  }
  await sql`delete from services where slug like ${PREFIX + "%"}`;
  await sql`delete from states where slug like ${PREFIX + "%"}`;
}

async function httpTests() {
  const st = `/photographers/${T}-state`, ci = `${st}/${T}-city`, p = (k) => `/photographers/p/${ids[k]}`, wed = `${T}-wedding`;
  const short = (s) => s.replaceAll(T, "…");

  // ---- HTTP status (real response codes, not page appearance)
  const status = {
    200: ["/", "/photographers", "/search", "/locations", `/services/${wed}`, `/services/${T}-draftonly`, st, ci, `${st}/${wed}`, `${ci}/${wed}`, `${st}/${T}-empty`, `${st}/${T}-draftonly`, p("A"), `${p("A")}?service=${wed}`, p("E"), "/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions", "/earn", "/login", "/photographer/login", "/reviewer/login"],
    404: ["/services/zzs-nope", `/services/${T}-hidden`, "/photographers/zzs-nope", `${st}/zzs-nope`, `${ci}/zzs-nope`, `${ci}/${T}-hidden`, `${st}/${T}-off`, `${st}/${T}-off/${wed}`, `${st}/zzs-nope/${wed}`, "/photographers/zzs-nope/zzs-nope/zzs-nope", `${ci}/${wed}/extra`,
      "/photographers/p/zzs-nope", p("B"), `${p("A")}/${wed}/extra`, "/photographers/p"],
  };
  for (const [code, paths] of Object.entries(status)) {
    for (const path of paths) {
      const r = await get(path);
      check(`HTTP ${code} ${short(path)}`, r.status === Number(code), `got ${r.status}`);
      if (code === "404") check(`  404 keeps the not-found design + noindex: ${short(path)}`, r.html.includes("This page could not be found") && /name="robots" content="noindex"/.test(r.html));
    }
  }

  // ---- metadata per route type
  const routes = {
    home: "/", photographers: "/photographers", locations: "/locations", service: `/services/${wed}`, state: st, city: ci, stateService: `${st}/${wed}`, cityService: `${ci}/${wed}`,
    profile: p("A"), about: "/about-us", contact: "/contact-us", privacy: "/privacy-policy", terms: "/terms-and-conditions", earn: "/earn",
  };
  const m = {};
  for (const [k, path] of Object.entries(routes)) {
    const x = (m[k] = meta((await get(path)).html));
    const canon = path === "/" ? ORIGIN : ORIGIN + path;
    check(`meta ${k}: title, description, canonical, index, OG, twitter`, !!x.title && !!x.desc && x.canonical === canon && x.robots === "index, follow" && x.ogUrl === canon && !!x.ogTitle && !!x.twCard, JSON.stringify(x));
  }
  const titles = Object.values(m).map((x) => x.title), descs = Object.values(m).map((x) => x.desc);
  check("all titles unique", new Set(titles).size === titles.length, titles.join(" | "));
  check("all descriptions unique", new Set(descs).size === descs.length);
  check("descriptions <= 160 chars", descs.every((d) => d.length <= 160));
  check("dynamic metadata uses DB content", m.profile.title.includes(`ZZS A ${T}`) && m.state.title.includes(`ZZS State ${T}`) && m.cityService.title.includes(`ZZS Wedding ${T}`) && /Compare 3 .* packages shot/.test(m.service.desc), JSON.stringify([m.profile.title, m.service.desc]));
  check("OG image: profile uses the uploaded banner", m.profile.ogImage === img("A-banner") && m.profile.twCard === "summary_large_image", String(m.profile.ogImage));
  check("OG image: none for pages without a real image", !m.about.ogImage && m.about.twCard === "summary");

  // ---- indexability decisions
  const nx = async (label, path, canonical, index) => {
    const x = meta((await get(path)).html);
    check(`${index ? "index" : "noindex"}: ${label}`, x.robots === (index ? "index, follow" : "noindex, follow") && x.canonical === ORIGIN + canonical, JSON.stringify(x));
  };
  await nx("empty city (no photographers)", `${st}/${T}-empty`, `${st}/${T}-empty`, false);
  await nx("state/service with no photographers", `${st}/${T}-draftonly`, `${st}/${T}-draftonly`, false);
  await nx("service with only draft packages", `/services/${T}-draftonly`, `/services/${T}-draftonly`, false);
  await nx("profile with no published package", p("E"), p("E"), false);
  await nx("service page filtered by query (canonical = clean URL)", `/services/${wed}?price=0-5000&city=x`, `/services/${wed}`, false);
  await nx("homepage filtered by query", "/?service=x", "/".replace(/^\/$/, ""), false);
  await nx("/search", "/search?q=x", "/search", false);
  const bulk = `/photographers/${T}-bulk`;
  await nx("bulk state page 1 (13 photographers)", bulk, bulk, true);
  await nx("bulk state page 2", `${bulk}?page=2`, `${bulk}?page=2`, true);
  await nx("bulk state page 3 (beyond last page)", `${bulk}?page=3`, `${bulk}?page=3`, false);
  for (const path of ["/photographer/login", "/photographer/register", "/photographer/verify", "/photographer/forgot-password", "/photographer/reset-password", "/reviewer/login", "/reviewer/register", "/reviewer/verify", "/reviewer/forgot-password", "/reviewer/reset-password", "/login"]) {
    const x = meta((await get(path)).html);
    check(`private noindex: ${path}`, /noindex/.test(x.robots ?? ""), JSON.stringify(x));
  }
  for (const path of ["/admin/dashboard", "/photographer/dashboard", "/photographer/profile", "/photographer/services"]) {
    const r = await get(path);
    check(`private not served to anonymous: ${path}`, r.status === 307 && /login/.test(r.headers.get("location") ?? ""), `status ${r.status}`);
  }

  // ---- robots.txt
  const robots = (await get("/robots.txt")).html;
  check("robots.txt: allows /, disallows admin/panel/auth/api, lists sitemap", /User-Agent: \*\s+Allow: \//.test(robots) && ["/admin", "/photographer/", "/reviewer/", "/login", "/api/"].every((d) => robots.includes(`Disallow: ${d}\n`)) && robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`), robots);
  check("robots.txt: does not block public pages or assets", !/Disallow: \/(photographers|services|locations|_next|seed|about-us|search)?\s*$/m.test(robots), robots);

  // ---- sitemap
  const sm = await get("/sitemap.xml");
  const locs = [...sm.html.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  const has = (path) => locs.includes(ORIGIN + path);
  check("sitemap: 200 XML", sm.status === 200 && /xml/.test(sm.headers.get("content-type") ?? ""));
  check("sitemap: no duplicate URLs", new Set(locs).size === locs.length);
  check("sitemap: canonical origin, no query/fragment/trailing slash", locs.every((l) => l.startsWith(ORIGIN) && !/[?#]/.test(l) && !l.endsWith("/")));
  check("sitemap: static pages", locs.includes(ORIGIN) && ["/photographers", "/locations", "/earn", "/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions"].every(has));
  for (const [label, path] of [["service page", `/services/${wed}`], ["state", st], ["city", ci], ["state+service", `${st}/${wed}`], ["city+service", `${ci}/${wed}`], ["approved profile", p("A")], ["bulk state", bulk]]) check(`sitemap includes ${label}`, has(path));
  const excluded = [
    ["pending photographer profile", p("B")],
    ["approved profile with nothing published (noindex)", p("E")], ["empty city", `${st}/${T}-empty`], ["inactive city", `${st}/${T}-off`], ["state+service with no photographers", `${st}/${T}-draftonly`],
    ["service with only draft packages", `/services/${T}-draftonly`], ["inactive service", `/services/${T}-hidden`],
    ["/search", "/search"], ["/login", "/login"], ["/admin/dashboard", "/admin/dashboard"], ["/photographer/login", "/photographer/login"], ["/reviewer/login", "/reviewer/login"],
  ];
  for (const [label, path] of excluded) check(`sitemap excludes ${label}`, !has(path));
  check("sitemap: no auth/admin/panel URLs", !locs.some((l) => /\/(admin|login|reviewer)(\/|$)|\/photographer\//.test(l)));
  // Every sitemap URL answers 200, is indexable and self-canonical (sampled: all fixture URLs + all seeded URLs).
  const mine = locs.filter((l) => l.includes(T) || !l.includes("zzs"));
  let bad = [];
  for (const l of mine) {
    const r = await get(l.slice(ORIGIN.length) || "/");
    const x = meta(r.html);
    if (r.status !== 200 || x.robots !== "index, follow" || x.canonical !== l) bad.push(`${l} ${r.status} ${x.robots} ${x.canonical}`);
  }
  check(`sitemap: all ${mine.length} URLs return 200, index,follow and are self-canonical`, bad.length === 0, bad.slice(0, 5).join("\n"));
}

const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return { parseError: m[1].slice(0, 400) }; } });
const flat = (blocks) => blocks.flatMap((b) => b["@graph"] ?? [b]);

async function jsonLdTests() {
  const st = `/photographers/${T}-state`, ci = `${st}/${T}-city`, p = (k) => `/photographers/p/${ids[k]}`, wed = `${T}-wedding`;
  const page = async (path) => { const r = await get(path, "Mozilla/5.0"); return { ...r, blocks: ldBlocks(r.html) }; };

  // ---- homepage
  let r = await page("/");
  const n = flat(r.blocks);
  check("JSON-LD home: valid, WebSite + Organization with canonical url", r.blocks.length === 1 && ["WebSite", "Organization"].every((t) => n.some((x) => x["@type"] === t && x.name === "PhonePhotography.in" && x.url === ORIGIN)), JSON.stringify(r.blocks));
  check("JSON-LD home: no invented logo, address, phone or rating", !/"(logo|address|telephone|aggregateRating|sameAs)"/.test(JSON.stringify(r.blocks)));

  // ---- profile with full data
  r = await page(p("A"));
  let b = r.blocks[0];
  const url = ORIGIN + p("A");
  check("JSON-LD profile: single LocalBusiness with DB values", r.blocks.filter((x) => x["@type"] === "LocalBusiness").length === 1 && b["@type"] === "LocalBusiness" && b["@id"] === url + "#business" && b.url === url && b.name === `ZZS A ${T}` && b.description === `About A ${T}` && b.areaServed?.name === `ZZS City ${T}`, JSON.stringify(b));
  check("JSON-LD profile: real https image, sameAs from visible social link", b.image === img("A-banner") && b.sameAs?.join() === `https://instagram.com/zzs${T}`, JSON.stringify(b));
  check("JSON-LD profile: no phone, address, rating or review data", !/telephone|address|aggregateRating|review|9876543210/i.test(JSON.stringify(b)));
  check("JSON-LD profile: values match the rendered page", r.html.includes(`ZZS A ${T}`) && r.html.includes(`About A ${T}`));

  // ---- profile with incomplete data
  r = await page(p("F"));
  b = r.blocks[0];
  check("JSON-LD profile (incomplete data): valid, optional keys omitted, no null/empty values", r.blocks.filter((x) => x["@type"] === "LocalBusiness").length === 1 && b["@type"] === "LocalBusiness" && b.name === `ZZS F ${T}` && !("image" in b) && !("description" in b) && !("sameAs" in b) && !/null|""|\[\]/.test(JSON.stringify(b)), JSON.stringify(b));

  // ---- escaping
  r = await page(p("G"));
  check("JSON-LD escapes </script> in data (valid JSON, no early tag close)", r.blocks.filter((x) => x["@type"] === "LocalBusiness").length === 1 && r.blocks[0].name === `ZZS </script><b>G ${T}` && !r.html.includes("</script><b>G"), JSON.stringify(r.blocks).slice(0, 500) + " | raw idx " + r.html.indexOf("</script><b>G") + " ctx " + r.html.slice(Math.max(0, r.html.indexOf("</script><b>G") - 80), r.html.indexOf("</script><b>G") + 40));

  // ---- placeholder images are never emitted
  r = await page("/photographers/p/demo-delhi-frames");
  check("JSON-LD seed profile: placeholder /seed/ images not shared as photos", r.blocks.filter((x) => x["@type"] === "LocalBusiness").length === 1 && !("image" in r.blocks[0]) && !JSON.stringify(r.blocks).includes("/seed/"), JSON.stringify(r.blocks));

  // ---- service page with approved + pending + rejected reviews
  r = await page(`${p("A")}?service=${wed}`);
  b = r.blocks.find((x) => x["@type"] === "Service");
  check("JSON-LD service: profile LocalBusiness + one Service, url selects the service, provider references the profile", r.blocks.length === 2 && b?.["@type"] === "Service" && b.url === url + "?service=" + wed && b.provider?.["@id"] === url + "#business" && b.provider.name === `ZZS A ${T}` && b.serviceType === `ZZS Wedding ${T}` && b.name === `ZZS Wedding ${T} by ZZS A ${T}`, JSON.stringify(b));
  check("JSON-LD service: offers from the published package only (4500 INR)", b.offers?.length === 1 && b.offers[0].price === 4500 && b.offers[0].priceCurrency === "INR" && !JSON.stringify(b).includes("draftA") && !JSON.stringify(b).includes("hiddenA"), JSON.stringify(b.offers));
  check("JSON-LD service: aggregateRating counts approved reviews only (4 / 1)", b.aggregateRating?.ratingValue === 4 && b.aggregateRating.reviewCount === 1 && b.aggregateRating.bestRating === 5, JSON.stringify(b.aggregateRating));
  const text = r.html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  check("JSON-LD service: rating and count match the visible page", text.includes("4.0 (1 review)") && text.includes("₹4,500"), text.slice(text.indexOf("Reviews"), text.indexOf("Reviews") + 120));
  check("JSON-LD service: no private data or review bodies", !/9876543210|Tester|Review (pending|rejected|approved)/.test(JSON.stringify(b)));
  check("JSON-LD service: real https image only", b.image === img(`pkgA${T}`), String(b.image));
  r = await page(`${p("F")}?service=${wed}`);
  b = r.blocks.find((x) => x["@type"] === "Service");
  check("JSON-LD service without reviews/images: no aggregateRating, package image only, valid", r.blocks.length === 2 && b["@type"] === "Service" && !("aggregateRating" in b) && b.image === img(`pkgF${T}`), JSON.stringify(b));

  // ---- breadcrumbs mirror the visible trail
  const S = `ZZS State ${T}`, C = `ZZS City ${T}`, W = `ZZS Wedding ${T}`;
  const crumbCases = [
    ["state", st, [["Photographers", "/photographers"], [S, st]]],
    ["city", ci, [["Photographers", "/photographers"], [S, st], [C, ci]]],
    ["state+service", `${st}/${wed}`, [["Photographers", "/photographers"], [S, st], [W, `${st}/${wed}`]]],
    ["city+service", `${ci}/${wed}`, [["Photographers", "/photographers"], [S, st], [C, ci], [W, `${ci}/${wed}`]]],
  ];
  for (const [label, path, want] of crumbCases) {
    r = await page(path);
    const bc = r.blocks[0];
    const visible = (r.html.match(/<nav aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/ \/ /g, "/").trim();
    const ok = r.blocks.length === 1 && bc["@type"] === "BreadcrumbList" && bc.itemListElement.length === want.length
      && want.every(([name, pth], i) => bc.itemListElement[i].position === i + 1 && bc.itemListElement[i].name === name && bc.itemListElement[i].item === ORIGIN + pth)
      && visible === want.map(([name]) => name).join("/");
    check(`JSON-LD breadcrumb ${label}: names/urls/positions match the visible breadcrumb`, ok, `${JSON.stringify(bc)} visible="${visible}"`);
  }

  // ---- pages that must not carry structured data
  for (const path of ["/search", "/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions", "/earn", "/locations", "/login", "/photographer/login", `/services/${wed}`, "/zzs-nope"]) {
    check(`no JSON-LD on ${path.replaceAll(T, "…")}`, (await page(path)).blocks.length === 0);
  }
  // ---- hidden content never appears in structured data
  for (const path of [p("A"), `${p("A")}?service=${wed}`, st, ci]) {
    const j = JSON.stringify((await page(path)).blocks);
    check(`no pending/rejected/draft names in JSON-LD: ${path.replaceAll(T, "…")}`, !/ZZS B |pkgB|pkgD|ZZS Off|draftA|hiddenA/.test(j));
  }
}

async function browserTests() {
  if (!process.env.PW_DIR) return console.log("SKIP  browser tests (set PW_DIR to a playwright-core install)");
  const { chromium } = createRequire(import.meta.url)(process.env.PW_DIR);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    for (const [label, w, h] of [["mobile 375", 375, 800], ["tablet 768", 768, 1024], ["desktop 1280", 1280, 900]]) {
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
      for (const path of ["/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions"]) {
        await page.goto(APP + path, { waitUntil: "load" });
        const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h1: document.querySelectorAll("h1").length, hasHeader: !!document.querySelector("header"), hasFooter: !!document.querySelector("footer") }));
        check(`browser ${label}: ${path} no horizontal scroll, one h1, header + footer`, d.sw <= d.iw + 1 && d.h1 === 1 && d.hasHeader && d.hasFooter, JSON.stringify(d));
      }
      if (w === 375) {
        const resp = await page.goto(APP + "/photographers/p/zzs-nope", { waitUntil: "load" });
        check("browser: invalid slug shows 404 page with HTTP 404", resp.status() === 404 && (await page.locator("body").innerText()).includes("This page could not be found"), `status ${resp.status()}`);
        await page.goto(APP + "/contact-us", { waitUntil: "load" });
        const txt = await page.locator("body").innerText();
        check("contact page: no fake contact form, placeholders clearly marked", !(await page.locator("article form").count()) && txt.includes("to be added before launch") && !txt.includes("00000"));
      }
      await page.context().close();
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
  server = spawn("npx", ["next", "start", "-p", PORT], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { await fetch(APP); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  await httpTests();
  await jsonLdTests();
  await browserTests();
} catch (e) {
  console.error("ERROR", e);
  failed++;
} finally {
  if (server) spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
  await cleanup().catch((e) => { console.error("CLEANUP FAILED", e); failed++; });
  await sql.end();
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
