// LOCAL development seed: master data + clearly-marked demo application data + test accounts.
// Idempotent (upserts by natural keys). Refuses to run against anything but a local Supabase.
//   npm run seed:dev      (or: node --env-file=.env.local scripts/seed-dev.mjs)
// Demo rows: photographer slugs start with "demo-", names end with "(Demo)", account emails use @seed.phonephotography.test.
// Generated passwords go to ./seed-credentials.local.json (git-ignored), never to source.
// Images: generated placeholder WebP files in public/seed (served by Next as /seed/...). They are not real photographs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL: SB_URL, SUPABASE_SERVICE_ROLE_KEY: SB_KEY } = process.env;
const LOCAL = /^(127\.0\.0\.1|localhost)$/;
if (!DATABASE_URL || !SB_URL || !SB_KEY || !LOCAL.test(new URL(DATABASE_URL).hostname) || !LOCAL.test(new URL(SB_URL).hostname)) {
  throw new Error("Refusing to seed: DATABASE_URL and NEXT_PUBLIC_SUPABASE_URL must both point at local Supabase.");
}
const sql = postgres(DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const slugify = (s) => s.toLowerCase().replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DOMAIN = "seed.phonephotography.test";
const CRED_FILE = "seed-credentials.local.json";

// ======================================================================= master data
const STATES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati"], "Arunachal Pradesh": ["Itanagar", "Naharlagun"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar"], Bihar: ["Patna", "Gaya", "Bhagalpur"], Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur"],
  Goa: ["Panaji", "Margao"], Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"], Haryana: ["Gurugram", "Faridabad", "Panipat"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala"], Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"], Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior"], Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"], Manipur: ["Imphal"],
  Meghalaya: ["Shillong"], Mizoram: ["Aizawl"], Nagaland: ["Kohima", "Dimapur"], Odisha: ["Bhubaneswar", "Cuttack", "Puri"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar"], Rajasthan: ["Jaipur", "Udaipur", "Jodhpur"], Sikkim: ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"], Telangana: ["Hyderabad", "Warangal"], Tripura: ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Varanasi", "Agra"], Uttarakhand: ["Dehradun", "Rishikesh"],
  "West Bengal": ["Kolkata", "Siliguri", "Durgapur"],
  // Union territories
  "Andaman and Nicobar Islands": ["Port Blair"], Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa"], Delhi: ["New Delhi", "Dwarka"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"], Ladakh: ["Leh", "Kargil"], Lakshadweep: ["Kavaratti"], Puducherry: ["Puducherry"],
};

const SERVICES = [
  ["Wedding", "Full-day wedding stories shot on flagship phones: rituals, portraits and candid moments.", 1],
  ["Pre-Wedding", "Couple shoots at scenic locations, planned and styled with the photographer.", 2],
  ["Engagement", "Ring ceremonies and engagement portraits.", 3],
  ["Birthday", "Kids' and adults' birthday parties, covered start to finish.", 4],
  ["Maternity & Newborn", "Gentle maternity, baby-shower and newborn sessions.", 5],
  ["Portrait", "Personal, family and professional portraits.", 6],
  ["Event", "Corporate and social events, launches and celebrations.", 7],
  ["Product", "Clean product and e-commerce photography.", 8],
  ["Real Estate", "Interiors and property listings.", 9],
  ["Fashion", "Lookbooks and model portfolios.", 10],
];

const BRANDS = {
  Apple: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 14", "iPhone 13"],
  Samsung: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy Z Fold5", "Galaxy A55"],
  Google: ["Pixel 8 Pro", "Pixel 8", "Pixel 8a", "Pixel 7 Pro"],
  OnePlus: ["OnePlus 12", "OnePlus 12R", "OnePlus 11", "OnePlus Nord CE4"],
  Xiaomi: ["Xiaomi 14", "Xiaomi 14 Ultra", "Xiaomi 13T Pro"],
  Vivo: ["Vivo X100 Pro", "Vivo V30 Pro"],
  Oppo: ["Oppo Find X7 Ultra", "Oppo Reno11 Pro"],
  Realme: ["Realme GT 6", "Realme 12 Pro+"],
  Motorola: ["Motorola Edge 50 Pro", "Motorola Razr 40 Ultra"],
  Nothing: ["Nothing Phone (2)", "Nothing Phone (2a)"],
};

