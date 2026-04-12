import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const systemInfo = pgTable("system_info", {
  id: serial().primaryKey(),
  key: text().notNull().unique(),
  value: text().notNull(),
});

export const appConfig = pgTable("app_config", {
  id: serial().primaryKey(),
  key: text().notNull().unique(),
  value: jsonb().notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const countdownEvents = pgTable("countdown_events", {
  id: serial().primaryKey(),
  title: text().notNull(),
  date: text().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
