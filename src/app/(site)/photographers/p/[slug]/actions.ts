"use server";

import { withUser } from "@/db/with-user";
import { serviceReviews } from "@/db/schema";
import { dbMessage } from "@/lib/admin";
import { isUuid } from "@/lib/admin-data";
import { getUser, roleOf } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { str } from "@/lib/validate";

export type ReviewResult = { ok?: string; error?: string } | null;

const REVIEW_CONFIRMATION = "Your review has been submitted successfully and is awaiting admin approval. It will appear publicly once approved.";

/**
 * Customer submits a review. Identity comes from the verified session, never from the form.
 * The insert runs under RLS: customer role only, status forced to 'pending', target must be public.
 */
export async function submitReview(_: ReviewResult, fd: FormData): Promise<ReviewResult> {
  const user = await getUser();
  if (!user) return { error: "Sign in to write a review." };
  if (roleOf(user) !== "customer") return { error: "Only customer accounts can write reviews." };

  const photographerId = fd.get("photographerId");
  const serviceId = fd.get("serviceId");
  const packageId = fd.get("packageId");
  if (!isUuid(photographerId) || !isUuid(serviceId)) return { error: "Invalid review target." };
  if (!isUuid(packageId)) return { error: "Choose which package you are reviewing." };

  const rating = Number(fd.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5 stars." };
  const rawTitle = fd.get("title");
  if (typeof rawTitle === "string" && rawTitle.trim().length > 200) return { error: "Title is too long (max 200 characters)." };
  const title = str(rawTitle, 200) || null;
  const rawText = fd.get("text");
  if (typeof rawText === "string" && rawText.trim().length > 2000) return { error: "Review is too long (max 2000 characters)." };
  const reviewText = str(rawText, 2000) || null;

  if (!rateLimit(`review:${user.id}`, 5, 60 * 60_000).ok) return { error: "Too many reviews. Please try again later." };

  try {
    await withUser(user.id, (tx) =>
      tx.insert(serviceReviews).values({ reviewerUserId: user.id, photographerId, serviceId, packageId, rating, title, reviewText, status: "pending" }),
    );
    return { ok: REVIEW_CONFIRMATION };
  } catch (e) {
    const code = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (code === "23505") return { error: "You have already reviewed this package." };
    if (code === "42501") return { error: "You can't review this service." };
    return { error: dbMessage(e) };
  }
}