// ======================================================================= demo application data
// Package prices per service: [basic, standard, premium] base price in INR. offer = base minus a discount.
const PRICES = {
  wedding: [18000, 35000, 65000], "pre-wedding": [8000, 15000, 28000], engagement: [6000, 12000, 22000], birthday: [3000, 6000, 11000],
  "maternity-newborn": [4500, 8500, 15000], portrait: [2000, 4000, 7500], event: [5000, 10000, 18000], product: [3500, 7000, 13000],
  "real-estate": [3000, 6000, 10000], fashion: [6000, 12000, 20000],
};
const TIER = {
  basic: { name: "Basic", hours: 2, shots: 25 }, standard: { name: "Standard", hours: 4, shots: 60 }, premium: { name: "Premium", hours: 8, shots: 150 },
};

// pkgStatus: per-service overrides of [basic, standard, premium] statuses (default: all published).
const PH = [
  { key: "mumbai-moments", name: "Mumbai Moments", city: "mumbai", state: "maharashtra", status: "approved", services: ["wedding", "pre-wedding", "birthday"], phones: ["iPhone 15 Pro Max", "Galaxy S24 Ultra"], f: 1.2, about: "Mumbai-based team shooting weddings and celebrations entirely on flagship phones. Fast delivery, natural colour, no heavy editing." },
  { key: "bengaluru-lens", name: "Bengaluru Lens Co", city: "bengaluru", state: "karnataka", status: "approved", services: ["wedding", "portrait", "product"], phones: ["iPhone 15 Pro", "Pixel 8 Pro"], f: 1.1, pkgStatus: { portrait: ["published", "draft", "rejected"] }, about: "Portrait and product specialists from Bengaluru's startup scene. Clean light, quick turnaround, happy to travel across Karnataka." },
  { key: "delhi-frames", name: "Delhi Frames", city: "new-delhi", state: "delhi", status: "approved", services: ["wedding", "engagement", "event"], phones: ["Galaxy S24 Ultra", "iPhone 14 Pro"], f: 1.15, about: "Delhi NCR photographers for big-fat weddings, engagements and corporate events." },
  { key: "pune-pixel", name: "Pune Pixel Studio", city: "pune", state: "maharashtra", status: "approved", services: ["maternity-newborn", "birthday", "portrait"], phones: ["Pixel 8 Pro", "OnePlus 12"], f: 0.95, about: "Family-focused studio in Pune. Gentle maternity and newborn sessions, lively birthday coverage." },
  { key: "chennai-clicks", name: "Chennai Clicks", city: "chennai", state: "tamil-nadu", status: "approved", services: ["wedding", "pre-wedding"], phones: ["iPhone 15 Pro", "Xiaomi 14 Ultra"], f: 0.9, about: "South Indian weddings and pre-wedding shoots, from temple rituals to Marina beach sunrises." },
  { key: "hyderabad-hues", name: "Hyderabad Hues", city: "hyderabad", state: "telangana", status: "approved", services: ["wedding", "event", "real-estate"], phones: ["Galaxy S24 Ultra", "OnePlus 12"], f: 1.0, about: "Hyderabad team covering weddings, launches and property listings with consistent colour and fast delivery." },
  { key: "kolkata-kadam", name: "Kolkata Kadam", city: "kolkata", state: "west-bengal", status: "approved", services: ["portrait", "pre-wedding", "engagement"], phones: ["iPhone 14 Pro", "Pixel 8"], f: 0.85, about: "Street-style portraits and pre-wedding stories across Kolkata's heritage lanes." },
  { key: "jaipur-journals", name: "Jaipur Journals", city: "jaipur", state: "rajasthan", status: "approved", services: ["pre-wedding", "wedding"], phones: ["iPhone 15 Pro Max", "Pixel 8 Pro"], f: 1.05, pkgStatus: { wedding: ["pending_review", "pending_review", "pending_review"] }, about: "Palaces, forts and desert dunes: destination pre-wedding shoots around Jaipur. Wedding packages are awaiting admin review." },
  { key: "ahmedabad-aperture", name: "Ahmedabad Aperture", city: "ahmedabad", state: "gujarat", status: "pending", services: ["wedding", "birthday"], phones: ["Galaxy S24"], f: 0.9, pkgStatus: { wedding: ["pending_review", "pending_review", "pending_review"], birthday: ["draft", "draft", "draft"] }, about: "New photographer awaiting approval." },
  { key: "lucknow-lens", name: "Lucknow Lens", city: "lucknow", state: "uttar-pradesh", status: "rejected", services: ["portrait"], phones: ["Xiaomi 14"], f: 0.8, pkgStatus: { portrait: ["rejected", "rejected", "rejected"] }, about: "Profile was rejected during review." },
  { key: "kochi-candid", name: "Kochi Candid Co", city: "kochi", state: "kerala", status: "inactive", services: ["wedding"], phones: ["iPhone 15"], f: 0.95, about: "Deactivated by admin; kept for history." },
];

