import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const systemInfo = sqliteTable("system_info", {
  id: int().primaryKey({ autoIncrement: true }),
  key: text().notNull().unique(),
  value: text().notNull(),
});
