import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { modelStatusEnum } from "./enums";
import { smartphoneBrands } from "./smartphone_brands";

export const smartphoneModels = pgTable(
  "smartphone_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => smartphoneBrands.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    status: modelStatusEnum("status").default("active").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("smartphone_models_brand_slug_unique").on(table.brandId, table.slug),
    index("smartphone_models_brand_id_idx").on(table.brandId),
    index("smartphone_models_status_idx").on(table.status),
  ]
);