import { Act, AdminForm, Disclose } from "@/components/AdminForm";
import { DataTable, Field, PageTitle } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs } from "@/components/Tabs";
import { getMasterData } from "@/lib/admin-data";
import { deleteMaster, saveMaster, setMasterStatus } from "../actions";

export const metadata = { title: "Master Data" };

type Entity = "service" | "brand" | "model";

function Actions({ entity, id, status, uses, form }: { entity: Entity; id: string; status: string; uses: number; form: React.ReactNode }) {
  const active = status === "active";
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Disclose label="Edit">{form}</Disclose>
      <Act action={setMasterStatus} fields={{ entity, id, status: active ? "inactive" : "active" }} label={active ? "Deactivate" : "Activate"} />
      {uses === 0 && <Act action={deleteMaster} fields={{ entity, id }} label="Delete" variant="danger" confirm="Delete permanently?" />}
    </div>
  );
}

function EditForm({ entity, row }: { entity: Entity; row?: { id: string; name: string; sortOrder: number; description?: string | null } }) {
  return (
    <AdminForm action={saveMaster} submit={row ? "Save" : `Add ${entity}`} className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
      <input type="hidden" name="entity" value={entity} />
      {row && <input type="hidden" name="id" value={row.id} />}
      <Field label="Name"><input name="name" required maxLength={100} defaultValue={row?.name} className="input" /></Field>
      <Field label="Order"><input name="sortOrder" type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} className="input" /></Field>
      {entity === "service" && (
        <Field label="Description" className="sm:col-span-3"><input name="description" maxLength={1000} defaultValue={row?.description ?? ""} className="input" /></Field>
      )}
    </AdminForm>
  );
}

export default async function MasterData() {
  const { services, brands, models } = await getMasterData();
  return (
    <>
      <PageTitle title="Master Data Management" sub="Deactivated records disappear from new selections but stay on existing photographers and packages." />
      <Tabs
        tabs={[
          {
            id: "services", label: "Services",
            content: (
              <>
                <div className="card mb-4 p-4"><EditForm entity="service" /></div>
                <DataTable head={["Service", "Order", "Status", "Actions"]}>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.name}{s.description && <div className="text-xs font-normal text-muted">{s.description}</div>}</td>
                      <td className="text-muted">{s.sortOrder}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td><Actions entity="service" id={s.id} status={s.status} uses={s.uses} form={<EditForm entity="service" row={s} />} /></td>
                    </tr>
                  ))}
                </DataTable>
              </>
            ),
          },
          {
            id: "brands", label: "Smartphone Brands",
            content: (
              <>
                <div className="card mb-4 p-4"><EditForm entity="brand" /></div>
                <DataTable head={["Brand", "Models", "Order", "Status", "Actions"]}>
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td className="font-semibold">{b.name}</td>
                      <td className="text-muted">{b.models}</td>
                      <td className="text-muted">{b.sortOrder}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td><Actions entity="brand" id={b.id} status={b.status} uses={b.models} form={<EditForm entity="brand" row={b} />} /></td>
                    </tr>
                  ))}
                </DataTable>
              </>
            ),
          },
          {
            id: "models", label: "Smartphone Models",
            content: (
              <>
                <AdminForm action={saveMaster} submit="Add model" className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end">
                  <input type="hidden" name="entity" value="model" />
                  <Field label="Brand">
                    <select name="brandId" required defaultValue="" className="input">
                      <option value="" disabled>Select brand</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.status === "inactive" ? " (inactive)" : ""}</option>)}
                    </select>
                  </Field>
                  <Field label="Name"><input name="name" required maxLength={100} className="input" /></Field>
                  <Field label="Order"><input name="sortOrder" type="number" min={0} max={9999} defaultValue={0} className="input" /></Field>
                </AdminForm>
                <DataTable head={["Model", "Brand", "Status", "Actions"]}>
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td className="font-semibold">{m.name}</td>
                      <td className="text-muted">{m.brand}</td>
                      <td><StatusBadge status={m.status} /></td>
                      <td><Actions entity="model" id={m.id} status={m.status} uses={m.uses} form={<EditForm entity="model" row={m} />} /></td>
                    </tr>
                  ))}
                </DataTable>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
