import BetterSqlite3 from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "../db/schema";

const CREATE_TABLE_SQL = `CREATE TABLE countdown_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

describe("countdown_events schema", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof BetterSqlite3>;

  beforeEach(() => {
    sqlite = new BetterSqlite3(":memory:");
    db = drizzle({ client: sqlite, schema });
    db.run(sql.raw(CREATE_TABLE_SQL));
  });

  afterEach(() => {
    sqlite.close();
  });

  it("inserts and retrieves a countdown event", () => {
    const result = db
      .insert(schema.countdownEvents)
      .values({ title: "Test Event", date: "2026-12-25" })
      .returning()
      .get();

    expect(result.id).toBe(1);
    expect(result.title).toBe("Test Event");
    expect(result.date).toBe("2026-12-25");
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });
});
