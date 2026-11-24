import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { photographers } from "./photographers";
import { services } from "./services";
import { packageLevelEnum, packageStatusEnum } from "./enums";

export const packages = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photographerId: uuid("photographer_id")
      .notNull()
      .references(() => photographers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    level: packageLevelEnum("level").notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    /** @deprecated Mirrors offer_price (DB trigger). Kept until every reader is verified migrated; do not read or write. */
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    offerPrice: numeric("offer_price", { precision: 10, scale: 2 }).notNull(),
    shortDescription: varchar("short_description", { length: 300 }),
    inclusions: text("inclusions"),
    detailedDescription: text("detailed_description"),
    /** Canonical https://www.youtube.com/watch?v=<id>; shown in the service portfolio. */
    youtubeUrl: varchar("youtube_url", { length: 100 }),
    /** Optional extras: null = not specified (hidden), true = included, false = not included. */
    travelStayIncluded: boolean("travel_stay_included"),
    locationIncluded: boolean("location_included"),
    makeupIncluded: boolean("makeup_included"),
    costumeIncluded: boolean("costume_included"),
    status: packageStatusEnum("status").default("draft").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("packages_photographer_service_level_unique").on(
      table.photographerId,
      table.serviceId,
      table.level
    ),
    index("packages_photographer_id_idx").on(table.photographerId),
    index("packages_service_id_idx").on(table.serviceId),
    index("packages_status_idx").on(table.status),
    index("packages_level_idx").on(table.level),
    index("packages_offer_price_idx").on(table.offerPrice),
    check("packages_price_positive", sql`price > 0`),
    check("packages_offer_price_positive", sql`offer_price > 0`),
    check("packages_base_gte_offer", sql`base_price >= offer_price`),
  ]
);