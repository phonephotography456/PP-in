// Admin workflow checks against the real DB + RLS. Everything runs in ONE transaction that is
// always rolled back, so nothing persists. Applies 0008 grants inside that transaction, so it
// passes before or after the migration is applied for real.
//   node scripts/test-admin.mjs
import fs from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
class Rollback extends Error {}
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " – " + extra : ""}`); if (!ok) failed++; };
const throws = async (tx, q) => { await tx`savepoint s`; try { await q(); await tx`release savepoint s`; return null; } catch (e) { await tx`rollback to savepoint s`; return e; } };

try {
  await sql.begin(async (tx) => {
    await tx.unsafe(fs.readFileSync("supabase/migrations/0008_phase4_admin_grants.sql", "utf8"));
    const [admin] = await tx`select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1`;
    const [other] = await tx`select id from auth.users where coalesce(raw_app_meta_data->>'role','') <> 'admin' limit 1`;
    check("admin + non-admin users exist", !!admin && !!other);
    if (!admin || !other) throw new Rollback();

    const as = async (uid) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: "authenticated" })}, true)`;
      await tx`set local role authenticated`;
    };
    const reset = () => tx`reset role`;

    // --- non-admin is blocked everywhere ---
    await as(other.id);
    const denied = [
      ["service insert", () => tx`insert into services (name, slug) values ('x', 'x-test')`],
      ["state insert", () => tx`insert into states (name, slug) values ('x', 'x-test')`],
      ["banner insert", () => tx`insert into homepage_banners (image_url) values ('https://x.test/a.jpg')`],
    ];
    for (const [n, q] of denied) check(`non-admin blocked: ${n}`, !!(await throws(tx, q)));
    const upd = await tx`update services set status = 'inactive' returning id`.catch(() => []);
    check("non-admin cannot update services (0 rows or error)", upd.length === 0);
    await reset();

    // --- admin master data ---
    await as(admin.id);
    const [svc] = await tx`insert into services (name, slug) values ('Test Service', 'test-service-zz') returning id, status`;
    check("admin inserts service (active by default)", svc.status === "active");
    const [off] = await tx`update services set status = 'inactive' where id = ${svc.id} returning status`;
    check("admin deactivates service", off.status === "inactive");
    const dup = await throws(tx, () => tx`insert into services (name, slug) values ('Dup', 'test-service-zz')`);
    check("duplicate slug rejected (23505)", dup?.code === "23505");

    // --- locations ---
    const [st] = await tx`insert into states (name, slug) values ('Test State', 'test-state-zz') returning id`;
    const [ct] = await tx`insert into cities (state_id, name, slug) values (${st.id}, 'Test City', 'test-city-zz') returning id`;
    check("admin inserts state + city", !!st && !!ct);
    const [tg] = await tx`update cities set is_active = false where id = ${ct.id} returning is_active`;
    check("admin deactivates city", tg.is_active === false);

    // --- homepage ---
    const [bn] = await tx`insert into homepage_banners (image_url, heading) values ('https://x.test/a.jpg', 'Hi') returning id`;
    const [del] = await tx`delete from homepage_banners where id = ${bn.id} returning id`;
    check("admin creates + deletes banner", !!del);

    // --- photographer approval + packages + reviews (needs existing rows; skipped if none) ---
    const [ph] = await tx`select id, status from photographers where status = 'pending' limit 1`;
    if (ph) {
      const [ap] = await tx`update photographers set status = 'approved' where id = ${ph.id} returning status`;
      check("admin approves pending photographer", ap.status === "approved");
    } else console.log("SKIP  no pending photographer to approve");

    const [pk] = await tx`select p.id from packages p where p.status in ('draft','pending_review') and (select count(*) from package_images i where i.package_id = p.id) not between 3 and 5 limit 1`;
    if (pk) {
      const e = await throws(tx, () => tx`update packages set status = 'published' where id = ${pk.id}`);
      check("publish blocked without 3-5 images", e?.code === "P0001", e?.message);
    } else console.log("SKIP  no package without 3-5 images");

    const [rv] = await tx`select id from service_reviews limit 1`;
    if (rv) {
      const [r] = await tx`update service_reviews set status = 'approved', reviewed_by = ${admin.id}, reviewed_at = now() where id = ${rv.id} returning status`;
      check("admin moderates review", r.status === "approved");
    } else console.log("SKIP  no reviews to moderate");
    await reset();

    throw new Rollback();
  });
} catch (e) {
  if (!(e instanceof Rollback)) { console.error(e); failed++; }
}
await sql.end();
console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed (rolled back; DB unchanged).");
process.exit(failed ? 1 : 0);
