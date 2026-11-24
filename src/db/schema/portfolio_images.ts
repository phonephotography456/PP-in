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
import { portfolioSegments } from "./portfolio_segments";
import { portfolioImageStatusEnum } from "./enums";

export const portfolioImages = pgTable(
  "portfolio_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => portfolioSegments.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    altText: varchar("alt_text", { length: 255 }),
    status: portfolioImageStatusEnum("status").default("pending_review").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_images_segment_id_idx").on(table.segmentId),
    index("portfolio_images_status_idx").on(table.status),
    index("portfolio_images_sort_order_idx").on(table.segmentId, table.sortOrder),
    check("portfolio_images_sort_order_non_negative", sql`sort_order >= 0`),
  ]
);