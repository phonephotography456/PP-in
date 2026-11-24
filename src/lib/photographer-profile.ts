import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { withUser } from "@/db/with-user";
import { photographers } from "@/db/schema";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "photographer";

/**
 * Creates the pending-approval photographer profile for a verified photographer account.
 * Idempotent (unique user_id); runs under RLS as the user. Data comes from signup metadata.
 */
export async function ensurePhotographerProfile(user: User) {
  const name = String(user.user_metadata?.business_name ?? "").trim() || "New Photographer";
  const phone = String(user.user_metadata?.phone ?? "").trim() || null;
  // No ON CONFLICT: Postgres also applies SELECT policies to the new row for ON CONFLICT,
  // and owner-read cannot see a row that does not exist yet. Check first, tolerate a race.
  try {
    await withUser(user.id, async (tx) => {
      const existing = await tx.select({ id: photographers.id }).from(photographers).where(eq(photographers.userId, user.id)).limit(1);
      if (existing.length) return;
      await tx.insert(photographers).values({
        id: randomUUID(),
        userId: user.id,
        businessName: name.slice(0, 150),
        slug: `${slugify(name)}-${randomBytes(3).toString("hex")}`,
        email: user.email ?? null,
        phone,
        status: "pending",
      });
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "23505") throw e; // concurrent request created it
  }
}
