// ABOUT: Drizzle schema for the D1 database.
// ABOUT: Phase 1 only declares _pipeline_check; Phase 4 drops it and adds the real tables.

import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const pipelineCheck = sqliteTable("_pipeline_check", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),
});
