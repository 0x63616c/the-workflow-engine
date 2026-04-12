import BetterSqlite3 from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "../db/schema";
import {
  createCountdownEvent,
  getCountdownEventById,
  listPastCountdownEvents,
  listUpcomingCountdownEvents,
  removeCountdownEvent,
  updateCountdownEvent,
} from "../services/countdown-events";

const CREATE_TABLE_SQL = `CREATE TABLE countdown_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

function createTestDb() {
  const sqlite = new BetterSqlite3(":memory:");
  const db = drizzle({ client: sqlite, schema });
  db.run(sql.raw(CREATE_TABLE_SQL));
  return { db, sqlite };
}

type TestDB = ReturnType<typeof createTestDb>["db"];

describe("countdown_events schema", () => {
  let db: TestDB;
  let sqlite: InstanceType<typeof BetterSqlite3>;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
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

describe("countdown events service", () => {
  let db: TestDB;
  let sqlite: InstanceType<typeof BetterSqlite3>;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
  });

  afterEach(() => {
    sqlite.close();
  });

  it("create inserts and returns event with id", () => {
    const event = createCountdownEvent(db, {
      title: "Test Event",
      date: "2026-12-25",
    });

    expect(event.id).toBe(1);
    expect(event.title).toBe("Test Event");
    expect(event.date).toBe("2026-12-25");
  });

  it("listUpcoming returns only future events ordered by date ASC", () => {
    createCountdownEvent(db, { title: "Past", date: "2020-01-01" });
    createCountdownEvent(db, { title: "Far future", date: "2030-06-15" });
    createCountdownEvent(db, { title: "Near future", date: "2027-01-01" });

    const upcoming = listUpcomingCountdownEvents(db);

    expect(upcoming).toHaveLength(2);
    expect(upcoming[0].title).toBe("Near future");
    expect(upcoming[1].title).toBe("Far future");
  });

  it("listPast returns only past events ordered by date DESC", () => {
    createCountdownEvent(db, { title: "Past old", date: "2019-01-01" });
    createCountdownEvent(db, { title: "Past recent", date: "2024-06-15" });
    createCountdownEvent(db, { title: "Future", date: "2030-01-01" });

    const past = listPastCountdownEvents(db);

    expect(past).toHaveLength(2);
    expect(past[0].title).toBe("Past recent");
    expect(past[1].title).toBe("Past old");
  });

  it("getById returns a single event", () => {
    const created = createCountdownEvent(db, {
      title: "Find me",
      date: "2026-06-01",
    });

    const found = getCountdownEventById(db, created.id);

    expect(found.title).toBe("Find me");
  });

  it("getById throws for non-existent id", () => {
    expect(() => getCountdownEventById(db, 999)).toThrow();
  });

  it("update modifies title and date", () => {
    const created = createCountdownEvent(db, {
      title: "Original",
      date: "2026-06-01",
    });

    const updated = updateCountdownEvent(db, created.id, {
      title: "Updated",
      date: "2026-07-01",
    });

    expect(updated.title).toBe("Updated");
    expect(updated.date).toBe("2026-07-01");
  });

  it("update throws for non-existent id", () => {
    expect(() => updateCountdownEvent(db, 999, { title: "Nope", date: "2026-01-01" })).toThrow();
  });

  it("remove deletes event", () => {
    const created = createCountdownEvent(db, {
      title: "Delete me",
      date: "2026-06-01",
    });

    removeCountdownEvent(db, created.id);

    expect(() => getCountdownEventById(db, created.id)).toThrow();
  });

  it("remove throws for non-existent id", () => {
    expect(() => removeCountdownEvent(db, 999)).toThrow();
  });
});
