import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { photographers } from "./photographers";
import { services } from "./services";

export const photographerServices = pgTable(
  "photographer_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photographerId: uuid("photographer_id")
      .notNull()
      .references(() => photographers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("photographer_services_photographer_service_unique").on(
      table.photographerId,
      table.serviceId
    ),
    index("photographer_services_photographer_id_idx").on(table.photographerId),
    index("photographer_services_service_id_idx").on(table.serviceId),
  ]
);