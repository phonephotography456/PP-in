import Image from "next/image";
import { Act, Disclose } from "@/components/AdminForm";
import { PanelForm } from "@/components/PanelForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { PanelPrice } from "@/components/PanelPrice";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadNotice } from "@/components/UploadNotice";
import { LEVELS, MAX_PACKAGE_IMAGES, MIN_PACKAGE_IMAGES, getServicesData } from "@/lib/photographer";
import { addService, deletePackage, deletePackageImage, movePackage, removeService, savePackage } from "../actions";

export const metadata = { title: "Services & Packages" };

type Data = Awaited<ReturnType<typeof getServicesData>>;
type Pkg = Data["packages"][number];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function PackageForm({ serviceId, level, pkg }: { serviceId: string; level: string; pkg?: Pkg }) {
  return (
    <PanelForm action={savePackage} submit={pkg ? "Save package" : "Create package"} className="grid gap-3">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="level" value={level} />
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <Field label="Package name"><input name="name" required maxLength={150} className="input" defaultValue={pkg?.name} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Base price (₹)"><input name="basePrice" required inputMode="decimal" className="input" defaultValue={pkg ? Number(pkg.basePrice) : undefined} /></Field>
        <Field label="Offer price (₹)"><input name="offerPrice" required inputMode="decimal" className="input" defaultValue={pkg ? Number(pkg.offerPrice) : undefined} /></Field>
      </div>
      <p className="-mt-1 text-xs text-muted">Offer price is what customers pay. Base price is the original price shown struck through.</p>
      <Field label="Short description (2 lines)"><input name="shortDescription" required maxLength={160} className="input" defaultValue={pkg?.shortDescription ?? ""} /></Field>
      <Field label="What's included (one per line)"><textarea name="inclusions" required maxLength={4000} className="input min-h-24" defaultValue={pkg?.inclusions ?? ""} /></Field>
      <Field label="Detailed description"><textarea name="detailedDescription" maxLength={8000} className="input min-h-24" defaultValue={pkg?.detailedDescription ?? ""} /></Field>
      {pkg?.status === "published" && <p className="text-xs text-muted">Saving changes sends this live package back for review.</p>}
    </PanelForm>
  );
}

function PackageImages({ pkg }: { pkg: Pkg }) {
  const n = pkg.images.length;
  return (
    <div className="mt-3">
      <p className="label">Images ({n} of {MIN_PACKAGE_IMAGES}–{MAX_PACKAGE_IMAGES})</p>
      <div className="grid grid-cols-3 gap-2">
        {pkg.images.map((img) => (
          <div key={img.id} className="relative aspect-square overflow-hidden bg-surface">
            <Image src={img.imageUrl} alt={img.altText ?? pkg.name} fill unoptimized className="object-cover" />
            {pkg.status !== "inactive" && (
              <div className="absolute inset-x-0 bottom-0 bg-white/90 p-1">
                <Act action={deletePackageImage} fields={{ id: img.id }} label="Remove" variant="danger" confirm="Remove this image?" />
              </div>
            )}
          </div>
        ))}
      </div>
      {n < MIN_PACKAGE_IMAGES && <p className="mt-2 text-xs text-muted">Add at least {MIN_PACKAGE_IMAGES} images before submitting for review.</p>}
      <UploadNotice className="mt-2" />
    </div>
  );
}

function Tier({ serviceId, level, pkg }: { serviceId: string; level: string; pkg?: Pkg }) {
  if (!pkg) {
    return (
      <div className="border border-dashed border-line p-4">
        <p className="font-semibold">{cap(level)}</p>
        <p className="mt-1 text-sm text-muted">Not added yet. Optional.</p>
        <Disclose label="Add package" className="mt-3"><PackageForm serviceId={serviceId} level={level} /></Disclose>
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
      {pkg.status === "rejected" && <p className="mt-1 text-xs text-red-700">Rejected by admin. Edit, then resubmit.</p>}
      {locked && <p className="mt-1 text-xs text-muted">Deactivated by an admin. Kept for history.</p>}
      <PackageImages pkg={pkg} />
      {!locked && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {(pkg.status === "draft" || pkg.status === "rejected") && <Act action={movePackage} fields={{ id: pkg.id, move: "submit" }} label="Submit for review" variant="primary" />}
          {pkg.status === "pending_review" && <Act action={movePackage} fields={{ id: pkg.id, move: "withdraw" }} label="Withdraw" />}
          <Act action={deletePackage} fields={{ id: pkg.id }} label="Delete" variant="danger" confirm="Delete this package and its images?" />
        </div>
      )}
      {!locked && <Disclose label="Edit" className="mt-3"><PackageForm serviceId={serviceId} level={level} pkg={pkg} /></Disclose>}
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
                    : <Tier key={level} serviceId={s.id} level={level} pkg={pkg} />;
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
