import Link from "next/link";
import { Act, AdminForm } from "@/components/AdminForm";
import { DataTable, Field, PageTitle } from "@/components/PanelUI";
import { PanelPrice } from "@/components/PanelPrice";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs } from "@/components/Tabs";
import {
  PHOTOGRAPHER_STATUSES, REVIEW_STATUSES, getPhotographerDetail, getPhotographerOptions, getPhotographers, getReviews,
  getServiceOptions, isUuid,
} from "@/lib/admin-data";
import { setPhotographerStatus, setReviewStatus, updatePhotographer } from "../actions";

export const metadata = { title: "Admin Photographers" };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function StatusActions({ id, status }: { id: string; status: string }) {
  const f = (s: string) => ({ id, status: s });
  return (
    <>
      {status !== "approved" && <Act action={setPhotographerStatus} fields={f("approved")} label={status === "pending" ? "Approve" : "Reactivate"} variant="primary" />}
      {status === "pending" && <Act action={setPhotographerStatus} fields={f("rejected")} label="Reject" variant="danger" confirm="Reject this photographer?" />}
      {status === "approved" && <Act action={setPhotographerStatus} fields={f("inactive")} label="Deactivate" confirm="Deactivate? Their profile and packages are hidden from the public site." />}
    </>
  );
}

async function Detail({ id }: { id: string }) {
  const d = await getPhotographerDetail(id);
  if (!d) return <p className="card mb-6 p-5 text-sm text-muted">Photographer not found.</p>;
  const { p } = d;
  const imgs = (s: string) => d.images.find((i) => i.status === s)?.n ?? 0;
  return (
    <section className="card mb-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{p.businessName}</h2>
          <StatusBadge status={p.status} />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <StatusActions id={p.id} status={p.status} />
          <Link href="/admin/photographers" className="btn-outline btn-sm">Close</Link>
        </div>
      </div>
      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Email</dt><dd>{p.email ?? "—"}</dd></div>
        <div><dt className="text-muted">Phone / WhatsApp</dt><dd>{[p.phone, p.whatsapp].filter(Boolean).join(" / ") || "—"}</dd></div>
        <div><dt className="text-muted">Services</dt><dd>{d.services.join(", ") || "—"}</dd></div>
        <div><dt className="text-muted">Smartphones</dt><dd>{d.phones.join(", ") || "—"}</dd></div>
        <div><dt className="text-muted">Profile complete</dt><dd>{p.isProfileComplete ? "Yes" : "No"}</dd></div>
        <div><dt className="text-muted">Portfolio images</dt><dd>{imgs("approved")} approved · {imgs("pending_review")} pending · {imgs("rejected")} rejected</dd></div>
      </dl>
      {p.about && <p className="mt-3 whitespace-pre-line text-sm">{p.about}</p>}

      <h3 className="mb-2 mt-6 text-sm font-bold">Packages</h3>
      {d.packages.length === 0 ? <p className="text-sm text-muted">No packages.</p> : (
        <ul className="divide-y divide-line text-sm">
          {d.packages.map((k, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{k.service} · {cap(k.level)} · {k.name}</span>
              <span className="flex items-center gap-3"><PanelPrice base={k.basePrice} offer={k.offerPrice} /><StatusBadge status={k.status} /></span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-3 mt-6 text-sm font-bold">Edit details</h3>
      <AdminForm action={updatePhotographer} submit="Save details" className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={p.id} />
        <Field label="Business name"><input name="name" required maxLength={150} defaultValue={p.businessName} className="input" /></Field>
        <Field label="Email"><input name="email" type="email" maxLength={255} defaultValue={p.email ?? ""} className="input" /></Field>
        <Field label="Phone"><input name="phone" maxLength={20} defaultValue={p.phone ?? ""} className="input" /></Field>
        <Field label="WhatsApp"><input name="whatsapp" maxLength={20} defaultValue={p.whatsapp ?? ""} className="input" /></Field>
        <Field label="About" className="sm:col-span-2"><textarea name="about" maxLength={5000} defaultValue={p.about ?? ""} className="input min-h-24" /></Field>
      </AdminForm>
    </section>
  );
}

async function PhotographersTab({ sp }: { sp: Params }) {
  const q = first(sp.q) ?? "";
  const status = first(sp.status) ?? "";
  const view = first(sp.view);
  const rows = await getPhotographers({ q, status });
  return (
    <>
      {isUuid(view) && <Detail id={view} />}
      <form className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={q} className="input sm:max-w-xs" placeholder="Search name, email, phone…" />
        <select name="status" defaultValue={status} className="input sm:max-w-[180px]">
          <option value="">All statuses</option>
          {PHOTOGRAPHER_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
        </select>
        <button className="btn-outline">Filter</button>
      </form>
      <DataTable head={["Photographer", "Location", "Phones", "Status", "Actions"]}>
        {rows.length === 0 && <tr><td colSpan={5} className="text-muted">No photographers match.</td></tr>}
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="font-semibold">{p.name}<div className="text-xs font-normal text-muted">{p.email ?? p.phone}</div></td>
            <td className="text-muted">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</td>
            <td className="text-muted">{p.phones.join(", ") || "—"}</td>
            <td><StatusBadge status={p.status} /></td>
            <td>
              <div className="flex flex-wrap items-start gap-2">
                <Link href={`/admin/photographers?view=${p.id}`} className="btn-outline btn-sm">View / Edit</Link>
                <StatusActions id={p.id} status={p.status} />
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

async function ReviewsTab({ sp }: { sp: Params }) {
  // Default to the moderation queue; "all" is an explicit choice.
  const status = first(sp.rstatus) ?? "pending";
  const photographerId = first(sp.rphotographer) ?? "";
  const serviceId = first(sp.rservice) ?? "";
  const [reviews, photographers, services] = await Promise.all([
    getReviews({ photographerId, serviceId, status: status === "all" ? undefined : status }),
    getPhotographerOptions(),
    getServiceOptions(),
  ]);
  return (
    <>
      <form className="mb-4 grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="tab" value="reviews" />
        <select name="rphotographer" defaultValue={photographerId} className="input">
          <option value="">All photographers</option>
          {photographers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="rservice" defaultValue={serviceId} className="input">
          <option value="">All services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="rstatus" defaultValue={status} className="input">
          <option value="all">All statuses</option>
          {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
        </select>
        <button className="btn-outline">Filter</button>
      </form>
      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-sm text-muted">No reviews match.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-brand" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p>
              {r.title && <p className="mt-1 text-sm font-semibold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm">{r.text}</p>
              <p className="mt-2 text-xs text-muted">Reviewer {r.reviewerUserId.slice(0, 8)} → {r.photographer} · {r.service} · {r.submittedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2">
              <StatusBadge status={r.status} />
              {r.status !== "approved" && <Act action={setReviewStatus} fields={{ id: r.id, status: "approved" }} label="Approve" variant="primary" />}
              {r.status !== "rejected" && <Act action={setReviewStatus} fields={{ id: r.id, status: "rejected" }} label="Reject" variant="danger" />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default async function AdminPhotographers({ searchParams }: PageProps<"/admin/photographers">) {
  const sp = await searchParams;
  return (
    <>
      <PageTitle title="Photographers" />
      <Tabs
        initial={first(sp.tab)}
        tabs={[
          { id: "list", label: "Photographers", content: <PhotographersTab sp={sp} /> },
          { id: "reviews", label: "Reviews", content: <ReviewsTab sp={sp} /> },
        ]}
      />
    </>
  );
}
