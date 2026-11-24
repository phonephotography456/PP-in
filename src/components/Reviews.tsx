import Link from "next/link";
import { Suspense } from "react";
import { withUser } from "@/db/with-user";
import { packages, serviceReviews } from "@/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { getUser, roleOf } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/format";
import type { PublicReview, ReviewTarget } from "@/lib/public";
import { Modal } from "./Modal";
import { ReviewForm } from "./ReviewForm";
import { StatusBadge } from "./StatusBadge";

const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Stars({ rating }: { rating: number }) {
  const n = Math.round(rating);
  return <span className="text-brand" role="img" aria-label={`${rating} out of 5`}>{"★".repeat(n)}<span className="text-line">{"★".repeat(5 - n)}</span></span>;
}

/** Customer-specific part: sign-in prompt, own review status, or the form. Needs the session, so it streams separately. */
async function WriteReview({ photographerId, serviceId, targets, path }: { photographerId: string; serviceId: string; targets: ReviewTarget[]; path: string }) {
  const user = await getUser();
  if (!user) {
    const next = encodeURIComponent(`${path}#reviews-${serviceId}`);
    return (
      <Modal label="Write a review" title="Sign in to write a review" subtitle="Only customer accounts can review. You will return to this page afterwards." triggerClass="btn-primary px-8 py-3 text-base">
        <div className="flex flex-wrap gap-3">
          <Link href={`/reviewer/login?next=${next}`} className="btn-primary">Log in</Link>
          <Link href={`/reviewer/register?next=${next}`} className="btn-outline">Sign up</Link>
        </div>
      </Modal>
    );
  }
  if (roleOf(user) !== "customer") {
    return (
      <Modal label="Write a review" title="Customer account needed" subtitle="You are signed in with a photographer or admin account. Only customer accounts can write reviews." triggerClass="btn-primary px-8 py-3 text-base">
        <p className="text-sm">Log out, then log in or sign up as a customer to review this service.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/reviewer/login?next=${encodeURIComponent(`${path}#reviews-${serviceId}`)}`} className="btn-primary">Customer log in</Link>
        </div>
      </Modal>
    );
  }

  const mine = await withUser(user.id, (tx) =>
    tx.select({ status: serviceReviews.status, level: packages.level }).from(serviceReviews)
      .leftJoin(packages, eq(packages.id, serviceReviews.packageId))
      .where(and(eq(serviceReviews.reviewerUserId, user.id), eq(serviceReviews.photographerId, photographerId), eq(serviceReviews.serviceId, serviceId), ne(serviceReviews.status, "rejected")))
      .orderBy(desc(serviceReviews.submittedAt)),
  );
  return (
    <Modal label="Write a review" title="Write a review" triggerClass="btn-primary px-8 py-3 text-base">
      {mine.map((m, i) => (
        <p key={i} className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          Your {m.level ? `${LEVEL_LABEL[m.level]} package ` : ""}review: <StatusBadge status={m.status} />
          {m.status === "pending" && <span className="text-muted">It will be published once approved by our admin team.</span>}
        </p>
      ))}
      <ReviewForm photographerId={photographerId} serviceId={serviceId} targets={targets} />
    </Modal>
  );
}

export function Reviews({ photographerId, serviceId, targets, path, reviews }: {
  photographerId: string; serviceId: string; targets: ReviewTarget[]; path: string;
  reviews: { count: number; average: number | null; items: PublicReview[] };
}) {
  return (
    <section className="mt-8" aria-labelledby={`reviews-${serviceId}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 id={`reviews-${serviceId}`} className="heading-section">Reviews</h3>
        {reviews.average !== null && (
          <p className="flex items-center gap-2 text-sm">
            <Stars rating={reviews.average} />
            <span className="font-semibold">{reviews.average.toFixed(1)}</span>
            <span className="text-muted">({reviews.count} review{reviews.count !== 1 && "s"})</span>
          </p>
        )}
      </div>

      {reviews.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No reviews yet. Be the first to review this service.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {reviews.items.map((r) => (
            <li key={r.id} className="card min-w-0 p-5 [overflow-wrap:anywhere]">
              <div className="flex items-center justify-between gap-2">
                <Stars rating={r.rating} />
                {r.level && <span className="badge">{LEVEL_LABEL[r.level]} package</span>}
              </div>
              {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
              {r.text && <p className="mt-1 whitespace-pre-line break-words text-sm">{r.text}</p>}
              <p className="mt-2 text-xs text-muted">{r.name ?? "Customer"} · {date(r.date)}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Suspense fallback={null}><WriteReview photographerId={photographerId} serviceId={serviceId} targets={targets} path={path} /></Suspense>
      </div>
    </section>
  );
}