// [customerIdx, photographerKey, serviceSlug, rating, title, text, status]. Targets must be approved photographers with a published package.
const REVIEWS = [
  [0, "mumbai-moments", "wedding", 5, "Captured every moment", "The team shot our whole wedding on iPhones and the album looks cinematic. Delivered in four days.", "approved"],
  [1, "mumbai-moments", "wedding", 4, "Great coverage, slight delay", "Loved the candids. Delivery took a week instead of the promised five days.", "approved"],
  [2, "mumbai-moments", "birthday", 5, "Kids had a blast", "Super patient with a dozen children. Photos were bright and natural.", "approved"],
  [0, "bengaluru-lens", "product", 5, "Perfect catalogue shots", "Clean white backgrounds and consistent light for 40 products in a single afternoon.", "approved"],
  [3, "bengaluru-lens", "wedding", 4, "Beautiful portraits", "Family portraits were the highlight.", "approved"],
  [1, "delhi-frames", "engagement", 5, "Elegant engagement album", null, "approved"],
  [2, "delhi-frames", "wedding", 3, "Good but pricey", "Quality was good, though the premium package felt expensive for what we got.", "approved"],
  [0, "pune-pixel", "maternity-newborn", 5, "Gentle and professional", "Made us feel at ease throughout the newborn session. Pictures are treasured.", "approved"],
  [3, "pune-pixel", "birthday", 4, "Lovely candid shots", null, "approved"],
  [1, "chennai-clicks", "pre-wedding", 5, "Sunrise at Marina was magical", "Planned the location, outfits and timing perfectly.", "approved"],
  [2, "chennai-clicks", "wedding", 5, "Temple wedding done right", "Respectful of rituals and caught every emotion.", "approved"],
  [3, "hyderabad-hues", "event", 4, "Great launch coverage", "Delivered same-day highlights for our product launch.", "approved"],
  [0, "kolkata-kadam", "pre-wedding", 5, "Heritage lanes, stunning frames", "The North Kolkata shoot was beautifully planned.", "approved"],
  [1, "jaipur-journals", "pre-wedding", 5, "Fort-side shoot", "Sunset at Nahargarh was spectacular.", "approved"],
  // pending moderation (hidden from public)
  [2, "mumbai-moments", "pre-wedding", 4, "Pending: lovely beach shoot", "Waiting for moderation.", "pending"],
  [3, "delhi-frames", "event", 5, "Pending: smooth corporate event", null, "pending"],
  [0, "hyderabad-hues", "real-estate", 4, "Pending: crisp interiors", "Listing photos looked professional.", "pending"],
  [1, "pune-pixel", "portrait", 5, "Pending: family portrait", "Lovely natural light.", "pending"],
  [2, "bengaluru-lens", "portrait", 4, "Pending: headshots", null, "pending"],
  // rejected (hidden from public)
  [3, "mumbai-moments", "wedding", 1, "Rejected: spam review", "Visit my site for cheap offers!!!", "rejected"],
  [2, "kolkata-kadam", "portrait", 2, "Rejected: off-topic", "This review is about something unrelated.", "rejected"],
  [0, "chennai-clicks", "wedding", 1, "Rejected: abusive language", "Content removed by moderator.", "rejected"],
];

const CUSTOMERS = ["Aarav Mehta", "Diya Nair", "Rohan Kapoor", "Sneha Iyer"];

// ======================================================================= placeholder images
const RED = "#e11d2e";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
async function placeholder(file, w, h, title, n = 0) {
  const path = `public/seed/${file}`;
  if (existsSync(path)) return `/seed/${file}`;
  const fs = Math.round(Math.min(w, h * 1.6) / 11);
  const grey = 12 + ((n * 7) % 5) * 6;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="rgb(${grey},${grey},${grey})"/>
    <circle cx="${w * (0.2 + 0.15 * (n % 5))}" cy="${h * (0.75 - 0.1 * (n % 3))}" r="${h * 0.32}" fill="${RED}" opacity="0.85"/>
    <rect x="${w * 0.55}" y="${h * 0.12}" width="${w * 0.3}" height="${h * 0.04}" fill="#fff"/>
    <text x="${w * 0.06}" y="${h * 0.2}" font-family="Arial,Helvetica,sans-serif" font-size="${fs}" font-weight="700" fill="#fff">${esc(title)}</text>
    <text x="${w * 0.06}" y="${h * 0.2 + fs * 1.4}" font-family="Arial,Helvetica,sans-serif" font-size="${fs * 0.6}" fill="#bbb">DEMO PLACEHOLDER</text></svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 55 }).toFile(path);
  return `/seed/${file}`;
}

