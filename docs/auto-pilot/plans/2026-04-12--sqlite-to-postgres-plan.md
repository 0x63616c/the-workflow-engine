# SQLite to PostgreSQL Migration - Implementation Plan

**Goal:** Replace the SQLite/bun:sqlite database driver with PostgreSQL via node-postgres and Drizzle ORM's node-postgres adapter, with automated migrations and real-Postgres tests.

**Architecture:** A `pg.Pool` replaces the `bun:sqlite` Database instance in `db/client.ts`, and a new `db/migrate.ts` module runs Drizzle migrations at server startup before any other initialization. The countdown-events service layer becomes fully async since `node-postgres` returns Promises everywhere.

**Tech Stack:** `pg` ^8.13.0, `drizzle-orm/node-postgres`, `drizzle-orm/node-postgres/migrator`, `drizzle-kit` (already installed), `postgres:16-alpine` Docker image.

---

## Dependency Order

Tasks must be executed in this order:

1. Packages (add `pg`, remove `better-sqlite3`)
2. Infrastructure (docker-compose, Postgres running locally)
3. Schema (pg-core types)
4. Drizzle config (dialect switch)
5. Generate migrations (requires running Postgres + drizzle-kit)
6. DB client rewrite (Pool + drizzle/node-postgres)
7. Migration runner (new file)
8. env.ts (DATABASE_URL default)
9. server.ts (call runMigrations)
10. Service layer async conversion
11. tRPC context type update
12. Seed script async conversion
13. Tests rewrite (requires Postgres running)
14. vitest.config.ts cleanup
15. Import boundary update
16. Kamal config
17. CI workflows
18. Delete obsolete files

---

### Task 1: Update packages

**Files:**
- Modify: `apps/api/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Add `pg` and `@types/pg`, remove `better-sqlite3` and `@types/better-sqlite3`**

  In `apps/api/package.json`:
  - Add to `dependencies`: `"pg": "^8.13.0"`
  - Add to `devDependencies`: `"@types/pg": "^8.11.0"`
  - Remove from `devDependencies`: `"better-sqlite3": "^12.8.0"` and `"@types/better-sqlite3": "^7.6.13"`

  In root `package.json`:
  - Remove `"better-sqlite3"` from the `trustedDependencies` array (keep others)

- [ ] **Step 2: Install packages**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && bun install`
  Expected: installs `pg` and `@types/pg`, lockfile updated, no errors

- [ ] **Step 3: Commit**
  ```
  git add apps/api/package.json package.json bun.lockb
  git commit -m "chore: swap better-sqlite3 for pg in api dependencies"
  git push
  ```

---

### Task 2: Add Postgres to docker-compose

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add postgres service and volume**

  Replace the contents of `docker-compose.yml` with:
  ```yaml
  services:
    inngest:
      image: inngest/inngest
      command: inngest dev -u http://host.docker.internal:4201/api/inngest --no-discovery --no-poll
      ports:
        - "${INNGEST_PORT:-8288}:8288"
      environment:
        - INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY:-local-dev-event-key-00000000}
        - INNGEST_SIGNING_KEY=${INNGEST_SIGNING_KEY:-signing-key-0000000000000000}
      extra_hosts:
        - "host.docker.internal:host-gateway"

    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_USER: workflow
        POSTGRES_PASSWORD: workflow
        POSTGRES_DB: workflow_engine
      ports:
        - "${POSTGRES_PORT:-5432}:5432"
      volumes:
        - postgres-data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U workflow -d workflow_engine"]
        interval: 5s
        timeout: 5s
        retries: 10

  volumes:
    postgres-data:
  ```

