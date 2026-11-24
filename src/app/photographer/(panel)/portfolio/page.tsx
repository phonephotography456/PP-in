import Image from "next/image";
import { Act, Disclose } from "@/components/AdminForm";
import { PanelForm } from "@/components/PanelForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadNotice } from "@/components/UploadNotice";
import { getPortfolioData } from "@/lib/photographer";
import { createSegment, deletePortfolioImage, deleteSegment, renameSegment } from "../actions";

export const metadata = { title: "My Portfolio" };

export default async function PortfolioPage() {
  const { segments } = await getPortfolioData();
  return (
    <>
      <PageTitle title="My Portfolio" sub="Group your best work into segments. New or replaced images are reviewed before they appear publicly." />

      <PanelForm action={createSegment} submit="Create segment" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <Field label="New segment name"><input name="name" required maxLength={100} className="input" /></Field>
      </PanelForm>
      <UploadNotice className="mb-6" />

      <div className="space-y-6">
        {segments.map((s) => (
          <section key={s.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{s.name}</h2>
                {s.description && <p className="text-sm text-muted">{s.description}</p>}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Disclose label="Rename">
                  <PanelForm action={renameSegment} submit="Save">
                    <input type="hidden" name="id" value={s.id} />
                    <Field label="Name"><input name="name" required maxLength={100} className="input" defaultValue={s.name} /></Field>
                    <Field label="Description"><input name="description" maxLength={500} className="input" defaultValue={s.description ?? ""} /></Field>
                  </PanelForm>
                </Disclose>
                <Act action={deleteSegment} fields={{ id: s.id }} label="Delete" variant="danger" confirm="Delete this segment and all its images?" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {s.images.map((img) => (
                <div key={img.id}>
                  <div className="relative aspect-square overflow-hidden bg-surface">
                    <Image src={img.imageUrl} alt={img.altText ?? s.name} fill unoptimized className="object-cover" />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <StatusBadge status={img.status} />
                    {img.status !== "inactive" && <Act action={deletePortfolioImage} fields={{ id: img.id }} label="✕" variant="danger" confirm="Delete this image?" />}
                  </div>
                </div>
              ))}
              {!s.images.length && <p className="col-span-full text-sm text-muted">No images in this segment yet.</p>}
            </div>
          </section>
        ))}
        {!segments.length && <p className="card p-6 text-sm text-muted">Create a segment to start building your portfolio.</p>}
      </div>
    </>
  );
}
