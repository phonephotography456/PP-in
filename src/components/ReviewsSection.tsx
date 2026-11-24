import Link from "next/link";
import { REVIEWS } from "@/lib/mock";

export function ReviewsSection({ rating }: { rating: number }) {
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight"><span className="text-brand">★</span> {rating} · Reviews</h2>
        <Link href="/reviewer/login" className="btn-outline">Write a Review</Link>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure key={r.name} className="card p-5">
            <p className="text-brand">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p>
            <blockquote className="mt-2 text-sm leading-relaxed">{r.text}</blockquote>
            <figcaption className="mt-3 text-xs text-muted">{r.name} · {r.date}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Only admin-approved reviews are shown. Sign in to submit one.</p>
    </section>
  );
}