- [ ] **Step 2: Start postgres and verify healthy**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && docker-compose up -d postgres`
  Expected: container starts, no errors

  Run: `docker inspect --format='{{.State.Health.Status}}' $(docker ps -qf name=feat-sqlite-to-postgres-postgres)`
  Expected: `healthy`

  If the container name doesn't match, run: `docker ps --filter name=postgres` to find the correct name.

- [ ] **Step 3: Commit**
  ```
  git add docker-compose.yml
  git commit -m "feat: add postgres service to docker-compose"
  git push
  ```

---

### Task 3: Update schema to pg-core

**Files:**
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Write the failing typecheck**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && bun run typecheck`
  Note the current state (should pass). After making the schema change below, typecheck will fail until client.ts is also updated.

- [ ] **Step 2: Rewrite schema.ts**

  Replace the entire contents of `apps/api/src/db/schema.ts` with:
  ```ts
  import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

  export const systemInfo = pgTable("system_info", {
    id: serial().primaryKey(),
    key: text().notNull().unique(),
    value: text().notNull(),
  });

  export const countdownEvents = pgTable("countdown_events", {
    id: serial().primaryKey(),
    title: text().notNull(),
    date: text().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  });
  ```

  Key changes from current `schema.ts`:
  - `import { sql } from "drizzle-orm"` removed (no longer needed)
  - `sqliteTable` -> `pgTable`, imported from `drizzle-orm/pg-core`
  - `int` -> `serial` (auto-increment PK in Postgres)
  - `text` timestamps with `sql\`(datetime('now'))\`` -> `timestamp` with `.defaultNow()`
  - `systemInfo` table keeps the same structure (was already using `sqliteTable`)

- [ ] **Step 3: Commit**
  ```
  git add apps/api/src/db/schema.ts
  git commit -m "feat: migrate schema from sqlite-core to pg-core"
  git push
  ```

---

### Task 4: Update drizzle.config.ts

**Files:**
- Modify: `apps/api/drizzle.config.ts`

- [ ] **Step 1: Switch dialect to postgresql**

  Replace the entire contents of `apps/api/drizzle.config.ts` with:
  ```ts
  import { defineConfig } from "drizzle-kit";

  export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./src/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
      url: process.env.DATABASE_URL ?? "postgresql://workflow:workflow@localhost:5432/workflow_engine",
    },
  });
  ```

- [ ] **Step 2: Commit**
  ```
  git add apps/api/drizzle.config.ts
  git commit -m "chore: update drizzle config for postgresql dialect"
  git push
  ```

---

### Task 5: Delete old SQLite migration and generate Postgres migration

**Files:**
- Delete: `apps/api/src/db/migrations/0001_add_countdown_events.sql`
- Create: `apps/api/src/db/migrations/<generated>.sql` (via drizzle-kit)

- [ ] **Step 1: Delete old SQLite migration file**

  Run: `rm /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api/src/db/migrations/0001_add_countdown_events.sql`

