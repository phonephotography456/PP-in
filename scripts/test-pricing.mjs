// base_price / offer_price regression tests (migration 0011) against the real DB + RLS, in ONE rolled-back
// transaction. The migration test drops the new columns, inserts legacy rows, re-applies 0011, and checks them.
//   node scripts/test-pricing.mjs
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
class Rollback extends Error {}
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " – " + extra : ""}`); if (!ok) failed++; };
const throws = async (tx, q) => { await tx`savepoint s`; try { await q(); await tx`release savepoint s`; return null; } catch (e) { await tx`rollback to savepoint s`; return e; } };
const MIG = fs.readFileSync("supabase/migrations/0011_package_base_offer_price.sql", "utf8");

try {
  await sql.begin(async (tx) => {
    const [admin] = await tx`select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1`;
    const as = async (uid) => { await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: "authenticated" })}, true)`; await tx`set local role authenticated`; };
    const reset = () => tx`reset role`;
    const mk = async () => { const uid = randomUUID(); const [p] = await tx`insert into photographers (user_id, business_name, slug, status) values (${uid}, 'T', ${"t-" + randomUUID().slice(0, 8)}, 'approved') returning id`; return { uid, id: p.id }; };
    const A = await mk(), B = await mk();
    const [svc] = await tx`insert into services (name, slug) values ('S', ${"s-" + randomUUID().slice(0, 6)}) returning id`;
    for (const x of [A, B]) await tx`insert into photographer_services (photographer_id, service_id) values (${x.id}, ${svc.id})`;

    // ---------- migrated records ----------
    await tx`drop trigger a_sync_package_prices_trigger on packages`;
    await tx`alter table packages drop column base_price, drop column offer_price`;
    const L = [];
    for (const [lvl, price] of [["basic", "4999.50"], ["standard", "0.01"], ["premium", "99999999.99"]])
      L.push((await tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${svc.id}, ${lvl}, ${"legacy " + lvl}, ${price}) returning id, price`)[0]);
    await tx.unsafe(MIG);
    const mig = await tx`select id, price, base_price, offer_price from packages where id in ${tx(L.map((l) => l.id))}`;
    check("migration: every legacy package has base_price = offer_price = old price", mig.length === 3 && mig.every((r) => r.base_price === r.price && r.offer_price === r.price));
    check("migration: old price column kept with its values", L.every((l) => mig.find((m) => m.id === l.id).price === l.price));
    await tx.unsafe(MIG);
    check("migration: idempotent (re-run changes nothing)", (await tx`select base_price, offer_price from packages where id = ${L[0].id}`)[0].offer_price === "4999.50");
    await tx`delete from packages where photographer_id = ${A.id}`;

    // ---------- valid / invalid prices (as the photographer, RLS + guards active) ----------
    await as(A.uid);
    const ins = (lvl, base, offer) => tx`insert into packages (photographer_id, service_id, level, name, base_price, offer_price) values (${A.id}, ${svc.id}, ${lvl}, 'n', ${base}, ${offer}) returning id, price, base_price, offer_price`;
    const [ok1] = await ins("basic", "6000", "5000");
    check("valid: base > offer stored; legacy price mirrors offer", ok1.base_price === "6000.00" && ok1.offer_price === "5000.00" && ok1.price === "5000.00");
    const [ok2] = await ins("standard", "8000", "8000");
    check("valid: base == offer allowed (no discount)", ok2.base_price === ok2.offer_price);
    check("invalid: offer > base rejected (23514)", (await throws(tx, () => ins("premium", "1000", "1500")))?.code === "23514");
    check("invalid: offer 0 rejected", !!(await throws(tx, () => ins("premium", "1000", "0"))));
    check("invalid: negative offer rejected", !!(await throws(tx, () => ins("premium", "1000", "-5"))));
    check("invalid: base 0 rejected", !!(await throws(tx, () => ins("premium", "0", "0"))));
    check("invalid: no price at all rejected", !!(await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name) values (${A.id}, ${svc.id}, 'premium', 'n')`)));
    const [leg] = await tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${svc.id}, 'premium', 'legacy writer', 7000) returning base_price, offer_price`;
    check("legacy writer (price only) still works: base = offer = price", leg.base_price === "7000.00" && leg.offer_price === "7000.00");

    // ---------- editing existing packages ----------
    const [e1] = await tx`update packages set offer_price = 4500 where id = ${ok1.id} returning base_price, offer_price, price`;
    check("edit offer only: base kept, price mirrors new offer", e1.base_price === "6000.00" && e1.offer_price === "4500.00" && e1.price === "4500.00");
    check("edit: raising offer above base rejected", !!(await throws(tx, () => tx`update packages set offer_price = 6001 where id = ${ok1.id}`)));
    check("edit: lowering base below offer rejected", !!(await throws(tx, () => tx`update packages set base_price = 4000 where id = ${ok1.id}`)));
    const [e2] = await tx`update packages set base_price = 9000, offer_price = 7000 where id = ${ok1.id} returning base_price, offer_price`;
    check("edit both prices together", e2.base_price === "9000.00" && e2.offer_price === "7000.00");
    const [e3] = await tx`update packages set price = 3000 where id = ${ok1.id} returning base_price, offer_price`;
    check("edit via legacy price: moves offer_price, base stays", e3.offer_price === "3000.00" && e3.base_price === "9000.00");
    await reset();

    // ---------- moderation + ownership preserved ----------
    for (let i = 0; i < 3; i++) await tx`insert into package_images (package_id, image_url, sort_order) values (${ok1.id}, ${"https://x.test/" + i}, ${i})`;
    await as(admin.id);
    await tx`update packages set status = 'published' where id = ${ok1.id}`;
    await reset();
    await as(A.uid);
    check("owner editing offer_price of a published package -> pending_review", (await tx`update packages set offer_price = 2900 where id = ${ok1.id} returning status`)[0].status === "pending_review");
    await reset();
    await as(admin.id);
    await tx`update packages set status = 'published' where id = ${ok1.id}`;
    await reset();
    await as(A.uid);
    check("owner editing base_price of a published package -> pending_review", (await tx`update packages set base_price = 9500 where id = ${ok1.id} returning status`)[0].status === "pending_review");
    check("owner still cannot publish", (await throws(tx, () => tx`update packages set status = 'published' where id = ${ok1.id}`))?.code === "42501");
    await reset();
    await as(B.uid);
    check("other photographer cannot read/update A's package prices", (await tx`select 1 from packages where id = ${ok1.id}`).length === 0 && (await tx`update packages set offer_price = 1 where id = ${ok1.id} returning id`).length === 0);
    check("other photographer cannot insert for A", !!(await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, base_price, offer_price) values (${A.id}, ${svc.id}, 'premium', 'x', 10, 10)`)));
    await reset();
    await as(admin.id);
    check("admin can still edit prices", (await tx`update packages set base_price = 12000, offer_price = 10000 where id = ${ok1.id} returning offer_price`)[0].offer_price === "10000.00");
    await reset();

    // ---------- offer_price filtering ----------
    const bucket = async (lo, hi) => (await tx`select id from packages where photographer_id = ${A.id} and offer_price >= ${lo} and offer_price < ${hi}`).map((r) => r.id);
    await tx`update packages set base_price = 20000, offer_price = 4000 where id = ${ok1.id}`; // base is "over 15k", offer is "under 5k"
    check("price filter uses offer_price (base 20000 / offer 4000 lands in under-5k)", (await bucket(0, 5000)).includes(ok1.id) && !(await bucket(15000, 1e9)).includes(ok1.id));
    throw new Rollback();
  });
} catch (e) {
  if (!(e instanceof Rollback)) { console.error(e); failed++; }
}
await sql.end();
console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed (rolled back; DB unchanged).");
process.exit(failed ? 1 : 0);
