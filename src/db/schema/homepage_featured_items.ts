import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { photographers } from "./photographers";

export const homepageFeaturedItems = pgTable(
  "homepage_featured_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photographerId: uuid("photographer_id").references(() => photographers.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 200 }),
    description: text("description"),
    imageUrl: text("image_url"),
    linkUrl: text("link_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("homepage_featured_items_photographer_id_idx").on(table.photographerId),
    index("homepage_featured_items_is_active_idx").on(table.isActive),
    index("homepage_featured_items_sort_order_idx").on(table.sortOrder),
  ]
);