// ======================================================================= accounts
const creds = existsSync(CRED_FILE) ? JSON.parse(readFileSync(CRED_FILE, "utf8")) : {};
const newPassword = () => randomBytes(15).toString("base64url") + "#Ab1";
async function account(email, role, meta) {
  const password = creds[email]?.password ?? newPassword();
  const [row] = await sql`select id from auth.users where email = ${email}`;
  const attrs = { email, password, email_confirm: true, app_metadata: { role }, user_metadata: meta };
  const { data, error } = row ? await sb.auth.admin.updateUserById(row.id, attrs) : await sb.auth.admin.createUser(attrs);
  if (error) throw new Error(`${email}: ${error.message}`);
  creds[email] = { role, password };
  return data.user.id;
}

// ======================================================================= run
mkdirSync("public/seed", { recursive: true });

// ---- master data
const stateId = {}, cityId = {};
let si = 0;
for (const [name, cities] of Object.entries(STATES)) {
  const slug = slugify(name);
  const [s] = await sql`insert into states (name, slug, is_active, sort_order) values (${name}, ${slug}, true, ${si++})
    on conflict (slug) do update set name = excluded.name, is_active = true returning id`;
  stateId[slug] = s.id;
  let ci = 0;
  for (const c of cities) {
    const cs = slugify(c);
    const [r] = await sql`insert into cities (state_id, name, slug, is_active, sort_order) values (${s.id}, ${c}, ${cs}, true, ${ci++})
      on conflict (state_id, slug) do update set name = excluded.name, is_active = true returning id`;
    cityId[`${slug}/${cs}`] = r.id;
  }
}
const svcId = {};
for (const [name, description, order] of SERVICES) {
  const slug = slugify(name);
  const [r] = await sql`insert into services (name, slug, description, status, sort_order) values (${name}, ${slug}, ${description}, 'active', ${order})
    on conflict (slug) do update set name = excluded.name, description = excluded.description, status = 'active', sort_order = excluded.sort_order returning id`;
  svcId[slug] = r.id;
}
const modelId = {};
let bi = 0;
for (const [brand, models] of Object.entries(BRANDS)) {
  const [b] = await sql`insert into smartphone_brands (name, slug, status, sort_order) values (${brand}, ${slugify(brand)}, 'active', ${bi++})
    on conflict (slug) do update set name = excluded.name, status = 'active' returning id`;
  let mi = 0;
  for (const m of models) {
    const [r] = await sql`insert into smartphone_models (brand_id, name, slug, status, sort_order) values (${b.id}, ${m}, ${slugify(m)}, 'active', ${mi++})
      on conflict (brand_id, slug) do update set name = excluded.name, status = 'active' returning id`;
    modelId[m] = r.id;
  }
}
// The leftover phase-test service "Test" is not a real service; keep it off the public site.
await sql`update services set status = 'inactive' where slug = 'test'`;

// ---- accounts
const adminId = await account(`admin.demo@${DOMAIN}`, "admin", { full_name: "Demo Admin" });
const customerIds = [];
for (let i = 0; i < CUSTOMERS.length; i++) customerIds.push(await account(`customer${i + 1}.demo@${DOMAIN}`, "customer", { full_name: CUSTOMERS[i] }));
const userOf = {};
for (const p of PH) userOf[p.key] = await account(`${p.key}@${DOMAIN}`, "photographer", { full_name: `${p.name} (Demo)`, business_name: `${p.name} (Demo)` });
writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2));

// ---- images
const svcImg = {}; // slug -> 5 urls
for (const [name] of SERVICES) {
  const slug = slugify(name);
  svcImg[slug] = [];
  for (let n = 1; n <= 5; n++) svcImg[slug].push(await placeholder(`svc-${slug}-${n}.webp`, 960, 720, name, n));
}
const homeBanners = [];
for (let n = 1; n <= 4; n++) homeBanners.push(await placeholder(`home-banner-${n}.webp`, 1920, 600, ["Shot on a phone", "Pre-wedding stories", "Find a photographer", "Hidden banner"][n - 1], n));

