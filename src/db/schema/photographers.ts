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
import { photographerStatusEnum } from "./enums";
import { states } from "./states";
import { cities } from "./cities";

export const photographers = pgTable(
  "photographers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    businessName: varchar("business_name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 150 }).notNull(),
    profilePhotoUrl: text("profile_photo_url"),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),
    about: text("about"),
    phone: varchar("phone", { length: 20 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    email: varchar("email", { length: 255 }),
    instagramUrl: text("instagram_url"),
    youtubeUrl: text("youtube_url"),
    websiteUrl: text("website_url"),
    stateId: uuid("state_id").references(() => states.id, { onDelete: "set null" }),
    cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
    status: photographerStatusEnum("status").default("pending").notNull(),
    isProfileComplete: boolean("is_profile_complete").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("photographers_user_id_unique").on(table.userId),
    uniqueIndex("photographers_slug_unique").on(table.slug),
    index("photographers_status_idx").on(table.status),
    index("photographers_state_id_idx").on(table.stateId),
    index("photographers_city_id_idx").on(table.cityId),
  ]
);