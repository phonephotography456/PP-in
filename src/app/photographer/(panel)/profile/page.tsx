import { PanelForm } from "@/components/PanelForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { StateCity } from "@/components/StateCity";
import { UploadNotice } from "@/components/UploadNotice";
import { getProfileData } from "@/lib/photographer";
import { saveProfile } from "../actions";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const { p, states, cities, models, selected } = await getProfileData();
  // Active models, plus inactive ones the photographer already has (shown locked so history stays visible).
  const visible = models.filter((m) => (m.status === "active" && m.brandStatus === "active") || selected.has(m.id));
  const brands = [...new Map(visible.map((m) => [m.brandId, m.brand])).entries()];

  return (
    <>
      <PageTitle title="My Profile" sub="This information appears on your public page once your account is approved." />

      <section className="card mb-6 p-6">
        <h2 className="font-bold">Images</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {([["Profile photo", p.profilePhotoUrl], ["Logo (optional)", p.logoUrl], ["Banner", p.bannerUrl]] as const).map(([label, url]) => (
            <div key={label}>
              <p className="label">{label}</p>
              <div className="grid aspect-[4/3] place-items-center overflow-hidden border border-dashed border-line bg-surface text-xs text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : "No image"}
              </div>
            </div>
          ))}
        </div>
        <UploadNotice />
      </section>

      <PanelForm action={saveProfile} submit="Save changes" className="space-y-6">
        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Contact</h2>
          <Field label="Name"><input name="businessName" required maxLength={150} className="input" defaultValue={p.businessName} /></Field>
          <Field label="Contact email"><input name="email" type="email" className="input" defaultValue={p.email ?? ""} /></Field>
          <Field label="Phone"><input name="phone" type="tel" className="input" defaultValue={p.phone ?? ""} /></Field>
          <Field label="WhatsApp"><input name="whatsapp" type="tel" className="input" defaultValue={p.whatsapp ?? ""} /></Field>
          <StateCity states={states} cities={cities} stateId={p.stateId} cityId={p.cityId} />
          <Field label="About" className="sm:col-span-2"><textarea name="about" maxLength={4000} className="input min-h-28" defaultValue={p.about ?? ""} /></Field>
        </section>

        <section className="card p-6">
          <h2 className="font-bold">Smartphones used</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map(([brandId, brand]) => (
              <fieldset key={brandId}>
                <legend className="label">{brand}</legend>
                {visible.filter((m) => m.brandId === brandId).map((m) => {
                  const locked = m.status !== "active" || m.brandStatus !== "active";
                  return (
                    <label key={m.id} className="flex items-center gap-2 py-1 text-sm">
                      {/* Inactive models are kept as-is (disabled boxes are not submitted, and the action never removes them). */}
                      <input type="checkbox" name="modelId" value={m.id} defaultChecked={selected.has(m.id)} disabled={locked} className="accent-brand" />
                      {m.name}{locked && <span className="text-xs text-muted">(no longer offered)</span>}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {!brands.length && <p className="text-sm text-muted">No smartphone models are available yet.</p>}
          </div>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-3">
          <h2 className="font-bold sm:col-span-3">Social links</h2>
          <Field label="Instagram"><input name="instagramUrl" className="input" placeholder="https://instagram.com/…" defaultValue={p.instagramUrl ?? ""} /></Field>
          <Field label="YouTube"><input name="youtubeUrl" className="input" placeholder="https://youtube.com/…" defaultValue={p.youtubeUrl ?? ""} /></Field>
          <Field label="Website"><input name="websiteUrl" className="input" placeholder="https://…" defaultValue={p.websiteUrl ?? ""} /></Field>
        </section>
      </PanelForm>
    </>
  );
}