- [ ] **Step 2: Generate new Postgres migration**

  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine bun run db:generate`
  Expected: exits 0, creates a new `.sql` file in `src/db/migrations/` (e.g. `0000_init.sql`) containing `CREATE TABLE` statements for `system_info` and `countdown_events` with PG syntax (`SERIAL PRIMARY KEY`, `TIMESTAMP`, etc.)

- [ ] **Step 3: Verify migration SQL looks correct**

  Read the generated file. It should contain:
  - `CREATE TABLE "system_info"` with `serial`, `text` columns
  - `CREATE TABLE "countdown_events"` with `serial`, `text`, `timestamp` columns
  - No `INTEGER PRIMARY KEY AUTOINCREMENT` or `datetime('now')` anywhere

- [ ] **Step 4: Commit**
  ```
  git add apps/api/src/db/migrations/
  git commit -m "feat: generate postgres drizzle migration"
  git push
  ```

---

### Task 6: Rewrite db/client.ts for node-postgres

**Files:**
- Modify: `apps/api/src/db/client.ts`

- [ ] **Step 1: Rewrite client.ts**

  Replace the entire contents of `apps/api/src/db/client.ts` with:
  ```ts
  import { Pool } from "pg";
  import { drizzle } from "drizzle-orm/node-postgres";

  import { env } from "../env";
  import * as schema from "./schema";

  export const pool = new Pool({ connectionString: env.DATABASE_URL });
  export const db = drizzle(pool, { schema });
  ```

  Key changes from current `client.ts`:
  - Remove `import { Database } from "bun:sqlite"` and `import { drizzle } from "drizzle-orm/bun-sqlite"`
  - Remove `sqlite.exec("PRAGMA journal_mode = WAL;")` (SQLite-only)
  - Remove inline `CREATE TABLE IF NOT EXISTS` DDL (replaced by Drizzle migrations)
  - `new Database(env.DATABASE_URL)` -> `new Pool({ connectionString: env.DATABASE_URL })`
  - `drizzle({ client: sqlite, schema })` -> `drizzle(pool, { schema })`
  - Export both `pool` (for graceful shutdown) and `db`

- [ ] **Step 2: Commit**
  ```
  git add apps/api/src/db/client.ts
  git commit -m "feat: rewrite db client to use pg.Pool and drizzle/node-postgres"
  git push
  ```

---

### Task 7: Create db/migrate.ts

**Files:**
- Create: `apps/api/src/db/migrate.ts`

- [ ] **Step 1: Create migrate.ts**

  Create `apps/api/src/db/migrate.ts` with:
  ```ts
  import { resolve } from "node:path";
  import { migrate } from "drizzle-orm/node-postgres/migrator";

  import { db } from "./client";

  export async function runMigrations() {
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dir, "./migrations"),
    });
  }
  ```

- [ ] **Step 2: Commit**
  ```
  git add apps/api/src/db/migrate.ts
  git commit -m "feat: add runMigrations helper using drizzle/node-postgres/migrator"
  git push
  ```

---

### Task 8: Update env.ts DATABASE_URL default

**Files:**
- Modify: `apps/api/src/env.ts`

- [ ] **Step 1: Update DATABASE_URL validator**

  In `apps/api/src/env.ts`, change line 7 from:
  ```ts
  DATABASE_URL: z.string().default("./data.db"),
  ```
  to:
  ```ts
  DATABASE_URL: z.string().url().default("postgresql://workflow:workflow@localhost:5432/workflow_engine"),
  ```

  The `z.string().url()` tightening is intentional: any non-URL value (including the old `./data.db`) will throw at startup, preventing silent misconfiguration.

- [ ] **Step 2: Commit**
  ```
  git add apps/api/src/env.ts
  git commit -m "feat: update DATABASE_URL default and validator for postgres"
  git push
  ```

---

### Task 9: Update server.ts startup sequence

**Files:**
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Add runMigrations import and call**

  In `apps/api/src/server.ts`:

  Add this import at the top (after the `node:path` import, before other imports):
  ```ts
  import { pool } from "./db/client";
  import { runMigrations } from "./db/migrate";
  ```

  Replace the current startup sequence (line 11: `await ha.init();`) with:
  ```ts
  await runMigrations();
  await ha.init();
  ```

  Add graceful shutdown handlers after the `console.log` at the bottom of the file:
  ```ts
  const shutdown = async () => {
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  ```

- [ ] **Step 2: Commit**
  ```
  git add apps/api/src/server.ts
  git commit -m "feat: call runMigrations at startup and add graceful shutdown"
  git push
  ```

---

### Task 10: Convert countdown-events service to async

**Files:**
- Modify: `apps/api/src/services/countdown-events.ts`

- [ ] **Step 1: Write failing test (verify current tests pass, then they'll fail after service change)**

  Run existing tests before making changes:
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && bun run test`
  Expected: tests will fail since `better-sqlite3` was removed in Task 1. Note which tests are failing.

- [ ] **Step 2: Rewrite countdown-events.ts**

  Replace the entire contents of `apps/api/src/services/countdown-events.ts` with:
  ```ts
  import { asc, desc, eq, gte, lt, sql } from "drizzle-orm";
  import type { NodePgDatabase } from "drizzle-orm/node-postgres";

  import { countdownEvents } from "../db/schema";
  import type * as schema from "../db/schema";

  type DB = NodePgDatabase<typeof schema>;

  interface CountdownEventInput {
    title: string;
    date: string;
  }

  function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  export async function createCountdownEvent(db: DB, input: CountdownEventInput) {
    const rows = await db
      .insert(countdownEvents)
      .values({ title: input.title, date: input.date })
      .returning();
    return rows[0];
  }

  export async function listUpcomingCountdownEvents(db: DB) {
    return db
      .select()
      .from(countdownEvents)
      .where(gte(countdownEvents.date, todayISO()))
      .orderBy(asc(countdownEvents.date));
  }

  export async function listPastCountdownEvents(db: DB) {
    return db
      .select()
      .from(countdownEvents)
      .where(lt(countdownEvents.date, todayISO()))
      .orderBy(desc(countdownEvents.date));
  }

  export async function getCountdownEventById(db: DB, id: number) {
    const rows = await db.select().from(countdownEvents).where(eq(countdownEvents.id, id));
    if (rows.length === 0) {
      throw new Error(`Countdown event with id ${id} not found`);
    }
    return rows[0];
  }

  export async function updateCountdownEvent(db: DB, id: number, input: CountdownEventInput) {
    await getCountdownEventById(db, id);

    const rows = await db
      .update(countdownEvents)
      .set({
        title: input.title,
        date: input.date,
        updatedAt: sql`now()`,
      })
      .where(eq(countdownEvents.id, id))
      .returning();
    return rows[0];
  }

  export async function removeCountdownEvent(db: DB, id: number) {
    await getCountdownEventById(db, id);
    await db.delete(countdownEvents).where(eq(countdownEvents.id, id));
  }
  ```

  Key changes from current service:
  - `BaseSQLiteDatabase` type -> `NodePgDatabase<typeof schema>`
  - All functions are `async` and return `Promise`
  - `.get()` removed — PG returns arrays, use `rows[0]`
  - `.all()` removed — direct `await` returns array
  - `.run()` removed — just `await`
  - `sql\`${countdownEvents.id} = ${id}\`` -> `eq(countdownEvents.id, id)` (proper Drizzle operator)
  - `sql\`(datetime('now'))\`` -> `sql\`now()\`` (Postgres syntax)
  - `eq` added to imports

- [ ] **Step 3: Commit**
  ```
  git add apps/api/src/services/countdown-events.ts
  git commit -m "feat: convert countdown-events service to async for postgres"
  git push
  ```

---

### Task 11: Update tRPC context type

**Files:**
- Modify: `apps/api/src/trpc/context.ts`

- [ ] **Step 1: Replace BunSQLiteDatabase with NodePgDatabase**

  Replace the entire contents of `apps/api/src/trpc/context.ts` with:
  ```ts
  import type { NodePgDatabase } from "drizzle-orm/node-postgres";

  import { db } from "../db/client";
  import type * as schema from "../db/schema";

  export interface Context {
    db: NodePgDatabase<typeof schema>;
  }

  export function createContext(): Context {
    return { db };
  }
  ```

- [ ] **Step 2: Run typecheck to verify no type errors**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && bun run typecheck`
  Expected: passes with 0 errors

- [ ] **Step 3: Commit**
  ```
  git add apps/api/src/trpc/context.ts
  git commit -m "feat: update tRPC context type from BunSQLiteDatabase to NodePgDatabase"
  git push
  ```

---

### Task 12: Fix seed script for async

**Files:**
- Modify: `apps/api/src/db/seed-countdown-events.ts`

- [ ] **Step 1: Convert seed script to async**

  Replace the entire contents of `apps/api/src/db/seed-countdown-events.ts` with:
  ```ts
  import { db } from "./client";
  import { countdownEvents } from "./schema";

  const EVENTS = [
    // Upcoming
    { title: "Coachella W2", date: "2026-04-16" },
    { title: "SF - SoFi Codathon", date: "2026-04-26" },
    { title: "Disco Lines", date: "2026-05-02" },
    { title: "SF - Temporal Replay", date: "2026-05-04" },
    { title: "5 Year Anniversary Of Green Card", date: "2026-05-06" },
    { title: "EDC", date: "2026-05-14" },
    { title: "LIB", date: "2026-05-21" },
    { title: "Gorgon City", date: "2026-05-30" },
    { title: "Chris Lake Day 1 & 2", date: "2026-06-19" },
    { title: "DayTrip", date: "2026-06-27" },
    { title: "Beltran Day 1 & 2", date: "2026-07-11" },
    { title: "Hard Summer", date: "2026-08-01" },
    { title: "Head Trip", date: "2026-10-10" },
    { title: "My Birthday", date: "2026-11-02" },
    { title: "EDC Sea", date: "2027-01-26" },
    // Past
    { title: "Beyond 26", date: "2026-03-27" },
    { title: "CRSSD", date: "2026-03-14" },
    { title: "Skyline", date: "2026-02-28" },
    { title: "Eligible for Naturalization", date: "2026-02-08" },
    { title: "Mochakk + Beltran Hollywood Take...", date: "2025-12-13" },
    { title: "Matroda: DTLA", date: "2025-12-05" },
    { title: "Biscits - Gudfella", date: "2025-11-07" },
    { title: "Escape 25", date: "2025-10-31" },
    { title: "Worship: Red Rocks", date: "2025-10-30" },
    { title: "Martin Garrix", date: "2025-10-23" },
    { title: "Mau P", date: "2025-10-10" },
    { title: "Sidepiece - San Diego", date: "2025-10-04" },
    { title: "CRSSD San Diego", date: "2025-09-27" },
    { title: "Nocturnal Wonderland", date: "2025-09-13" },
    { title: "Chris Lake: Red Rocks", date: "2025-08-30" },
    { title: "Sidepiece: Day Trip", date: "2025-08-16" },
    { title: "Chris Lake: San Diego", date: "2025-08-02" },
    { title: "Lost In Dreams 25", date: "2025-07-11" },
    { title: "Martin Garrix", date: "2025-06-27" },
    { title: "EDCLV 25", date: "2025-05-16" },
    { title: "Shaun in LA", date: "2025-05-10" },
    { title: "Coachella 25", date: "2025-04-18" },
    { title: "Armin Van Buuren 25", date: "2025-04-04" },
    { title: "Beyond Wonderland 25", date: "2025-03-28" },
    { title: "NoFap", date: "2025-03-23" },
    { title: "Rezz Cow Palace 25", date: "2025-03-01" },
    { title: "John Summit Vail 25", date: "2025-02-15" },
    { title: "Aeon:MODE LA 25", date: "2025-02-07" },
    { title: "Chyl 25", date: "2025-01-25" },
  ];

  console.log(`Seeding ${EVENTS.length} countdown events...`);
  await db.insert(countdownEvents).values(EVENTS);
  console.log(`Seeded ${EVENTS.length} countdown events`);
  ```

  Key change: `.run()` removed, `await` added (Bun supports top-level await in `.ts` files run with `bun`).

- [ ] **Step 2: Commit**
  ```
  git add apps/api/src/db/seed-countdown-events.ts
  git commit -m "fix: make seed script async for postgres driver"
  git push
  ```

---

### Task 13: Rewrite tests for Postgres

**Files:**
- Modify: `apps/api/src/__tests__/global-setup.ts`
- Modify: `apps/api/src/__tests__/countdown-events.test.ts`

Prerequisites: Postgres must be running (Task 2 completed). Run `docker-compose up -d postgres` if not already running.

Also need to create test DB. Run:
```bash
docker exec -i $(docker ps -qf name=postgres) psql -U workflow -d workflow_engine -c "CREATE DATABASE workflow_engine_test;" 2>/dev/null || true
```

- [ ] **Step 1: Update global-setup.ts**

  Replace the entire contents of `apps/api/src/__tests__/global-setup.ts` with:
  ```ts
  export function setup() {
    process.env.HA_TOKEN = process.env.HA_TOKEN ?? "test-token";
    process.env.HA_URL = process.env.HA_URL ?? "http://homeassistant.local:8123";
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgresql://workflow:workflow@localhost:5432/workflow_engine_test";
    process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  }
  ```

- [ ] **Step 2: Run test to verify FAIL state**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && bun run test`
  Expected: FAIL — tests still use `better-sqlite3` which is removed. This confirms the test rewrite is needed.

- [ ] **Step 3: Rewrite countdown-events.test.ts**

  Replace the entire contents of `apps/api/src/__tests__/countdown-events.test.ts` with:
  ```ts
  import { Pool } from "pg";
  import { drizzle } from "drizzle-orm/node-postgres";
  import { migrate } from "drizzle-orm/node-postgres/migrator";
  import { resolve } from "node:path";
  import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
        migrationsFolder: resolve(import.meta.dir, "../db/migrations"),
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
        migrationsFolder: resolve(import.meta.dir, "../db/migrations"),
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
        migrationsFolder: resolve(import.meta.dir, "../db/migrations"),
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
      const { runMigrations } = await import("../db/migrate");
      await expect(runMigrations()).resolves.not.toThrow();
      await expect(runMigrations()).resolves.not.toThrow();
    });
  });
  ```

- [ ] **Step 4: Run tests to verify PASS**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && bun run test`
  Expected: all tests pass, 0 failures

- [ ] **Step 5: Commit**
  ```
  git add apps/api/src/__tests__/global-setup.ts apps/api/src/__tests__/countdown-events.test.ts
  git commit -m "test: rewrite countdown-events tests for postgres with real pg instance"
  git push
  ```

---

### Task 14: Clean up vitest.config.ts

**Files:**
- Modify: `apps/api/vitest.config.ts`

- [ ] **Step 1: Remove bun:sqlite alias**

  Replace the entire contents of `apps/api/vitest.config.ts` with:
  ```ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      globals: true,
      environment: "node",
      globalSetup: ["./src/__tests__/global-setup.ts"],
      setupFiles: ["./src/__tests__/setup.ts"],
    },
  });
  ```

  The `resolve.alias` block that mapped `bun:sqlite` to the mock file is removed entirely.

- [ ] **Step 2: Commit**
  ```
  git add apps/api/vitest.config.ts
  git commit -m "chore: remove bun:sqlite alias from vitest config"
  git push
  ```

---

### Task 15: Delete obsolete mock file

**Files:**
- Delete: `apps/api/src/__mocks__/bun-sqlite.ts`

- [ ] **Step 1: Delete the mock**
  Run: `rm /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api/src/__mocks__/bun-sqlite.ts`

- [ ] **Step 2: Verify tests still pass**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && bun run test`
  Expected: all tests pass

