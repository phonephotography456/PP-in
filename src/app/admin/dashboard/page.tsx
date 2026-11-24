import Link from "next/link";
import { DataTable, PageTitle, Stat } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboard } from "@/lib/admin-data";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const d = await getDashboard();
  return (
    <>
      <PageTitle title="Dashboard" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Photographers" value={d.total} />
        <Stat label="Approved" value={d.approved} />
        <Stat label="Pending" value={d.pending} />
        <Stat label="Rejected" value={d.rejected} />
        <Stat label="Packages" value={d.packages} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <Link href="/admin/packages?status=pending_review" className="hover:text-ink">{d.pendingPackages} packages awaiting review</Link>
        <Link href="/admin/photographers?tab=reviews" className="hover:text-ink">{d.pendingReviews} reviews awaiting moderation</Link>
        <Link href="/admin/portfolio?status=pending_review" className="hover:text-ink">{d.pendingImages} portfolio images awaiting review</Link>
      </div>

      <h2 className="mb-3 mt-8 font-bold">Recent signups</h2>
      <DataTable head={["Photographer", "Location", "Joined", "Status"]}>
        {d.recent.length === 0 && <tr><td colSpan={4} className="text-muted">No photographers yet.</td></tr>}
        {d.recent.map((p) => (
          <tr key={p.id}>
            <td className="font-semibold"><Link href={`/admin/photographers?view=${p.id}`} className="hover:underline">{p.name}</Link></td>
            <td className="text-muted">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</td>
            <td className="text-muted">{p.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
            <td><StatusBadge status={p.status} /></td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
