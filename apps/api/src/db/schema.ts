import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const systemInfo = sqliteTable("system_info", {
  id: int().primaryKey({ autoIncrement: true }),
  key: text().notNull().unique(),
  value: text().notNull(),
});

export const countdownEvents = sqliteTable("countdown_events", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  date: text().notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
