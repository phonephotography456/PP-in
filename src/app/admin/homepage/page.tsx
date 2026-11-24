import { Act, AdminForm, Disclose } from "@/components/AdminForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { getHomepage } from "@/lib/admin-data";
import { addFeatured, deleteBanner, deleteFeatured, moveFeatured, saveBanner, setFeaturedActive } from "../actions";

export const metadata = { title: "Homepage Management" };

type Banner = { id: string; imageUrl: string; heading: string | null; description: string | null; linkUrl: string | null; sortOrder: number; isActive: boolean };

function BannerForm({ b }: { b?: Banner }) {
  return (
    <AdminForm action={saveBanner} submit={b ? "Save banner" : "Add banner"} className="grid gap-4 md:grid-cols-2">
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label="Image URL" className="md:col-span-2"><input name="imageUrl" type="url" required maxLength={2000} defaultValue={b?.imageUrl} className="input" placeholder="https://…" /></Field>
      <Field label="Heading"><input name="heading" maxLength={200} defaultValue={b?.heading ?? ""} className="input" /></Field>
      <Field label="Link (optional)"><input name="linkUrl" maxLength={2000} defaultValue={b?.linkUrl ?? ""} className="input" placeholder="/search or https://…" /></Field>
      <Field label="Supporting text" className="md:col-span-2"><textarea name="description" maxLength={1000} defaultValue={b?.description ?? ""} className="input min-h-20" /></Field>
      <Field label="Order"><input name="sortOrder" type="number" min={0} max={9999} defaultValue={b?.sortOrder ?? 0} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm md:self-end md:pb-2.5"><input type="checkbox" name="isActive" defaultChecked={b?.isActive ?? true} className="accent-brand" /> Active</label>
    </AdminForm>
  );
}

export default async function HomepageAdmin() {
  const { banners, featured, options } = await getHomepage();
  const available = options.filter((o) => !featured.some((f) => f.photographerId === o.id));
  return (
    <>
      <PageTitle title="Homepage Management" />
      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <h2 className="font-bold">Banners</h2>
          <p className="text-sm text-muted">Active banners show on the homepage, lowest order first.</p>
          <ul className="mt-4 divide-y divide-line">
            {banners.length === 0 && <li className="py-3 text-sm text-muted">No banners yet.</li>}
            {banners.map((b) => (
              <li key={b.id} className="py-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.heading ?? "Banner"} loading="lazy" className="aspect-[16/10] w-40 rounded-2xl bg-surface object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.heading || "(no heading)"}</p>
                    <p className="line-clamp-2 text-sm text-muted">{b.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted"><StatusBadge status={b.isActive ? "Active" : "Inactive"} /> Order {b.sortOrder}</div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Disclose label="Edit" className="w-full sm:w-auto"><BannerForm b={b} /></Disclose>
                    <Act action={deleteBanner} fields={{ id: b.id }} label="Delete" variant="danger" confirm="Delete this banner?" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Disclose label="Add banner" className="mt-4"><BannerForm /></Disclose>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-bold">Featured photographers</h2>
          <p className="text-sm text-muted">Shown in Top Photographers, in this order. Only approved photographers can be featured.</p>
          <ul className="mt-4 divide-y divide-line">
            {featured.length === 0 && <li className="py-3 text-sm text-muted">Nothing featured yet.</li>}
            {featured.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-6 text-sm text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name ?? f.title ?? "(removed photographer)"}</span>
                {!f.isActive && <StatusBadge status="Inactive" />}
                <div className="flex flex-wrap items-start gap-2">
                  <Act action={moveFeatured} fields={{ id: f.id, dir: "up" }} label="↑" />
                  <Act action={moveFeatured} fields={{ id: f.id, dir: "down" }} label="↓" />
                  <Act action={setFeaturedActive} fields={{ id: f.id, active: f.isActive ? "0" : "1" }} label={f.isActive ? "Hide" : "Show"} />
                  <Act action={deleteFeatured} fields={{ id: f.id }} label="Remove" variant="danger" />
                </div>
              </li>
            ))}
          </ul>
          <AdminForm action={addFeatured} submit="Add photographer" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start" submitClass="btn-outline">
            <select name="photographerId" required defaultValue="" className="input sm:max-w-xs" aria-label="Photographer to feature">
              <option value="" disabled>Select approved photographer</option>
              {available.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </AdminForm>
        </section>
      </div>
    </>
  );
}
