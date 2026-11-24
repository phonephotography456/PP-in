// Review workflow checks against the real DB + RLS. One transaction, always rolled back; fixtures (users included) are
// created inside it and every count is scoped to them, so seeded demo data is neither read nor changed. Applies 0013 inside the transaction if not applied yet.
//   node scripts/test-reviews.mjs
import fs from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
class Rollback extends Error {}
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " – " + extra : ""}`); if (!ok) failed++; };
const throws = async (tx, q) => { await tx`savepoint s`; try { await q(); await tx`release savepoint s`; return null; } catch (e) { await tx`rollback to savepoint s`; return e; } };

try {
  await sql.begin(async (tx) => {
    const [applied] = await tx`select 1 from pg_proc where proname = 'is_customer_account'`;
    if (!applied) await tx.unsafe(fs.readFileSync("supabase/migrations/0013_phase7_reviews.sql", "utf8"));
    // Fixture users are created inside the transaction so seeded demo accounts/reviews are never touched or counted.
    const newUser = async (email, role, meta = {}) => (await tx`insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values (gen_random_uuid(), ${email}, ${tx.json({ role })}, ${tx.json(meta)}) returning id`)[0];
    const admin = await newUser("rv-admin@test.invalid", "admin");
    const cust = await newUser("rv1@test.invalid", "customer", { full_name: "First Customer" });
    const phUser = await newUser("rv-ph@test.invalid", "photographer");
    const cust2 = await newUser("rv2@test.invalid", "customer", { full_name: "Second Customer" });
    const cust3 = await newUser("rv3@test.invalid", "customer");

    // fixtures: approved photographer with a published package; an unpublished service; a pending photographer
    const [svc] = await tx`insert into services (name, slug) values ('RV Svc', 'rv-svc-zz') returning id`;
    const [svc2] = await tx`insert into services (name, slug) values ('RV Svc2', 'rv-svc2-zz') returning id`;
    const [ph] = await tx`insert into photographers (user_id, business_name, slug, status) values (${phUser.id}, 'RV Photog', 'rv-photog-zz', 'approved') returning id`;
    const [ph2] = await tx`insert into photographers (user_id, business_name, slug, status) values (${cust3.id}, 'RV Pending', 'rv-pend-zz', 'pending') returning id`;
    const [pk] = await tx`insert into packages (photographer_id, service_id, level, name, price, base_price, offer_price) values (${ph.id}, ${svc.id}, 'basic', 'B', 100, 100, 100) returning id`;
    for (let i = 0; i < 3; i++) await tx`insert into package_images (package_id, image_url) values (${pk.id}, ${"https://x.test/" + i})`;
    await tx`update packages set status = 'published' where id = ${pk.id}`;

    const as = async (uid) => {
      await tx`select set_config('request.jwt.claims', ${uid ? JSON.stringify({ sub: uid, role: "authenticated" }) : ""}, true)`;
      await tx.unsafe(`set local role ${uid ? "authenticated" : "anon"}`);
    };
    const reset = () => tx`reset role`;
    const ins = (uid, f, status = "pending") => tx`insert into service_reviews (reviewer_user_id, photographer_id, service_id, rating, title, review_text, status)
      values (${uid}, ${f.ph ?? ph.id}, ${f.svc ?? svc.id}, ${f.rating}, ${f.title ?? null}, ${f.text ?? null}, ${status}) returning id, status, reviewer_name`;

    // --- customer submission, optional fields, pending default ---
    await as(cust.id);
    const [r1] = await ins(cust.id, { rating: 5, title: "Great", text: "Loved it" });
    check("customer submits review -> pending", r1.status === "pending");
    check("reviewer_name snapshot filled", !!r1.reviewer_name);
    check("duplicate live review rejected (23505)", (await throws(tx, () => ins(cust.id, { rating: 4 })))?.code === "23505");
    await reset(); await as(cust2.id);
    const [r2] = await ins(cust2.id, { rating: 3 });
    const [opt] = await tx`select title, review_text from service_reviews where id = ${r2.id}`;
    check("title + text optional (stored null)", opt.title === null && opt.review_text === null);
    check("reviewer_name from full_name", r2.reviewer_name === "Second Customer");
    await reset(); await as(cust.id);

    // --- rating validation (DB layer; app validates too) ---
    check("rating 0 rejected", !!(await throws(tx, () => ins(cust.id, { rating: 0, svc: svc2.id }))));
    check("rating 6 rejected", !!(await throws(tx, () => ins(cust.id, { rating: 6, svc: svc2.id }))));
    check("rating missing rejected", !!(await throws(tx, () => tx`insert into service_reviews (reviewer_user_id, photographer_id, service_id) values (${cust.id}, ${ph.id}, ${svc.id})`)));
    check("text over 2000 chars rejected", !!(await throws(tx, () => ins(cust.id, { rating: 5, svc: svc2.id, text: "x".repeat(2001) }))));

    // --- permission tampering ---
    check("customer cannot insert as approved", !!(await throws(tx, () => ins(cust.id, { rating: 5 }, "approved"))));
    check("customer cannot insert for another user", !!(await throws(tx, () => ins(cust2.id, { rating: 5 }))));
    check("customer cannot review unpublished service", !!(await throws(tx, () => ins(cust.id, { rating: 5, svc: svc2.id }))));
    check("customer cannot review non-approved photographer", !!(await throws(tx, () => ins(cust.id, { rating: 5, ph: ph2.id }))));
    check("customer cannot set reviewed_by", !!(await throws(tx, () => tx`insert into service_reviews (reviewer_user_id, photographer_id, service_id, rating, reviewed_by) values (${cust.id}, ${ph.id}, ${svc.id}, 5, ${cust.id})`)));
    const up = await tx`update service_reviews set status = 'approved' where id = ${r1.id} returning id`.catch(() => []);
    check("customer cannot approve own review", up.length === 0);
    const up2 = await tx`update service_reviews set status = 'approved' where id = ${r2.id} returning id`.catch(() => []);
    check("customer cannot approve another's review", up2.length === 0);
    const up3 = await tx`update service_reviews set rating = 1, review_text = 'x' where id = ${r2.id} returning id`.catch(() => []);
    check("customer cannot edit another's review", up3.length === 0);
    const del = await tx`delete from service_reviews where id = ${r2.id} returning id`.catch(() => []);
    check("customer cannot delete another's review", del.length === 0);
    const own = await tx`select id from service_reviews where photographer_id = ${ph.id}`;
    check("customer sees only own pending reviews", own.length === 1 && own[0].id === r1.id);
    await reset();

    await as(phUser.id);
    check("photographer account cannot submit review", !!(await throws(tx, () => ins(phUser.id, { rating: 5 }))));
    await reset();

    // --- public visibility: pending hidden; anon cannot write ---
    await as(null);
    check("anon sees no pending reviews", (await tx`select id from service_reviews where photographer_id = ${ph.id}`).length === 0);
    check("anon cannot insert", !!(await throws(tx, () => ins(cust.id, { rating: 5 }))));
    check("anon cannot call admin_reviewer_emails", !!(await throws(tx, () => tx`select * from public.admin_reviewer_emails(array[${cust.id}::uuid])`)));
    await reset();

    // --- admin moderation ---
    await as(admin.id);
    check("admin sees both pending reviews", (await tx`select id from service_reviews where photographer_id = ${ph.id} and status = 'pending'`).length === 2);
    check("admin reads reviewer email", (await tx`select * from public.admin_reviewer_emails(array[${cust.id}::uuid])`).length === 1);
    const [a] = await tx`update service_reviews set status = 'approved', reviewed_by = ${admin.id}, reviewed_at = now() where id = ${r1.id} returning status`;
    check("admin approves", a.status === "approved");
    const [b] = await tx`update service_reviews set status = 'rejected', reviewed_by = ${admin.id}, reviewed_at = now() where id = ${r2.id} returning status`;
    check("admin rejects", b.status === "rejected");
    check("admin lists approved + rejected", (await tx`select id from service_reviews where photographer_id = ${ph.id} and status in ('approved','rejected')`).length === 2);
    await reset();

    await as(cust.id);
    check("customer cannot call admin_reviewer_emails", !!(await throws(tx, () => tx`select * from public.admin_reviewer_emails(array[${cust.id}::uuid])`)));
    await reset();

    // --- public: approved only; aggregate from approved only ---
    await as(null);
    const pub = await tx`select id from service_reviews where photographer_id = ${ph.id} and service_id = ${svc.id}`;
    check("anon sees only the approved review (not pending/rejected)", pub.length === 1 && pub[0].id === r1.id);
    await reset();
    await tx`insert into service_reviews (reviewer_user_id, photographer_id, service_id, rating, status) values (${cust3.id}, ${ph.id}, ${svc.id}, 2, 'approved')`;
    await tx`insert into service_reviews (reviewer_user_id, photographer_id, service_id, rating, status) values (${admin.id}, ${ph.id}, ${svc.id}, 1, 'pending')`;
    await as(null);
    const [agg] = await tx`select count(*)::int n, avg(rating)::float avg from service_reviews where photographer_id = ${ph.id} and service_id = ${svc.id} and status = 'approved'`;
    check("aggregate uses approved only (count 2, avg 3.5)", agg.n === 2 && agg.avg === 3.5, JSON.stringify(agg));
    await reset();

    // --- rejected review does not block a resubmission ---
    await as(cust2.id);
    const [r3] = await ins(cust2.id, { rating: 4 });
    check("resubmission allowed after rejection", r3.status === "pending");
    await reset();

    throw new Rollback();
  });
} catch (e) {
  if (!(e instanceof Rollback)) { console.error(e); failed++; }
}
await sql.end();
console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed (rolled back; DB unchanged).");
process.exit(failed ? 1 : 0);
