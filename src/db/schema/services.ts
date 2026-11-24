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
} from "drizzle-orm/pg-core";
import { serviceStatusEnum } from "./enums";

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    /** Admin switches: which optional package extras photographers can fill in (and customers see) for this service. */
    travelStayEnabled: boolean("travel_stay_enabled").default(true).notNull(),
    locationEnabled: boolean("location_enabled").default(true).notNull(),
    makeupEnabled: boolean("makeup_enabled").default(true).notNull(),
    costumeEnabled: boolean("costume_enabled").default(true).notNull(),
    /** Admin switch: this service gets a package section on the homepage. */
    showOnHome: boolean("show_on_home").default(false).notNull(),
    status: serviceStatusEnum("status").default("active").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("services_slug_unique").on(table.slug),
    index("services_status_idx").on(table.status),
  ]
);