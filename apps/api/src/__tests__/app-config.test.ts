import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { getAllConfig, getConfig, setConfig } from "../services/app-config";
import { appRouter } from "../trpc/routers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../db/migrations");

type TestDB = ReturnType<typeof drizzle<typeof schema>>;

function createTestPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://evee:evee@localhost:5432/evee_test",
  });
}

// --- Service tests ---

describe("app-config service", () => {
  let pool: Pool;
  let db: TestDB;

  beforeAll(async () => {
    pool = createTestPool();
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE app_config RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("setConfig inserts a new key", async () => {
    await setConfig(db, "theme.activePaletteId", "midnight");
    const value = await getConfig(db, "theme.activePaletteId");
    expect(value).toBe("midnight");
  });

  it("setConfig upserts on conflict", async () => {
    await setConfig(db, "theme.activePaletteId", "midnight");
    await setConfig(db, "theme.activePaletteId", "daylight");
    const value = await getConfig(db, "theme.activePaletteId");
    expect(value).toBe("daylight");
  });

  it("setConfig stores numeric values", async () => {
    await setConfig(db, "display.idleTimeout_MS", 60000);
    const value = await getConfig(db, "display.idleTimeout_MS");
    expect(value).toBe(60000);
  });

  it("getConfig returns null for missing key", async () => {
    const value = await getConfig(db, "nonexistent.key");
    expect(value).toBeNull();
  });

  it("getAllConfig returns all entries as a record", async () => {
    await setConfig(db, "theme.activePaletteId", "midnight");
    await setConfig(db, "display.idleTimeout_MS", 45000);

    const all = await getAllConfig(db);
    expect(all["theme.activePaletteId"]).toBe("midnight");
    expect(all["display.idleTimeout_MS"]).toBe(45000);
  });

  it("getAllConfig returns empty object when no config", async () => {
    const all = await getAllConfig(db);
    expect(all).toEqual({});
  });
});

// --- Router tests ---

describe("app-config router", () => {
  let pool: Pool;
  let db: TestDB;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    pool = createTestPool();
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE app_config RESTART IDENTITY CASCADE");
    // biome-ignore lint/suspicious/noExplicitAny: test context with pg db
    caller = appRouter.createCaller({ db } as any);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("set and get a string value", async () => {
    await caller.appConfig.set({ key: "theme.activePaletteId", value: "midnight" });
    const result = await caller.appConfig.get({ key: "theme.activePaletteId" });
    expect(result.value).toBe("midnight");
  });

  it("set upserts on duplicate key", async () => {
    await caller.appConfig.set({ key: "theme.activePaletteId", value: "midnight" });
    await caller.appConfig.set({ key: "theme.activePaletteId", value: "daylight" });
    const result = await caller.appConfig.get({ key: "theme.activePaletteId" });
    expect(result.value).toBe("daylight");
  });

  it("set and get a numeric value", async () => {
    await caller.appConfig.set({ key: "display.idleTimeout_MS", value: 60000 });
    const result = await caller.appConfig.get({ key: "display.idleTimeout_MS" });
    expect(result.value).toBe(60000);
  });

  it("get returns null value for missing key", async () => {
    const result = await caller.appConfig.get({ key: "does.not.exist" });
    expect(result.value).toBeNull();
  });

  it("getAll returns all entries", async () => {
    await caller.appConfig.set({ key: "theme.activePaletteId", value: "daylight" });
    await caller.appConfig.set({ key: "display.idleTimeout_MS", value: 30000 });
    const result = await caller.appConfig.getAll();
    expect(result["theme.activePaletteId"]).toBe("daylight");
    expect(result["display.idleTimeout_MS"]).toBe(30000);
  });

  it("getAll returns empty object when no config exists", async () => {
    const result = await caller.appConfig.getAll();
    expect(result).toEqual({});
  });
});
