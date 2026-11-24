import Link from "next/link";
import { PageTitle, Stat } from "@/components/PanelUI";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData } from "@/lib/photographer";

export const metadata = { title: "Dashboard" };

const STATUS_NOTE = {
  pending: "Your account is waiting for admin approval. You can prepare your profile and packages; nothing is public yet.",
  approved: "Your profile is live. Packages appear publicly once an admin publishes them.",
  rejected: "Your registration was not approved. Contact support for next steps. Nothing is public.",
  inactive: "Your account is deactivated. Your data is kept, but nothing is public and content is read-only.",
} as const;

export default async function Dashboard() {
  const { p, counts, completion, byStatus, portfolio } = await getDashboardData();
  return (
    <>
      <PageTitle
        title={`Welcome, ${p.businessName}`}
        sub="Here is how your profile is doing."
        action={p.status === "approved" ? <Link href={`/photographers/p/${p.slug}`} className="btn-outline">View public profile</Link> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-muted">Approval status</p>
          <div className="mt-2"><StatusBadge status={p.status} /></div>
        </div>
        <Stat label="Services" value={counts.services} />
        <Stat label="Packages" value={counts.packages} />
      </div>
      <p className="mt-3 text-sm text-muted">{STATUS_NOTE[p.status]}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Profile completion</h2>
            <span className="font-extrabold text-brand">{completion.percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden bg-surface" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand" style={{ width: `${completion.percent}%` }} />
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            {completion.items.map(([label, done, href]) => (
              <li key={label} className="flex items-center gap-2">
                <span className={`grid h-5 w-5 place-items-center text-xs ${done ? "bg-brand text-on-brand" : "border border-line"}`}>{done && "✓"}</span>
                {done ? <span className="text-muted line-through">{label}</span> : <Link href={href} className="hover:underline">{label}</Link>}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold">Package review</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {(["draft", "pending_review", "published", "rejected"] as const).map((s) => (
                <div key={s} className="flex items-center justify-between border border-line px-3 py-2">
                  <dt><StatusBadge status={s} /></dt><dd className="font-bold">{byStatus(s)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted">Portfolio images: {portfolio.total} total, {portfolio.pending} awaiting review.</p>
          </div>

          <div className="card p-6">
            <h2 className="font-bold">Quick links</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/photographer/profile" className="btn-outline">Edit profile</Link>
              <Link href="/photographer/services" className="btn-outline">Manage packages</Link>
              <Link href="/photographer/portfolio" className="btn-outline">My portfolio</Link>
              <Link href="/photographer/settings" className="btn-outline">Account settings</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
