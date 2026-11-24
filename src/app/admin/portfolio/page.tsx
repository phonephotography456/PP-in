import { Act } from "@/components/AdminForm";
import { PageTitle } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { IMAGE_STATUSES, getPortfolioImages } from "@/lib/admin-data";
import { setImageStatus } from "../actions";

export const metadata = { title: "Admin Portfolio" };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ");

export default async function AdminPortfolio({ searchParams }: PageProps<"/admin/portfolio">) {
  const sp = await searchParams;
  // Default to the moderation queue; "all" is an explicit choice.
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = raw ?? "pending_review";
  const images = await getPortfolioImages({ status: status === "all" ? undefined : status });
  return (
    <>
      <PageTitle title="Portfolio" sub="Review and moderate uploaded images." action={
        <form className="flex gap-2">
          <select name="status" defaultValue={status} className="input w-auto">
            <option value="all">All statuses</option>
            {IMAGE_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
          <button className="btn-outline">Filter</button>
        </form>
      } />
      {images.length === 0 && <p className="text-sm text-muted">No images match.</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="card overflow-hidden">
            {/* Remote photographer uploads; host is not known at build time, so next/image is not used. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt ?? `${img.photographer} – ${img.segment}`} loading="lazy" className="aspect-square w-full bg-surface object-cover" />
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{img.photographer}<span className="block truncate text-xs font-normal text-muted">{img.segment}</span></p>
                <StatusBadge status={img.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                {img.status !== "approved" && <Act action={setImageStatus} fields={{ id: img.id, status: "approved" }} label="Approve" variant="primary" />}
                {img.status === "pending_review" && <Act action={setImageStatus} fields={{ id: img.id, status: "rejected" }} label="Reject" variant="danger" />}
                {img.status === "approved" && <Act action={setImageStatus} fields={{ id: img.id, status: "inactive" }} label="Hide" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
