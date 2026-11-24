import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const homepageBanners = pgTable(
  "homepage_banners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imageUrl: text("image_url").notNull(),
    heading: varchar("heading", { length: 200 }),
    description: text("description"),
    linkUrl: text("link_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("homepage_banners_is_active_idx").on(table.isActive),
    index("homepage_banners_sort_order_idx").on(table.sortOrder),
  ]
);