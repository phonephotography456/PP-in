import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

/** Admin on/off switch per homepage section. A section with no row is shown. */
export const homepageSections = pgTable("homepage_sections", {
  key: text("key").primaryKey(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