- [ ] **Step 3: Commit**
  ```
  git add -A apps/api/src/__mocks__/
  git commit -m "chore: delete bun-sqlite mock (no longer needed)"
  git push
  ```

---

### Task 16: Update import boundary checker

**Files:**
- Modify: `scripts/check-boundaries.ts`

- [ ] **Step 1: Replace bun:sqlite with pg in db/ allowed list**

  In `scripts/check-boundaries.ts`, find the `db/` rule (lines 24-33) and change:
  ```ts
  allowed: [
    /^drizzle-orm/,
    /^bun:sqlite/,
    /^@repo\/shared/,
    /^\./, // relative imports within db/
  ],
  ```
  to:
  ```ts
  allowed: [
    /^drizzle-orm/,
    /^pg$/,
    /^@repo\/shared/,
    /^\./, // relative imports within db/
  ],
  ```

  Also update the comment on line 6 from `bun:sqlite` to `pg`:
  ```ts
  // - db/        → only drizzle-orm, pg, @repo/shared
  ```

- [ ] **Step 2: Run boundary check**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && bun run check:boundaries`
  Expected: `Import boundaries: OK`

- [ ] **Step 3: Commit**
  ```
  git add scripts/check-boundaries.ts
  git commit -m "chore: update import boundary to allow pg in db/ layer"
  git push
  ```

---

### Task 17: Update Kamal deploy config

**Files:**
- Modify: `config/deploy.yml`

- [ ] **Step 1: Add postgres accessory and update env secrets**

  In `config/deploy.yml`:

  a) Add `DATABASE_URL` and `POSTGRES_PASSWORD` to the `env.secret` list:
  ```yaml
  env:
    clear:
      NODE_ENV: production
      PORT: "4301"
      PORT_OFFSET: "0"
      INNGEST_DEV: "0"
      HA_URL: "http://host.docker.internal:8123"
    secret:
      - INNGEST_EVENT_KEY
      - INNGEST_SIGNING_KEY
      - HA_TOKEN
      - DATABASE_URL
      - POSTGRES_PASSWORD
  ```

  b) Add `postgres` accessory (before the `inngest` accessory):
  ```yaml
  accessories:
    postgres:
      image: postgres:16-alpine
      host: homelab
      port: "5432:5432"
      env:
        secret:
          - POSTGRES_PASSWORD
        clear:
          POSTGRES_USER: workflow
          POSTGRES_DB: workflow_engine
      directories:
        - postgres-data:/var/lib/postgresql/data
  ```

  c) Remove the SQLite data volume from the `volumes` key at the bottom:
  ```yaml
  # Remove this entire block:
  volumes:
    - data:/app/data
  ```

  Note: No `restart` policy on the postgres accessory (Kamal 2.11 constraint — see memory reference).

- [ ] **Step 2: Verify YAML is valid**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && ruby -e "require 'yaml'; YAML.load_file('config/deploy.yml'); puts 'OK'"`
  Expected: `OK`

