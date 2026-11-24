import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { photographers } from "./photographers";
import { smartphoneModels } from "./smartphone_models";

export const photographerPhones = pgTable(
  "photographer_phones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photographerId: uuid("photographer_id")
      .notNull()
      .references(() => photographers.id, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => smartphoneModels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("photographer_phones_photographer_model_unique").on(
      table.photographerId,
      table.modelId
    ),
    index("photographer_phones_photographer_id_idx").on(table.photographerId),
    index("photographer_phones_model_id_idx").on(table.modelId),
  ]
);