// ---- photographers, services, phones, packages, portfolio
const phId = {};
for (const [pi, p] of PH.entries()) {
  const slug = `demo-${p.key}`;
  const logo = await placeholder(`ph-${p.key}-logo.webp`, 400, 400, p.name.split(" ")[0], pi);
  const photo = await placeholder(`ph-${p.key}-photo.webp`, 600, 600, p.name, pi + 2);
  const banner = await placeholder(`ph-${p.key}-banner.webp`, 1600, 500, p.name, pi + 1);
  const num = String(pi + 1).padStart(2, "0");
  const [r] = await sql`insert into photographers (user_id, business_name, slug, profile_photo_url, logo_url, banner_url, about, phone, whatsapp, email, website_url, state_id, city_id, status, is_profile_complete)
    values (${userOf[p.key]}, ${p.name + " (Demo)"}, ${slug}, ${photo}, ${logo}, ${banner}, ${p.about}, ${"+91 90000 000" + num}, ${"+91 90000 000" + num}, ${`${p.key}@${DOMAIN}`}, ${"https://example.com/" + p.key},
      ${stateId[p.state]}, ${cityId[`${p.state}/${p.city}`]}, ${p.status}, true)
    on conflict (slug) do update set user_id = excluded.user_id, business_name = excluded.business_name, profile_photo_url = excluded.profile_photo_url, logo_url = excluded.logo_url,
      banner_url = excluded.banner_url, about = excluded.about, phone = excluded.phone, whatsapp = excluded.whatsapp, email = excluded.email, website_url = excluded.website_url,
      state_id = excluded.state_id, city_id = excluded.city_id, status = excluded.status, is_profile_complete = true
    returning id`;
  phId[p.key] = r.id;

  for (const m of p.phones) if (modelId[m]) await sql`insert into photographer_phones (photographer_id, model_id) values (${r.id}, ${modelId[m]}) on conflict do nothing`;

  for (const [si2, s] of p.services.entries()) {
    await sql`insert into photographer_services (photographer_id, service_id) values (${r.id}, ${svcId[s]}) on conflict do nothing`;
    const statuses = p.pkgStatus?.[s] ?? ["published", "published", "published"];
    for (const [li, level] of ["basic", "standard", "premium"].entries()) {
      const base = Math.round((PRICES[s][li] * p.f) / 100) * 100;
      const offer = (pi + si2 + li) % 3 === 0 ? base : Math.round((base * 0.88) / 100) * 100; // some packages have no discount
      const t = TIER[level];
      const svcName = SERVICES.find(([n]) => slugify(n) === s)[0];
      const inclusions = [`${t.hours} hours of coverage`, `${t.shots}+ edited photos`, "Shot on flagship smartphones", level === "basic" ? "Online gallery" : "Online gallery and download link", ...(level === "premium" ? ["Second shooter", "Same-week highlights reel"] : [])].join("\n");
      let [pk] = await sql`select id from packages where photographer_id = ${r.id} and service_id = ${svcId[s]} and level = ${level}`;
      if (!pk) [pk] = await sql`insert into packages (photographer_id, service_id, level, name, price, base_price, offer_price, status) values (${r.id}, ${svcId[s]}, ${level}, ${`${t.name} ${svcName}`}, ${offer}, ${base}, ${offer}, 'draft') returning id`;
      const [{ n }] = await sql`select count(*)::int n from package_images where package_id = ${pk.id}`;
      const want = statuses[li] === "draft" && p.key === "bengaluru-lens" ? 1 : 3;
      if (n === 0) for (let k = 0; k < want; k++) await sql`insert into package_images (package_id, image_url, alt_text, sort_order) values (${pk.id}, ${svcImg[s][(pi + li + k) % 5]}, ${`${svcName} sample ${k + 1} by ${p.name} (demo placeholder)`}, ${k})`;
      await sql`update packages set name = ${`${t.name} ${svcName}`}, price = ${offer}, base_price = ${base}, offer_price = ${offer}, short_description = ${`${t.name} ${svcName.toLowerCase()} package, ${t.hours} hours, ${t.shots}+ photos.`},
        inclusions = ${inclusions}, detailed_description = ${`${t.name} package for ${svcName.toLowerCase()} by ${p.name}. Includes ${t.hours} hours of coverage and ${t.shots}+ edited photos, all shot on a smartphone. Travel and extra hours can be arranged with the photographer.`},
        status = ${statuses[li]} where id = ${pk.id}`;
    }

    // portfolio: segment slug == service slug (this is how the service page finds it)
    const svcName = SERVICES.find(([n]) => slugify(n) === s)[0];
    const [seg] = await sql`insert into portfolio_segments (photographer_id, name, slug, sort_order) values (${r.id}, ${svcName}, ${s}, ${si2})
      on conflict (photographer_id, slug) do update set name = excluded.name returning id`;
    const shots = p.status === "approved" ? ["approved", "approved", "approved", ...(si2 === 0 ? ["pending_review", "rejected"] : [])] : p.status === "pending" ? ["pending_review", "pending_review", "pending_review"] : ["approved", "rejected"];
    for (const [k, st] of shots.entries()) {
      const url = svcImg[s][(pi + k) % 5];
      const exists = await sql`select 1 from portfolio_images where segment_id = ${seg.id} and sort_order = ${k}`;
      if (!exists.length) await sql`insert into portfolio_images (segment_id, image_url, alt_text, status, sort_order) values (${seg.id}, ${url}, ${`${svcName} by ${p.name} (demo placeholder)`}, 'pending_review', ${k})`;
      await sql`update portfolio_images set status = ${st} where segment_id = ${seg.id} and sort_order = ${k}`;
    }
  }
}