- [ ] **Step 3: Commit**
  ```
  git add config/deploy.yml
  git commit -m "feat: add postgres kamal accessory and remove sqlite volume"
  git push
  ```

---

### Task 18: Update CI workflows

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Update ci.yml — add Postgres service and DATABASE_URL**

  In `.github/workflows/ci.yml`, replace the `check` job definition. Add a `services` block and `DATABASE_URL` env to the job. The updated `check` job:
  ```yaml
  jobs:
    check:
      name: Lint, Typecheck, Test
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16-alpine
          env:
            POSTGRES_USER: workflow
            POSTGRES_PASSWORD: workflow
            POSTGRES_DB: workflow_engine_test
          ports:
            - 5432:5432
          options: >-
            --health-cmd pg_isready
            --health-interval 5s
            --health-timeout 5s
            --health-retries 10
      env:
        DATABASE_URL: postgresql://workflow:workflow@localhost:5432/workflow_engine_test
      steps:
        - uses: actions/checkout@v6

        - uses: oven-sh/setup-bun@v2

        - run: bun install --frozen-lockfile

        - name: Biome CI
          run: bunx biome ci .

        - name: Typecheck
          run: bun run typecheck

        - name: Test
          run: bun run test

        - name: Check import boundaries
          run: bun run check:boundaries
  ```

