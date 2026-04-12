import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../db/migrations");

import { runMigrations } from "../db/migrate";
import * as schema from "../db/schema";
import {
  createCountdownEvent,
  getCountdownEventById,
  listPastCountdownEvents,
  listUpcomingCountdownEvents,
  removeCountdownEvent,
  updateCountdownEvent,
} from "../services/countdown-events";
import { appRouter } from "../trpc/routers";

type TestDB = ReturnType<typeof drizzle<typeof schema>>;

function createTestPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://workflow:workflow@localhost:5432/workflow_engine_test",
  });
}

// --- Schema tests ---

describe("countdown_events schema", () => {
  let pool: Pool;
  let db: TestDB;

  beforeAll(async () => {
    pool = createTestPool();
    db = drizzle(pool, { schema });
    await migrate(db, {
      migrationsFolder: MIGRATIONS_DIR,
    });
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE countdown_events, system_info RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("inserts and retrieves a countdown event", async () => {
    const rows = await db
      .insert(schema.countdownEvents)
      .values({ title: "Test Event", date: "2026-12-25" })
      .returning();

    const result = rows[0];
    expect(result.id).toBe(1);
    expect(result.title).toBe("Test Event");
    expect(result.date).toBe("2026-12-25");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

// --- Service tests ---

describe("countdown events service", () => {
  let pool: Pool;
  let db: TestDB;

  beforeAll(async () => {
    pool = createTestPool();
    db = drizzle(pool, { schema });
    await migrate(db, {
      migrationsFolder: MIGRATIONS_DIR,
    });
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE countdown_events, system_info RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("create inserts and returns event with id", async () => {
    const event = await createCountdownEvent(db, {
      title: "Test Event",
      date: "2026-12-25",
    });

    expect(event.id).toBe(1);
    expect(event.title).toBe("Test Event");
    expect(event.date).toBe("2026-12-25");
  });

  it("listUpcoming returns only future events ordered by date ASC", async () => {
    await createCountdownEvent(db, { title: "Past", date: "2020-01-01" });
    await createCountdownEvent(db, { title: "Far future", date: "2030-06-15" });
    await createCountdownEvent(db, { title: "Near future", date: "2027-01-01" });

    const upcoming = await listUpcomingCountdownEvents(db);

    expect(upcoming).toHaveLength(2);
    expect(upcoming[0].title).toBe("Near future");
    expect(upcoming[1].title).toBe("Far future");
  });

  it("listPast returns only past events ordered by date DESC", async () => {
    await createCountdownEvent(db, { title: "Past old", date: "2019-01-01" });
    await createCountdownEvent(db, { title: "Past recent", date: "2024-06-15" });
    await createCountdownEvent(db, { title: "Future", date: "2030-01-01" });

    const past = await listPastCountdownEvents(db);

    expect(past).toHaveLength(2);
    expect(past[0].title).toBe("Past recent");
    expect(past[1].title).toBe("Past old");
  });

  it("getById returns a single event", async () => {
    const created = await createCountdownEvent(db, {
      title: "Find me",
      date: "2026-06-01",
    });

    const found = await getCountdownEventById(db, created.id);

    expect(found.title).toBe("Find me");
  });

  it("getById throws for non-existent id", async () => {
    await expect(getCountdownEventById(db, 999)).rejects.toThrow(
      "Countdown event with id 999 not found",
    );
  });

  it("update modifies title and date", async () => {
    const created = await createCountdownEvent(db, {
      title: "Original",
      date: "2026-06-01",
    });

    const updated = await updateCountdownEvent(db, created.id, {
      title: "Updated",
      date: "2026-07-01",
    });

    expect(updated.title).toBe("Updated");
    expect(updated.date).toBe("2026-07-01");
  });

  it("update throws for non-existent id", async () => {
    await expect(
      updateCountdownEvent(db, 999, { title: "Nope", date: "2026-01-01" }),
    ).rejects.toThrow();
  });

  it("remove deletes event", async () => {
    const created = await createCountdownEvent(db, {
      title: "Delete me",
      date: "2026-06-01",
    });

    await removeCountdownEvent(db, created.id);

    await expect(getCountdownEventById(db, created.id)).rejects.toThrow();
  });

  it("remove throws for non-existent id", async () => {
    await expect(removeCountdownEvent(db, 999)).rejects.toThrow();
  });
});

// --- Router tests ---

describe("countdown events router", () => {
  let pool: Pool;
  let db: TestDB;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    pool = createTestPool();
    db = drizzle(pool, { schema });
    await migrate(db, {
      migrationsFolder: MIGRATIONS_DIR,
    });
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE countdown_events, system_info RESTART IDENTITY CASCADE");
    // biome-ignore lint/suspicious/noExplicitAny: test context with pg db
    caller = appRouter.createCaller({ db } as any);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("create returns event with id", async () => {
    const result = await caller.countdownEvents.create({
      title: "Test",
      date: "2026-12-25",
    });

    expect(result.id).toBe(1);
    expect(result.title).toBe("Test");
  });

  it("create rejects invalid date format", async () => {
    await expect(
      caller.countdownEvents.create({
        title: "Bad date",
        date: "not-a-date",
      }),
    ).rejects.toThrow();
  });

  it("create rejects empty title", async () => {
    await expect(
      caller.countdownEvents.create({ title: "", date: "2026-12-25" }),
    ).rejects.toThrow();
  });

  it("listUpcoming returns future events", async () => {
    await caller.countdownEvents.create({
      title: "Future",
      date: "2030-01-01",
    });
    await caller.countdownEvents.create({
      title: "Past",
      date: "2020-01-01",
    });

    const result = await caller.countdownEvents.listUpcoming();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Future");
  });

  it("listPast returns past events", async () => {
    await caller.countdownEvents.create({
      title: "Future",
      date: "2030-01-01",
    });
    await caller.countdownEvents.create({
      title: "Past",
      date: "2020-01-01",
    });

    const result = await caller.countdownEvents.listPast();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Past");
  });

  it("getById returns single event", async () => {
    const created = await caller.countdownEvents.create({
      title: "Find me",
      date: "2026-06-01",
    });

    const result = await caller.countdownEvents.getById({ id: created.id });

    expect(result.title).toBe("Find me");
  });

  it("update modifies event", async () => {
    const created = await caller.countdownEvents.create({
      title: "Original",
      date: "2026-06-01",
    });

    const updated = await caller.countdownEvents.update({
      id: created.id,
      title: "Updated",
      date: "2026-07-01",
    });

    expect(updated.title).toBe("Updated");
  });

  it("remove deletes event", async () => {
    const created = await caller.countdownEvents.create({
      title: "Delete me",
      date: "2026-06-01",
    });

    await caller.countdownEvents.remove({ id: created.id });

    await expect(caller.countdownEvents.getById({ id: created.id })).rejects.toThrow();
  });

  it("runMigrations is idempotent", async () => {
    await expect(runMigrations()).resolves.not.toThrow();
    await expect(runMigrations()).resolves.not.toThrow();
  });
});
