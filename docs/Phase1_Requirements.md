# Phase 1 — Discovery & Requirement Finalisation

Source of truth: [PhonePhotography_Project_Blueprint.md](PhonePhotography_Project_Blueprint.md). Status: **DRAFT, awaiting owner sign-off** (Scope gate).

## 1. Decisions already made (from owner, recorded)

| Topic | Decision |
|---|---|
| DB access | Drizzle ORM, additive SQL migrations |
| Auth | Supabase Auth (roles: photographer, customer/reviewer, admin) |
| Images | Cloudflare R2 (S3-compatible) |
| Email / OTP | SendPulse (Supabase custom SMTP or API) |
| Hosting | Vercel (app) + Supabase Cloud (production); local Supabase for dev |
| Design | Black/white, red for prices, sharp corners, service-grouped homepage |

## 2. Open decisions (blueprint §18) — owner must answer

| # | Question | Proposed default (not agreed) |
|---|---|---|
| D1 | Packages need Admin approval before publish? | Yes: Draft → Pending Review → Published (matches Admin "moderate package publication") |
| D2 | Portfolio images need Admin approval? | Yes: Pending Review → Approved |
| D3 | Price format: numeric only or "Contact for price"? | Numeric only (price filter needs a number) |
| D4 | India-only first release? | Yes (states/cities model, ₹) |
| D5 | Contact method | WhatsApp + phone call; no in-site enquiry form |
| D6 | Image limits | Package 3–5 images (blueprint); profile/logo/banner 1 each; max file size and formats TBD (proposal: JPEG/PNG/WebP, ≤5 MB) |
| D7 | Base price + offer price | Current UI shows both; blueprint defines a single "Price". Confirm: keep both (offer drives filter) or single price |
| D8 | Reviewer display name | Reviewer first name + initial unless they set a display name |
| D9 | Email OTP expiry / attempts | Proposal: 6 digits, 10 min, 5 attempts, rate limited |

## 3. Frozen scope

Three components: public website, photographer panel (5 sections), admin panel (exactly 7 pages; Reviews = tab inside Photographers). Out of scope per blueprint §15. Package cards always link to `/photographers/p/{slug}/{service}`; no package detail routes.

## 4. User stories & acceptance criteria (summary)

**Visitor**
- Filter packages by service → state → city → phone → price. AC: city list depends on state; price uses package price; applies to all three level sections.
- Click any package card. AC: opens photographer-service page showing all three tiers.
- Contact via WhatsApp/phone from profile and service page.

**Reviewer**
- Write review while signed in. AC: signed-out → sign-in → return to same service page; review saved Pending; confirmation text from §19.3 shown; not public until approved; reviewer sees own status.

**Photographer**
- Register with email OTP, wait for approval (Pending/Approved/Rejected visible on dashboard).
- Manage profile, services, one package per level per service, portfolio segments/images, account settings. AC: unique (photographer, service, level); not listed until approved.

**Admin**
- Approve/reject/deactivate photographers; manage services/brands/models (tabs) and states/cities; moderate packages, portfolio, reviews; manage homepage banners/featured items. AC: deactivation hides from new selections, keeps history; no direct DB edits needed.

## 5. Prioritised MVP backlog

| Priority | Item | Blueprint phase |
|---|---|---|
| P0 | Schema, roles, RLS, master data seed | 5–6 |
| P0 | Photographer register/OTP/login/reset/approval | 6–7 |
| P0 | Admin: master data, locations, photographers | 7 |
| P0 | Photographer panel: profile, services/packages, portfolio | 8 |
| P0 | Public pages wired to DB, package-card rule | 9 |
| P1 | Reviews flow + Admin Reviews tab | 10 |
| P1 | Admin: packages, portfolio, homepage moderation | 7 |
| P1 | SEO, sitemap, noindex for thin pages | 11 |
| P2 | QA, UAT, launch | 12–13 |

## 6. Current-state audit (what exists vs blueprint)

**Present (front end, mock data `src/lib/mock.ts`):** homepage, search, photographers list, photographer profile and service pages, services listing, about, contact, privacy, terms, locations, earn; photographer panel (dashboard, profile, services, portfolio, settings); admin (dashboard, photographers, master-data, locations, packages, portfolio, homepage). Admin = 7 pages, as required.

**Missing vs blueprint §3.3:**
- State, state+service, city, city+service listing routes (`/photographers/{state}/…`).
- `/photographer/register`, `/photographer/login`, `/photographer/forgot-password`; reviewer sign-in/register.
- Custom 404 (`src/app/not-found.tsx` absent).
- Admin Reviews tab inside Photographers (`admin/photographers` mentions reviews; verify tab + approve/reject in Phase 7).
- Review display exists on service page (mock `REVIEWS`); Write-a-Review sign-in flow not built (Phase 10).

**Extra, not in blueprint:** `/locations`, `/earn`. Confirm keep or remove (D10).

**Infra present:** Next.js 16, Dockerfile, plain Postgres 16 container (port 5433), local Supabase stack (project `phonephotography`, ports 54321–54324) running; `supabase/config.toml`. **Not present:** migrations, seed, Drizzle, Supabase client libs, R2/SendPulse config, Vercel config, CI. These belong to blueprint Phases 4–6, not Phase 1.

**Issues found:** `supabase_vector_phonephotography` container restart-looping (log collector, non-blocking). `output: "standalone"` is Docker-only; Vercel ignores it.

## 7. Phase 1 completion checkpoint

Done when owner answers D1–D10 and signs off sections 3–5.