- [ ] **Step 2: Update deploy.yml — add Postgres service to check job**

  In `.github/workflows/deploy.yml`, the `check` job (starting at line 117) needs the same additions. Add `services` and `env` blocks to the `check` job, after `runs-on: ubuntu-latest` and before `needs: notify-start`:
  ```yaml
  check:
    name: Lint, Typecheck, Test
    runs-on: ubuntu-latest
    needs: notify-start
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: workflow
          POSTGRES_PASSWORD: workflow
          POSTGRES_DB: workflow_engine_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://workflow:workflow@localhost:5432/workflow_engine_test
    outputs:
      duration: ${{ steps.duration.outputs.text }}
    steps:
      # ... rest of steps unchanged
  ```

  Also add `DATABASE_URL` and `POSTGRES_PASSWORD` to the `Deploy with Kamal` step's `env` block (the step that runs `kamal deploy`):
  ```yaml
  - name: Deploy with Kamal
    env:
      KAMAL_REGISTRY_PASSWORD: ${{ secrets.GHRC_TOKEN }}
      INNGEST_EVENT_KEY: ${{ secrets.INNGEST_EVENT_KEY }}
      INNGEST_SIGNING_KEY: ${{ secrets.INNGEST_SIGNING_KEY }}
      HA_TOKEN: ${{ secrets.HA_TOKEN }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
    run: kamal deploy
  ```

