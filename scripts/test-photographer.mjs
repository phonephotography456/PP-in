// Photographer-panel checks against the real DB + RLS + guard triggers (migration 0009).
// Everything runs in ONE transaction that is always rolled back, so nothing persists.
// Applies 0009 inside that transaction, so it passes before or after it is applied for real.
//   node scripts/test-photographer.mjs
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

try {
  await sql.begin(async (tx) => {
    await tx.unsafe(fs.readFileSync("supabase/migrations/0009_phase5_photographer_guards.sql", "utf8").replace(/CREATE TRIGGER/g, "CREATE OR REPLACE TRIGGER"));
    const [admin] = await tx`select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1`;
    const as = async (uid) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: "authenticated" })}, true)`;
      await tx`set local role authenticated`;
    };
    const anon = async () => { await tx`select set_config('request.jwt.claims', '{"role":"anon"}', true)`; await tx`set local role anon`; };
    const reset = () => tx`reset role`;

    // fixtures (as superuser): two approved photographers A, B; C pending; D rejected; E inactive
    const mk = async (status) => {
      const uid = randomUUID();
      const [p] = await tx`insert into photographers (user_id, business_name, slug, status) values (${uid}, ${"T " + status}, ${"t-" + randomUUID().slice(0, 8)}, ${status}) returning id`;
      return { uid, id: p.id };
    };
    const A = await mk("approved"), B = await mk("approved"), C = await mk("pending"), D = await mk("rejected"), E = await mk("inactive");
    const [s1] = await tx`insert into services (name, slug) values ('S1', ${"s1-" + randomUUID().slice(0, 6)}) returning id`;
    const [sOff] = await tx`insert into services (name, slug, status) values ('SOff', ${"so-" + randomUUID().slice(0, 6)}, 'inactive') returning id`;
    for (const ph of [A, B, C, D, E]) await tx`insert into photographer_services (photographer_id, service_id) values (${ph.id}, ${s1.id})`;
    const [bPkg] = await tx`insert into packages (photographer_id, service_id, level, name, price) values (${B.id}, ${s1.id}, 'basic', 'B basic', 100) returning id`;
    const [bSeg] = await tx`insert into portfolio_segments (photographer_id, name, slug) values (${B.id}, 'Bseg', 'bseg') returning id`;

    // ---------- ownership ----------
    await as(A.uid);
    check("A sees own photographer row", (await tx`select id from photographers where id = ${A.id}`).length === 1);
    check("A cannot read B's draft package", (await tx`select id from packages where id = ${bPkg.id}`).length === 0);
    check("A cannot update B's package", (await tx`update packages set name = 'hax' where id = ${bPkg.id} returning id`).length === 0);
    check("A cannot delete B's package", (await tx`delete from packages where id = ${bPkg.id} returning id`).length === 0);
    check("A cannot insert package for B", !!(await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, price) values (${B.id}, ${s1.id}, 'standard', 'x', 5)`)));
    check("A cannot create segment for B", !!(await throws(tx, () => tx`insert into portfolio_segments (photographer_id, name, slug) values (${B.id}, 'x', 'x')`)));
    check("A cannot add image to B's segment", !!(await throws(tx, () => tx`insert into portfolio_images (segment_id, image_url) values (${bSeg.id}, 'https://x.test/a.jpg')`)));
    check("A cannot change own status", (await throws(tx, () => tx`update photographers set status = 'inactive' where id = ${A.id}`))?.code === "42501");
    const e0 = await throws(tx, () => tx`update photographers set user_id = ${randomUUID()} where id = ${A.id}`);
    check("A cannot change own user_id", e0?.code === "42501");

    // ---------- packages: tiers, uniqueness, incomplete tiers ----------
    const [aBasic] = await tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${s1.id}, 'basic', 'A basic', 5000) returning id, status`;
    check("incomplete tiers: only Basic saved", aBasic.status === "draft" && (await tx`select 1 from packages where photographer_id = ${A.id}`).length === 1);
    const dup = await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${s1.id}, 'basic', 'dup', 5)`);
    check("second Basic for same service rejected (23505)", dup?.code === "23505");
    const [aStd] = await tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${s1.id}, 'standard', 'A std', 8000) returning id`;
    check("Standard tier added independently", !!aStd);
    check("insert as published rejected", (await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, price, status) values (${A.id}, ${s1.id}, 'premium', 'p', 9, 'published')`))?.code === "42501");
    check("insert for service not owned/selected rejected", !!(await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${sOff.id}, 'premium', 'p', 9)`)));
    check("price 0 rejected", !!(await throws(tx, () => tx`update packages set price = 0 where id = ${aBasic.id}`)));

    // ---------- moderation workflow ----------
    check("owner cannot publish own package", (await throws(tx, () => tx`update packages set status = 'published' where id = ${aBasic.id}`))?.code === "42501");
    check("owner cannot set status inactive", (await throws(tx, () => tx`update packages set status = 'inactive' where id = ${aBasic.id}`))?.code === "42501");
    check("owner cannot move level/service", !!(await throws(tx, () => tx`update packages set level = 'premium' where id = ${aBasic.id}`)));
    const noImg = await throws(tx, () => tx`update packages set status = 'pending_review' where id = ${aBasic.id}`);
    check("submit for review blocked without 3-5 images", noImg?.code === "P0001", noImg?.message);
    for (let i = 0; i < 3; i++) await tx`insert into package_images (package_id, image_url, sort_order) values (${aBasic.id}, ${"https://x.test/" + i + ".jpg"}, ${i})`;
    const [sub] = await tx`update packages set status = 'pending_review' where id = ${aBasic.id} returning status`;
    check("submit for review with 3 images ok", sub.status === "pending_review");
    check("6th image rejected", !!(await throws(tx, async () => { for (let i = 3; i < 6; i++) await tx`insert into package_images (package_id, image_url, sort_order) values (${aBasic.id}, ${"https://x.test/" + i + ".jpg"}, ${i})`; })));
    await anon();
    check("pending package not public", (await tx`select id from packages where id = ${aBasic.id}`).length === 0);
    await reset();

    // admin publishes; owner edits => back to review, hidden publicly
    await as(admin.id);
    check("admin publishes", (await tx`update packages set status = 'published' where id = ${aBasic.id} returning status`)[0].status === "published");
    await reset();
    await anon();
    check("published package public for approved photographer", (await tx`select id from packages where id = ${aBasic.id}`).length === 1);
    await reset();
    await as(A.uid);
    const [edited] = await tx`update packages set name = 'A basic v2' where id = ${aBasic.id} returning status`;
    check("editing published package sends it back to pending_review", edited.status === "pending_review");
    await reset();
    await as(admin.id);
    await tx`update packages set status = 'published' where id = ${aBasic.id}`;
    await reset();
    await as(A.uid);
    await tx`insert into package_images (package_id, image_url, sort_order) values (${aBasic.id}, 'https://x.test/new.jpg', 4)`;
    check("adding image to published package sends it to pending_review", (await tx`select status from packages where id = ${aBasic.id}`)[0].status === "pending_review");
    await reset();

    // ---------- portfolio moderation ----------
    await as(A.uid);
    const [seg] = await tx`insert into portfolio_segments (photographer_id, name, slug) values (${A.id}, 'Mine', 'mine') returning id`;
    check("portfolio insert as approved rejected", (await throws(tx, () => tx`insert into portfolio_images (segment_id, image_url, status) values (${seg.id}, 'https://x.test/p.jpg', 'approved')`))?.code === "42501");
    const [img] = await tx`insert into portfolio_images (segment_id, image_url) values (${seg.id}, 'https://x.test/p.jpg') returning id, status`;
    check("new portfolio image is pending_review", img.status === "pending_review");
    check("owner cannot approve own image", (await throws(tx, () => tx`update portfolio_images set status = 'approved' where id = ${img.id}`))?.code === "42501");
    await reset();
    await as(admin.id);
    await tx`update portfolio_images set status = 'approved' where id = ${img.id}`;
    await reset();
    await as(A.uid);
    const [re] = await tx`update portfolio_images set image_url = 'https://x.test/q.jpg' where id = ${img.id} returning status`;
    check("replacing approved image sends it back to pending_review", re.status === "pending_review");
    check("owner can delete own image", (await tx`delete from portfolio_images where id = ${img.id} returning id`).length === 1);
    await reset();

    // ---------- inactive master data: history kept, no new selection ----------
    await as(A.uid);
    check("cannot add inactive service", !!(await throws(tx, () => tx`insert into photographer_services (photographer_id, service_id) values (${A.id}, ${sOff.id})`)));
    await reset();
    await tx`update services set status = 'inactive' where id = ${s1.id}`;
    await as(A.uid);
    check("existing packages/service link survive service deactivation", (await tx`select 1 from packages where photographer_id = ${A.id}`).length === 2 && (await tx`select 1 from photographer_services where photographer_id = ${A.id}`).length === 1);
    check("cannot create new package under inactive service", !!(await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, price) values (${A.id}, ${s1.id}, 'premium', 'n', 9)`)));
    check("can still edit existing package under inactive service", (await tx`update packages set price = 5100 where id = ${aStd.id} returning id`).length === 1);
    await reset();

    // ---------- pending / rejected / inactive: no visibility, no approval ----------
    await as(C.uid);
    check("pending photographer cannot self-approve", (await throws(tx, () => tx`update photographers set status = 'approved' where id = ${C.id}`))?.code === "42501");
    await reset();
    // (s1 is inactive now) reactivate to test remaining paths
    await tx`update services set status = 'active' where id = ${s1.id}`;
    await as(C.uid);
    const [cp2] = await tx`insert into packages (photographer_id, service_id, level, name, price) values (${C.id}, ${s1.id}, 'basic', 'C', 5) returning id`;
    check("pending photographer may draft", !!cp2);
    await reset();
    await anon();
    check("pending photographer + drafts not visible publicly", (await tx`select 1 from photographers where id = ${C.id}`).length === 0 && (await tx`select 1 from packages where photographer_id = ${C.id}`).length === 0);
    await reset();
    for (const [label, X] of [["rejected", D], ["inactive", E]]) {
      await as(X.uid);
      check(`${label} photographer cannot insert package`, (await throws(tx, () => tx`insert into packages (photographer_id, service_id, level, name, price) values (${X.id}, ${s1.id}, 'basic', 'x', 5)`))?.code === "42501");
      check(`${label} photographer cannot add segment`, (await throws(tx, () => tx`insert into portfolio_segments (photographer_id, name, slug) values (${X.id}, 'x', 'x')`))?.code === "42501");
      check(`${label} photographer cannot self-approve`, (await throws(tx, () => tx`update photographers set status = 'approved' where id = ${X.id}`))?.code === "42501");
      await reset();
      await anon();
      check(`${label} photographer not public`, (await tx`select 1 from photographers where id = ${X.id}`).length === 0);
      await reset();
    }

    throw new Rollback();
  });
} catch (e) {
  if (!(e instanceof Rollback)) { console.error(e); failed++; }
}
await sql.end();
console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed (rolled back; DB unchanged).");
process.exit(failed ? 1 : 0);