// ---- reviews: insert pending (as a customer would), then moderate as the admin
for (const [ci, key, s, rating, title, text, status] of REVIEWS) {
  const [ex] = await sql`select id from service_reviews where reviewer_user_id = ${customerIds[ci]} and photographer_id = ${phId[key]} and service_id = ${svcId[s]} and title = ${title}`;
  let id = ex?.id;
  if (!id) {
    [{ id }] = await sql`insert into service_reviews (reviewer_user_id, photographer_id, service_id, rating, title, review_text, status) values (${customerIds[ci]}, ${phId[key]}, ${svcId[s]}, ${rating}, ${title}, ${text}, 'pending') returning id`;
  }
  if (status === "pending") await sql`update service_reviews set status = 'pending', reviewed_by = null, reviewed_at = null where id = ${id}`;
  else await sql`update service_reviews set status = ${status}, reviewed_by = ${adminId}, reviewed_at = now() where id = ${id}`;
}

// ---- homepage banners + featured
const BANNERS = [
  ["Shot on a phone. Framed like a film.", "Hire verified smartphone photographers across India.", "/search", 0, true],
  ["Pre-wedding stories, planned for you", "Browse pre-wedding packages from top cities.", "/services/pre-wedding", 1, true],
  ["Find a photographer near you", "Choose your state, then your city.", "/locations", 2, true],
  ["Hidden demo banner (inactive)", "Inactive banner: must not appear on the public site.", "/search", 3, false],
];
for (const [i, [heading, description, link, sort, active]] of BANNERS.entries()) {
  const [ex] = await sql`select id from homepage_banners where heading = ${heading}`;
  if (ex) await sql`update homepage_banners set image_url = ${homeBanners[i]}, description = ${description}, link_url = ${link}, sort_order = ${sort}, is_active = ${active} where id = ${ex.id}`;
  else await sql`insert into homepage_banners (image_url, heading, description, link_url, sort_order, is_active) values (${homeBanners[i]}, ${heading}, ${description}, ${link}, ${sort}, ${active})`;
}
const FEATURED = [["mumbai-moments", 0, true], ["bengaluru-lens", 1, true], ["delhi-frames", 2, true], ["chennai-clicks", 3, true], ["pune-pixel", 4, false]];
for (const [key, sort, active] of FEATURED) {
  const p = PH.find((x) => x.key === key);
  const title = `${p.name} (Demo)`;
  const img = `/seed/ph-${key}-banner.webp`, link = `/photographers/p/demo-${key}`;
  const [ex] = await sql`select id from homepage_featured_items where photographer_id = ${phId[key]}`;
  if (ex) await sql`update homepage_featured_items set title = ${title}, description = ${p.about}, image_url = ${img}, link_url = ${link}, sort_order = ${sort}, is_active = ${active} where id = ${ex.id}`;
  else await sql`insert into homepage_featured_items (photographer_id, title, description, image_url, link_url, sort_order, is_active) values (${phId[key]}, ${title}, ${p.about}, ${img}, ${link}, ${sort}, ${active})`;
}

console.log("Seed complete. Credentials written to", CRED_FILE);
await sql.end();