- [ ] **Step 3: Commit**
  ```
  git add .github/workflows/ci.yml .github/workflows/deploy.yml
  git commit -m "ci: add postgres service container to check jobs"
  git push
  ```

---

### Task 19: Full verification

- [ ] **Step 1: Run full typecheck**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && bun install && bun run typecheck`
  Expected: 0 errors

- [ ] **Step 2: Run all tests**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && bun run test`
  Expected: all tests pass, 0 failures

- [ ] **Step 3: Run boundary check**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres && bun run check:boundaries`
  Expected: `Import boundaries: OK`

- [ ] **Step 4: Verify no SQLite references remain**
  Run: `grep -r "bun:sqlite\|better-sqlite3\|bun-sqlite\|drizzle-orm/bun-sqlite\|datetime('now')" /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api/src/`
  Expected: no output (0 matches)

- [ ] **Step 5: Apply migrations to local dev DB**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine bun run db:migrate`
  Expected: exits 0, no errors

- [ ] **Step 6: Verify tables exist in Postgres**
  Run: `docker exec -i $(docker ps -qf name=postgres) psql -U workflow -d workflow_engine -c "\dt"`
  Expected: lists `countdown_events` and `system_info`

- [ ] **Step 7: Run seed**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine bun run db:seed`
  Expected: prints `Seeded 44 countdown events`

- [ ] **Step 8: Start API server and verify**
  Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/feat/sqlite-to-postgres/apps/api && DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine HA_TOKEN=test bun run dev &`
  Wait 2 seconds then run: `curl -s http://localhost:4201/up`
  Expected: `OK`

