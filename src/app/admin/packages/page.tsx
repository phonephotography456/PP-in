import { Act } from "@/components/AdminForm";
import { DataTable, PageTitle } from "@/components/PanelUI";
import { PanelPrice } from "@/components/PanelPrice";
import { StatusBadge } from "@/components/StatusBadge";
import { LEVELS, PACKAGE_STATUSES, PRICE_BUCKETS, getPackages, getPhotographerOptions, getServiceOptions } from "@/lib/admin-data";
import { setPackageStatus } from "../actions";

export const metadata = { title: "Admin Packages" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ");

export default async function AdminPackages({ searchParams }: PageProps<"/admin/packages">) {
  const sp = await searchParams;
  const f = { photographerId: first(sp.photographer), serviceId: first(sp.service), level: first(sp.level), price: first(sp.price), status: first(sp.status) };
  const [rows, photographers, services] = await Promise.all([getPackages(f), getPhotographerOptions(), getServiceOptions()]);
  return (
    <>
      <PageTitle title="Packages" sub="Filter and moderate package publication. Publishing needs a banner image." />
      <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <select name="photographer" defaultValue={f.photographerId} className="input">
          <option value="">All photographers</option>
          {photographers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="service" defaultValue={f.serviceId} className="input">
          <option value="">All services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="level" defaultValue={f.level} className="input">
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
        </select>
        <select name="price" defaultValue={f.price} className="input">
          <option value="">Any price</option>
          {Object.entries(PRICE_BUCKETS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select name="status" defaultValue={f.status} className="input">
          <option value="">All statuses</option>
          {PACKAGE_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
        </select>
        <button className="btn-outline">Filter</button>
      </form>
      <DataTable head={["Package", "Photographer", "Level", "Price", "Images", "Status", "Actions"]}>
        {rows.length === 0 && <tr><td colSpan={7} className="text-muted">No packages match.</td></tr>}
        {rows.map((k) => {
          const to = (status: string) => ({ id: k.id, status });
          return (
            <tr key={k.id}>
              <td className="font-semibold">{k.name}<div className="text-xs font-normal text-muted">{k.service}</div></td>
              <td className="text-muted">{k.photographer}</td>
              <td>{cap(k.level)}</td>
              <td><PanelPrice base={k.basePrice} offer={k.offerPrice} /></td>
              <td className="text-muted">{k.images}</td>
              <td><StatusBadge status={k.status} /></td>
              <td>
                <div className="flex flex-wrap items-start gap-2">
                  {(k.status === "pending_review" || k.status === "rejected" || k.status === "inactive") && <Act action={setPackageStatus} fields={to("published")} label="Publish" variant="primary" />}
                  {k.status === "published" && <Act action={setPackageStatus} fields={to("inactive")} label="Unpublish" />}
                  {k.status === "pending_review" && <Act action={setPackageStatus} fields={to("rejected")} label="Reject" variant="danger" />}
                  {k.status === "draft" && <span className="text-xs text-muted">Photographer draft</span>}
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
