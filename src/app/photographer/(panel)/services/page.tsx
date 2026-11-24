import Image from "next/image";
import { Act } from "@/components/AdminForm";
import { InclusionsField } from "@/components/InclusionsField";
import { Modal } from "@/components/Modal";
import { NewPackageForm } from "@/components/NewPackageForm";
import { PanelForm } from "@/components/PanelForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { PanelPrice } from "@/components/PanelPrice";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageUpload } from "@/components/ImageUpload";
import { LEVELS, MAX_PACKAGE_IMAGES, MIN_PACKAGE_IMAGES, getServicesData } from "@/lib/photographer";
import { addService, deletePackage, deletePackageImage, movePackage, removeService, savePackage } from "../actions";

export const metadata = { title: "Services & Packages" };

type Data = Awaited<ReturnType<typeof getServicesData>>;
type Pkg = Data["packages"][number];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Svc = Data["mine"][number];
const EXTRA_FIELDS = [
  ["travelStayIncluded", "Travel & Stay", "travelStay"],
  ["locationIncluded", "Location", "location"],
  ["makeupIncluded", "Makeup", "makeup"],
  ["costumeIncluded", "Costume", "costume"],
] as const;
const triValue = (v: boolean | null) => (v === null ? "" : v ? "yes" : "no");

function PackageForm({ svc, level, pkg }: { svc: Svc; level: string; pkg?: Pkg }) {
  const serviceId = svc.id;
  const extras = EXTRA_FIELDS.filter(([, , on]) => svc[on]);
  const fields = (
    <>
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="level" value={level} />
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Base price (₹)"><input name="basePrice" required inputMode="decimal" placeholder="Min 1999" className="input" defaultValue={pkg ? Number(pkg.basePrice) : undefined} /></Field>
        <Field label="Offer price (₹)"><input name="offerPrice" required inputMode="decimal" placeholder="Min 1999" className="input" defaultValue={pkg ? Number(pkg.offerPrice) : undefined} /></Field>
      </div>
      <p className="-mt-1 text-xs text-muted">Offer price is what customers pay. Base price is the original price shown struck through.</p>
      <Field label="What's included"><InclusionsField defaultValue={pkg?.inclusions ?? ""} /></Field>
      {extras.length > 0 && (
        <div>
          <p className="label">Also covered (optional)</p>
          <p className="-mt-1 mb-2 text-xs text-muted">Leave as &quot;Not mentioned&quot; for anything that does not apply. Only what you set is shown on the package.</p>
          <div className="grid grid-cols-2 gap-3">
            {extras.map(([name, label]) => (
              <Field key={name} label={label}>
                <select name={name} className="input" defaultValue={pkg ? triValue(pkg[name]) : ""}>
                  <option value="">Not mentioned</option>
                  <option value="yes">Included</option>
                  <option value="no">Not included</option>
                </select>
              </Field>
            ))}
          </div>
        </div>
      )}
      <Field label="YouTube video link (optional)"><input name="youtubeUrl" type="url" maxLength={300} placeholder="https://www.youtube.com/watch?v=..." className="input" defaultValue={pkg?.youtubeUrl ?? ""} /></Field>
      <Field label="Detailed description"><textarea name="detailedDescription" maxLength={8000} className="input min-h-24" defaultValue={pkg?.detailedDescription ?? ""} /></Field>
      {pkg?.status === "published" && <p className="text-xs text-muted">Saving changes sends this live package back for review.</p>}
    </>
  );
  return pkg
    ? <PanelForm action={savePackage} submit="Save package" className="grid gap-3">{fields}</PanelForm>
    : <NewPackageForm action={savePackage}>{fields}</NewPackageForm>;
}

function PackageImages({ pkg }: { pkg: Pkg }) {
  const n = pkg.images.length;
  return (
    <div className="mb-5 border-b border-line pb-5">
      <p className="label">Banner image (required)</p>
      <p className="-mt-1 mb-2 text-xs text-muted">The main picture on the package card.</p>
      <div className="grid grid-cols-3 gap-2">
        {pkg.images.map((img, i) => (
          <div key={img.id} className={`relative aspect-square overflow-hidden bg-surface ${i === 0 ? "ring-2 ring-ink" : ""}`}>
            <Image src={img.imageUrl} alt={img.altText ?? pkg.name} fill unoptimized className="object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 bg-ink px-1.5 py-0.5 text-[11px] font-bold text-canvas">Banner</span>}
            {pkg.status !== "inactive" && (
              <div className="absolute inset-x-0 bottom-0 bg-canvas/90 p-1">
                <Act action={deletePackageImage} fields={{ id: img.id }} label="Remove" variant="danger" confirm="Remove this image?" />
              </div>
            )}
          </div>
        ))}
      </div>
      {n < MIN_PACKAGE_IMAGES && <p className="mt-2 text-xs text-muted">Upload a banner image before submitting for review.</p>}
      {pkg.status !== "inactive" && <ImageUpload kind="package" targetId={pkg.id} remaining={Math.max(0, MAX_PACKAGE_IMAGES - n)} single label="Upload banner image" />}
    </div>
  );
}