- [ ] **Step 9: Query via tRPC**
  Run: `curl -s "http://localhost:4201/trpc/countdownEvents.listUpcoming" | jq '.result.data | length'`
  Expected: number > 0

- [ ] **Step 10: Create an event via tRPC**
  Run:
  ```bash
  curl -s -X POST "http://localhost:4201/trpc/countdownEvents.create" \
    -H "Content-Type: application/json" \
    -d '{"json":{"title":"E2E Test","date":"2099-01-01"}}' | jq '.result.data.id'
  ```
  Expected: prints a number (the new event id)

- [ ] **Step 11: Stop background API server**
  Run: `kill %1` or `pkill -f "bun run dev"`

---

## Self-Review Checklist

- [x] **Spec coverage**: All 19 file-level changes from spec's file structure table have tasks
- [x] **No placeholders**: All code is complete and exact
- [x] **Type consistency**: `NodePgDatabase<typeof schema>` used consistently in client, context, service
- [x] **TDD compliance**: Task 13 (tests) includes explicit fail-before-pass steps
- [x] **Dependency order**: docker-compose (T2) -> schema (T3) -> drizzle config (T4) -> generate migration (T5) -> client rewrite (T6) -> migrate.ts (T7) -> env (T8) -> server (T9) -> service (T10) -> context (T11) -> seed (T12) -> tests (T13) -> cleanup (T14-T16) -> infra (T17-T18) -> verification (T19)
- [x] **All functions async**: `createCountdownEvent`, `listUpcomingCountdownEvents`, `listPastCountdownEvents`, `getCountdownEventById`, `updateCountdownEvent`, `removeCountdownEvent` all converted
- [x] **Graceful shutdown**: `pool.end()` called on SIGTERM/SIGINT in server.ts
- [x] **Test DB created**: Task 13 includes `CREATE DATABASE workflow_engine_test` step
- [x] **Migration idempotency**: Tested in router describe block (runMigrations called twice)
