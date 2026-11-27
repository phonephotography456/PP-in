"use client";
import { startTransition, useActionState, useState } from "react";
import { submitReview, type ReviewResult } from "@/app/(site)/photographers/p/[slug]/actions";
import { LEVEL_LABEL } from "@/lib/format";
import type { ReviewTarget } from "@/lib/public";

/** Write-a-review form. Rating is required; title and text are optional. Shows the pending confirmation after submit. */
export function ReviewForm({ photographerId, serviceId, targets }: { photographerId: string; serviceId: string; targets: ReviewTarget[] }) {
  const [result, action, pending] = useActionState<ReviewResult, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const [service, setService] = useState(targets.some((t) => t.serviceId === serviceId) ? serviceId : (targets[0]?.serviceId ?? serviceId));
  const options = targets.find((t) => t.serviceId === service)?.packages ?? [];

  if (result?.ok) return <p role="status" className="card p-5 text-sm font-semibold">{result.ok}</p>;

  return (
    // Submit via onSubmit (as PanelForm does) so React does not reset the fields after an error: the chosen package,
    // title and text survive a server-side rejection.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="card grid gap-4 p-5 sm:p-6"
    >
      <input type="hidden" name="photographerId" value={photographerId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="review-service" className="label">Service</label>
          <select id="review-service" name="serviceId" required value={service} onChange={(e) => setService(e.target.value)} className="input">
            {targets.map((t) => <option key={t.serviceId} value={t.serviceId}>{t.serviceName}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="review-package" className="label">Package</label>
          {/* key: reset the choice when the service changes, so a package of another service is never submitted */}
          <select id="review-package" key={service} name="packageId" required defaultValue="" className="input">
            <option value="" disabled>Choose a package</option>
            {options.map((o) => <option key={o.id} value={o.id}>{LEVEL_LABEL[o.level]}</option>)}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`cursor-pointer text-3xl leading-none ${n <= rating ? "text-brand" : "text-line"}`}>
              <input type="radio" name="rating" value={n} required checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span aria-hidden>★</span>
              <span className="sr-only">{n} star{n > 1 && "s"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-title" className="label">Title (optional)</label>
        <input id="review-title" name="title" maxLength={200} className="input" />
      </div>
      <div>
        <label htmlFor="review-text" className="label">Your review (optional)</label>
        <textarea id="review-text" name="text" maxLength={2000} rows={4} className="input" />
      </div>
      {result?.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{result.error}</p>}
      <div><button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Submitting…" : "Submit review"}</button></div>
    </form>
  );
}