function Tier({ svc, level, pkg }: { svc: Svc; level: string; pkg?: Pkg }) {
  if (!pkg) {
    return (
      <div className="border border-dashed border-line p-4">
        <p className="font-semibold">{cap(level)}</p>
        <p className="mt-1 text-sm text-muted">Not added yet. Optional.</p>
        <div className="mt-3"><Modal label="Add package" title={`${cap(level)} package`} subtitle={`${svc.name} · fill in the details for this package only`}><PackageForm svc={svc} level={level} /></Modal></div>
      </div>
    );
  }
  const locked = pkg.status === "inactive";
  return (
    <div className="border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{cap(level)}</span>
        <StatusBadge status={pkg.status} />
      </div>
      <p className="mt-1 text-sm text-muted">{pkg.name} · <PanelPrice base={pkg.basePrice} offer={pkg.offerPrice} /></p>
      {pkg.status === "rejected" && <p className="mt-1 text-xs text-danger">Rejected by admin. Edit, then resubmit.</p>}
      {locked && <p className="mt-1 text-xs text-muted">Deactivated by an admin. Kept for history.</p>}
      {pkg.images.length < MIN_PACKAGE_IMAGES && <p className="mt-1 text-xs text-danger">Banner image missing. Open Edit to upload it.</p>}
      {!locked && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {(pkg.status === "draft" || pkg.status === "rejected") && <Act action={movePackage} fields={{ id: pkg.id, move: "submit" }} label="Submit for review" variant="primary" />}
          {pkg.status === "pending_review" && <Act action={movePackage} fields={{ id: pkg.id, move: "withdraw" }} label="Withdraw" />}
          <Act action={deletePackage} fields={{ id: pkg.id }} label="Delete" variant="danger" confirm={`Delete your ${cap(level)} package for ${svc.name}?\n\nThis will also permanently delete the banner image and ALL customer reviews associated with this package. This cannot be undone.`} />
        </div>
      )}
      {!locked && <div className="mt-3"><Modal label="Edit" title={`Edit ${cap(level)} package`} subtitle={svc.name}><PackageImages pkg={pkg} /><PackageForm svc={svc} level={level} pkg={pkg} /></Modal></div>}
    </div>
  );
}

export default async function ServicesPage() {
  const { mine, addable, packages } = await getServicesData();
  return (
    <>
      <PageTitle title="Services & Packages" sub="One Basic, Standard and Premium package per service. You do not need all three." />

      {addable.length > 0 && (
        <PanelForm action={addService} submit="Add service" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
          <Field label="Add a service">
            <select name="serviceId" required className="input" defaultValue="">
              <option value="" disabled>Choose a service</option>
              {addable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </PanelForm>
      )}

      <div className="space-y-6">
        {mine.map((s) => {
          const list = packages.filter((k) => k.serviceId === s.id);
          return (
            <section key={s.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{s.name} {s.status === "inactive" && <span className="text-xs font-normal text-muted">(no longer offered; existing packages kept)</span>}</h2>
                {list.length === 0 && <Act action={removeService} fields={{ serviceId: s.id }} label="Remove service" variant="danger" confirm="Remove this service?" />}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {LEVELS.map((level) => {
                  const pkg = list.find((k) => k.level === level);
                  // Deactivated services keep existing packages but take no new ones.
                  return s.status === "inactive" && !pkg
                    ? <div key={level} className="border border-dashed border-line p-4 text-sm text-muted">{cap(level)} unavailable</div>
                    : <Tier key={level} svc={s} level={level} pkg={pkg} />;
                })}
              </div>
            </section>
          );
        })}
        {!mine.length && <p className="card p-6 text-sm text-muted">Add a service above to start creating packages.</p>}
      </div>
    </>
  );
}
