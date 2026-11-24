import { Act, AdminForm, Disclose } from "@/components/AdminForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { getLocations } from "@/lib/admin-data";
import { deleteLocation, saveCity, saveState, setLocationActive } from "../actions";

export const metadata = { title: "Locations" };

function NameForm({ action, hidden, row, submit }: {
  action: typeof saveState; hidden: Record<string, string>; row?: { name: string; sortOrder: number }; submit: string;
}) {
  return (
    <AdminForm action={action} submit={submit} className="grid gap-3 sm:grid-cols-[1fr_90px_auto] sm:items-end">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Field label="Name"><input name="name" required maxLength={100} defaultValue={row?.name} className="input" /></Field>
      <Field label="Order"><input name="sortOrder" type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} className="input" /></Field>
    </AdminForm>
  );
}

function Row({ kind, id, active, uses, children }: { kind: "state" | "city"; id: string; active: boolean; uses: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Disclose label="Edit">{children}</Disclose>
      <Act action={setLocationActive} fields={{ kind, id, active: active ? "0" : "1" }} label={active ? "Deactivate" : "Activate"} />
      {uses === 0 && <Act action={deleteLocation} fields={{ kind, id }} label="Delete" variant="danger" confirm="Delete permanently?" />}
    </div>
  );
}

export default async function Locations() {
  const states = await getLocations();
  return (
    <>
      <PageTitle title="Locations" sub="Cities belong to a state. Locations used by photographers can be deactivated but not deleted." />
      <Disclose label="Add state" className="mb-6">
        <NameForm action={saveState} hidden={{}} submit="Add state" />
      </Disclose>
      {states.length === 0 && <p className="text-sm text-muted">No states yet.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {states.map((s) => (
          <section key={s.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-bold">{s.name} <StatusBadge status={s.isActive ? "Active" : "Inactive"} /></h2>
              <Row kind="state" id={s.id} active={s.isActive} uses={s.uses + s.cities.length}>
                <NameForm action={saveState} hidden={{ id: s.id }} row={s} submit="Save" />
              </Row>
            </div>
            <ul className="mt-4 divide-y divide-line text-sm">
              {s.cities.length === 0 && <li className="py-2.5 text-muted">No cities.</li>}
              {s.cities.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                  <span className="flex items-center gap-2">{c.name}{!c.isActive && <StatusBadge status="Inactive" />}</span>
                  <Row kind="city" id={c.id} active={c.isActive} uses={c.uses}>
                    <NameForm action={saveCity} hidden={{ id: c.id }} row={c} submit="Save" />
                  </Row>
                </li>
              ))}
            </ul>
            <Disclose label="Add city" className="mt-4">
              <NameForm action={saveCity} hidden={{ stateId: s.id }} submit="Add city" />
            </Disclose>
          </section>
        ))}
      </div>
    </>
  );
}
