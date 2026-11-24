import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { photographers } from "./photographers";
import { services } from "./services";
import { packages } from "./packages";
import { reviewStatusEnum } from "./enums";

export const serviceReviews = pgTable(
  "service_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewerUserId: uuid("reviewer_user_id").notNull(),
    photographerId: uuid("photographer_id")
      .notNull()
      .references(() => photographers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    /** Package reviewed. Null only for reviews written before packages were selectable. Deleting the package deletes its reviews. */
    packageId: uuid("package_id").references(() => packages.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 200 }),
    reviewText: text("review_text"),
    reviewerName: varchar("reviewer_name", { length: 150 }),
    status: reviewStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("service_reviews_reviewer_user_id_idx").on(table.reviewerUserId),
    index("service_reviews_photographer_id_idx").on(table.photographerId),
    index("service_reviews_service_id_idx").on(table.serviceId),
    index("service_reviews_status_idx").on(table.status),
    index("service_reviews_photographer_service_idx").on(table.photographerId, table.serviceId),
    check("service_reviews_rating_range", sql`rating >= 1 AND rating <= 5`),
  ]
);