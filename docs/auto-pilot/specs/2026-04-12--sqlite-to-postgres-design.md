# SQLite to PostgreSQL Migration Design Spec

## Overview

Migrate the workflow engine's backend database from SQLite (bun:sqlite + better-sqlite3) to PostgreSQL using the `node-postgres` (pg) driver via `drizzle-orm/node-postgres`. PostgreSQL runs as a Docker container locally (docker-compose) and as a Kamal accessory in production on the Mac Mini. Drizzle migrations replace the inline `CREATE TABLE IF NOT EXISTS` DDL currently in `client.ts` and run automatically on server startup. Tests switch from in-memory better-sqlite3 to a real Postgres instance. Closes issue #83.

---

## Assumptions

Decisions made autonomously (not explicitly specified in alignment doc):

- **Postgres image**: `postgres:16-alpine` — current stable LTS, slim image, arm64 compatible.
- **Local postgres port**: `5432` (host-side), mapped to `5432` inside container. Uses `PORT_OFFSET` for test isolation (see test section).
- **Database name**: `workflow_engine` for local dev and prod. Test DB: `workflow_engine_test`.
- **Default credentials** (local dev only, non-secret): user `workflow`, password `workflow`, db `workflow_engine`. These go in docker-compose.yml as plain env vars (not secrets). Prod uses 1Password secrets.
- **Drizzle migrations folder**: keep existing path `src/db/migrations/`. Old SQLite migration file (`0001_add_countdown_events.sql`) is deleted; new PG migrations are generated fresh.
- **`migrate()` call placement**: at the top of `server.ts` before `ha.init()`, so the DB is ready before any other startup work.
- **Service function async**: The countdown-events service currently uses synchronous Drizzle (`.get()`, `.all()`, `.run()`). With node-postgres, all calls become async (Promises). Service functions become `async` and return Promises. The `DB` type alias changes from `BaseSQLiteDatabase` to `NodePgDatabase`.
- **`updatedAt` default**: SQLite used `datetime('now')`. Postgres equivalent is `now()` — using Drizzle's `defaultNow()` on the column and `sql\`now()\`` in update set.
- **`createdAt`/`updatedAt` column type**: Switch from `text` to `timestamp` (Drizzle `timestamp()`) with `defaultNow()`. The column still stores datetime but as a proper Postgres type. The field shape in TypeScript changes from `string` to `Date`.
- **Seed script**: `db.insert(...).values(...).run()` is synchronous in SQLite. With PG it must be `await db.insert(...).values(...)`; the script becomes async.
- **Test DB lifecycle**: Each test file uses `beforeAll` to run migrations, `afterAll` to drop all tables and close the pool. No per-test DB recreation (too slow with Postgres). Instead, each `beforeEach` truncates all tables using `TRUNCATE ... RESTART IDENTITY CASCADE`.
- **`DATABASE_URL` env var format**: For tests, `DATABASE_URL` defaults to `postgresql://workflow:workflow@localhost:5432/workflow_engine_test` when `NODE_ENV=test` and not explicitly set. Test global-setup sets this.
- **Kamal volume name for postgres data**: `postgres-data`.
- **Postgres container name in Kamal**: `postgres` (becomes `workflow-engine-postgres` with Kamal prefix).
- **`pg` package**: added to `dependencies` (runtime, not devDependencies) in `apps/api/package.json`.
- **`@types/pg`**: added to `devDependencies`.
- **Import boundary update for `db/`**: `bun:sqlite` is removed from the allowed list; `pg` (the node-postgres package) is not directly imported in `db/` (it's abstracted by Drizzle), so no boundary change needed. The boundary checker's `bun:sqlite` allowlist entry can be removed.

---

## Architecture

### Components and Data Flow

```
server.ts
  -> runMigrations() [new helper in db/client.ts or db/migrate.ts]
       -> drizzle migrate() with node-postgres Pool
  -> ha.init()
  -> Bun.serve(...)
       -> tRPC -> context -> db (NodePgDatabase)
                          -> service functions (now async)
```

**Database client (`db/client.ts`)**:
- Creates a `pg.Pool` using `env.DATABASE_URL`
- Creates a `drizzle(pool, { schema })` instance (NodePgDatabase)
- Exports `db` and `pool` (pool exported so server.ts can gracefully close it on shutdown)
- Does NOT call `migrate()` — that happens at server startup to keep client.ts a pure setup module

**Migration runner (`db/migrate.ts`)** (new file):
- Imports `migrate` from `drizzle-orm/node-postgres/migrator`
- Imports `db` from `./client`
- Exports `async function runMigrations()` that calls `migrate(db, { migrationsFolder: ... })`
- `server.ts` calls `await runMigrations()` before any other startup

**Schema (`db/schema.ts`)**:
- Switches from `drizzle-orm/sqlite-core` to `drizzle-orm/pg-core`
- `sqliteTable` -> `pgTable`
- `int` -> `serial` (for autoincrement PKs)
- `text` timestamps -> `timestamp` with `defaultNow()`
- SQLite-specific `sql\`(datetime('now'))\`` defaults are replaced with `defaultNow()`

**Drizzle config (`drizzle.config.ts`)**:
- `dialect: "postgresql"`
- `dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://workflow:workflow@localhost:5432/workflow_engine" }`

**Service layer (`services/countdown-events.ts`)**:
- `DB` type changes from `BaseSQLiteDatabase<any, any, any>` to `NodePgDatabase<typeof schema>`
- All functions become `async` and return Promises
- `.get()` -> `.then(r => r[0])` or direct `await` + index access (Drizzle PG returns arrays)
- `.all()` -> direct array result from `await`
- `.run()` -> `await`
- `sql\`(datetime('now'))\`` in update set -> `sql\`now()\``
- `getCountdownEventById` uses `eq(countdownEvents.id, id)` instead of `sql\`${countdownEvents.id} = ${id}\``

**tRPC context (`trpc/context.ts`)**:
- `BunSQLiteDatabase` type replaced with `NodePgDatabase<typeof schema>`

**Tests (`__tests__/countdown-events.test.ts`)**:
- Remove `better-sqlite3` and `drizzle/better-sqlite3` imports
- Import `pg.Pool` and `drizzle` from `drizzle-orm/node-postgres`
- `createTestDb()` creates a `pg.Pool` pointed at test DB, runs migrations, returns `NodePgDatabase`
- All test assertions become `async/await`
- `beforeEach` truncates tables: `TRUNCATE countdown_events RESTART IDENTITY CASCADE`
- `afterAll` (per-describe) closes pool

**`vitest.config.ts`**:
- Remove the `bun:sqlite` alias (no longer needed)
- Keep `globalSetup` and `setupFiles`

**`__tests__/global-setup.ts`**:
- Set `DATABASE_URL` to test connection string if not already set
- Set `NODE_ENV=test` if not set
- Keep existing `HA_TOKEN` and `HA_URL` defaults (currently in `setup.ts`, not global-setup)

**`__mocks__/bun-sqlite.ts`**:
- Delete this file (no longer needed)

---

## Implementation Details

### Schema Changes

```ts
// Before (sqlite-core)
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const countdownEvents = sqliteTable("countdown_events", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  date: text().notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// After (pg-core)
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

### client.ts

```ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env";
import * as schema from "./schema";

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### migrate.ts (new)

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

### server.ts changes

Add at the top of the startup sequence:

```ts
import { runMigrations } from "./db/migrate";
// ...
await runMigrations();
await ha.init();
// rest of server setup unchanged
```

### env.ts changes

Change `DATABASE_URL` default from a file path to a Postgres URL:

```ts
DATABASE_URL: z.string().url().default("postgresql://workflow:workflow@localhost:5432/workflow_engine"),
```

### Service layer: async signatures

```ts
// Before
export function createCountdownEvent(db: DB, input: CountdownEventInput) {
  return db.insert(countdownEvents).values(...).returning().get();
}

// After
export async function createCountdownEvent(db: DB, input: CountdownEventInput) {
  const rows = await db.insert(countdownEvents).values(...).returning();
  return rows[0];
}
```

Key difference: Drizzle PG `.returning()` returns an array; SQLite `.returning().get()` returned a single row. All callers (routers) pass `await` to the service, but since routers already `return` service calls inside tRPC procedure handlers and tRPC handles Promises, no router changes are needed beyond the service becoming async.

The `updateCountdownEvent` function replaces the SQLite `sql\`(datetime('now'))\`` with `sql\`now()\``:

```ts
updatedAt: sql`now()`,
```

### docker-compose.yml additions

```yaml
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

The API process (run by Tilt outside Docker) connects to `localhost:5432`. No `extra_hosts` needed since it's not inside Docker.

### Kamal config (config/deploy.yml)

Add `postgres` accessory (no restart policy per known Kamal 2.11 constraint):

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

Add `DATABASE_URL` to the main service env secrets:

```yaml
env:
  secret:
    - INNGEST_EVENT_KEY
    - INNGEST_SIGNING_KEY
    - HA_TOKEN
    - DATABASE_URL
    - POSTGRES_PASSWORD
```

Remove the `volumes: - data:/app/data` entry (SQLite data volume, no longer needed).

### CI (.github/workflows/ci.yml and deploy.yml)

Both CI jobs that run tests (`check` job in both files) need a Postgres service container added:

```yaml
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
```

And add a `DATABASE_URL` env var to the test step (or job-level env):

```yaml
env:
  DATABASE_URL: postgresql://workflow:workflow@localhost:5432/workflow_engine_test
```

### Import boundary checker (scripts/check-boundaries.ts)

Remove `bun:sqlite` from the `db/` allowed list:

```ts
// Before
allowed: [/^drizzle-orm/, /^bun:sqlite/, /^@repo\/shared/, /^\./],

// After
allowed: [/^drizzle-orm/, /^pg$/, /^@repo\/shared/, /^\./],
```

Note: `pg` is imported in `client.ts` which lives in `db/`, so it must be in the allowed list.

### Package.json (apps/api)

Add to `dependencies`:
- `pg: "^8.13.0"`

Add to `devDependencies`:
- `@types/pg: "^8.11.0"`

Remove from `devDependencies`:
- `@types/better-sqlite3`
- `better-sqlite3`

Remove from root `package.json` `trustedDependencies`:
- `better-sqlite3`

---

## File Structure

| File | Action | What changes |
|------|--------|--------------|
| `apps/api/src/db/schema.ts` | Modify | sqlite-core -> pg-core, `int` -> `serial`, `text` timestamps -> `timestamp().defaultNow()` |
| `apps/api/src/db/client.ts` | Rewrite | `bun:sqlite`+`drizzle/bun-sqlite` -> `pg.Pool`+`drizzle/node-postgres`. Remove inline DDL. Export `pool` and `db`. |
| `apps/api/src/db/migrate.ts` | Create | `runMigrations()` using `drizzle-orm/node-postgres/migrator` |
| `apps/api/src/db/migrations/0001_add_countdown_events.sql` | Delete | SQLite DDL, replaced by new PG migration |
| `apps/api/src/db/migrations/0000_init.sql` | Created by drizzle-kit generate | PG DDL for both tables |
| `apps/api/src/env.ts` | Modify | `DATABASE_URL` default changes to postgres URL |
| `apps/api/src/server.ts` | Modify | Add `await runMigrations()` at startup |
| `apps/api/src/services/countdown-events.ts` | Modify | `DB` type -> `NodePgDatabase`, all functions async, `.get()`/`.all()`/`.run()` -> await patterns, `datetime('now')` -> `now()` |
| `apps/api/src/trpc/context.ts` | Modify | `BunSQLiteDatabase` -> `NodePgDatabase<typeof schema>` |
| `apps/api/src/__tests__/countdown-events.test.ts` | Rewrite | Remove better-sqlite3, use pg.Pool + real Postgres, async tests, TRUNCATE in beforeEach |
| `apps/api/src/__tests__/global-setup.ts` | Modify | Set `DATABASE_URL` env var for test DB |
| `apps/api/src/__mocks__/bun-sqlite.ts` | Delete | No longer needed |
| `apps/api/vitest.config.ts` | Modify | Remove `bun:sqlite` alias |
| `apps/api/drizzle.config.ts` | Modify | `dialect: "postgresql"`, connection string |
| `apps/api/package.json` | Modify | Add `pg`, `@types/pg`; remove `better-sqlite3`, `@types/better-sqlite3` |
| `docker-compose.yml` | Modify | Add `postgres` service and `postgres-data` volume |
| `config/deploy.yml` | Modify | Add `postgres` Kamal accessory, add `DATABASE_URL` and `POSTGRES_PASSWORD` secrets, remove SQLite data volume |
| `.github/workflows/ci.yml` | Modify | Add Postgres service container and `DATABASE_URL` env to check job |
| `.github/workflows/deploy.yml` | Modify | Add Postgres service container and `DATABASE_URL` env to check job |
| `scripts/check-boundaries.ts` | Modify | Replace `bun:sqlite` with `pg` in db/ allowed imports |
| `package.json` (root) | Modify | Remove `better-sqlite3` from `trustedDependencies` |

---

## Testing Strategy

### Unit / Integration Tests

**File: `apps/api/src/__tests__/countdown-events.test.ts`**

This test file hits a real Postgres instance. The test DB (`workflow_engine_test`) is created by the CI service container and must exist before tests run.

Test lifecycle:
1. `globalSetup` sets `DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine_test`
2. Each `describe` block gets a shared `Pool` + `NodePgDatabase`
3. `beforeAll` per describe: run `migrate()` against the test DB (idempotent)
4. `beforeEach`: `TRUNCATE countdown_events, system_info RESTART IDENTITY CASCADE`
5. `afterAll` per describe: `pool.end()`

All test assertions remain the same semantically, but use `await`. Example:

```ts
it("inserts and retrieves a countdown event", async () => {
  const rows = await db.insert(schema.countdownEvents).values(...).returning();
  expect(rows[0].id).toBe(1);
});
```

The countdown-events service and router tests follow the same pattern.

**Other test files** (`health.test.ts`, `devices.test.ts`, `ha-service.test.ts`, etc.) do not use the DB and require no changes.

### What to test

1. Schema insert/select round-trip (id is number, dates are Date objects, defaults are set)
2. `createCountdownEvent` — returns inserted row with auto-generated `id`
3. `listUpcomingCountdownEvents` — filters by today, orders ASC
4. `listPastCountdownEvents` — filters by today, orders DESC
5. `getCountdownEventById` — throws for unknown id
6. `updateCountdownEvent` — updates fields and `updatedAt`; throws for unknown id
7. `removeCountdownEvent` — deletes row; throws for unknown id
8. Router: create/list/getById/update/remove via tRPC caller with real PG db
9. Router: input validation (empty title, invalid date format)
10. `runMigrations()` — idempotent, runs twice without error

---

## E2E Verification Plan

### Prerequisites

- Docker running locally
- Postgres container started via `docker-compose up -d postgres`
- DB seeded via `bun run db:seed` from `apps/api/`

### Step 1: Start Postgres locally

```bash
cd /path/to/repo
docker-compose up -d postgres
# Wait for healthy
docker inspect --format='{{.State.Health.Status}}' $(docker ps -qf name=postgres)
# Expected: healthy
```

**PASS**: exits 0 and prints `healthy`
**FAIL**: prints `starting` or `unhealthy` after 30s

### Step 2: Run migrations

```bash
cd apps/api
DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine bun run db:migrate
```

**PASS**: exits 0, no errors
**FAIL**: any error output or non-zero exit

### Step 3: Verify tables exist

```bash
docker exec -i $(docker ps -qf name=postgres) psql -U workflow -d workflow_engine -c "\dt"
```

**PASS**: output lists `countdown_events` and `system_info`
**FAIL**: tables not listed

### Step 4: Run seed

```bash
cd apps/api
DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine bun run db:seed
```

**PASS**: prints `Seeded 44 countdown events`
**FAIL**: any error

### Step 5: Start API server

```bash
cd apps/api
DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine HA_TOKEN=test bun run dev
```

**PASS**: prints `API running on http://localhost:4201`
**FAIL**: any startup error, especially DB connection or migration errors

### Step 6: Health check

```bash
curl -s http://localhost:4201/up
```

**PASS**: responds `OK` with HTTP 200
**FAIL**: connection refused or non-200

### Step 7: Query countdown events via tRPC

```bash
curl -s "http://localhost:4201/trpc/countdownEvents.listUpcoming" | jq '.result.data | length'
```

**PASS**: prints a number > 0
**FAIL**: error response or 0 (seed not applied)

### Step 8: Create a countdown event

```bash
curl -s -X POST "http://localhost:4201/trpc/countdownEvents.create" \
  -H "Content-Type: application/json" \
  -d '{"json":{"title":"E2E Test","date":"2099-01-01"}}' | jq '.result.data.id'
```

**PASS**: prints a number (the new event id)
**FAIL**: error or null

### Step 9: Run full test suite

```bash
cd /path/to/repo
DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow_engine_test bun run test
```

**PASS**: all tests pass, 0 failures
**FAIL**: any test failure

### Step 10: Verify no SQLite references remain

```bash
grep -r "bun:sqlite\|better-sqlite3\|bun-sqlite\|drizzle-orm/bun-sqlite\|datetime('now')" apps/api/src/
```

**PASS**: no matches
**FAIL**: any match

---

## Error Handling

### Server startup

If `runMigrations()` throws (Postgres unreachable, migration SQL error), the error propagates out of `server.ts` and the Bun process exits with a non-zero code. This is intentional — the server must not start with an unmigrated DB. Kamal's healthcheck (`/up`, 3s interval, 5 retries) will detect the failed container and roll back.

### Connection failures at runtime

`pg.Pool` handles reconnection internally. Queries that fail due to connection errors throw `pg.DatabaseError`. These propagate through Drizzle and up through the service layer to tRPC, which catches them and returns a 500 INTERNAL_SERVER_ERROR to the client. No special error wrapping is needed.

### `getCountdownEventById` not found

Unchanged behavior: throws `new Error("Countdown event with id N not found")`. tRPC wraps this in a TRPCError with code INTERNAL_SERVER_ERROR. This is the existing pattern; no change.

### Migration idempotency

Drizzle migrations use a `drizzle_migrations` journal table to track applied migrations. Running `migrate()` twice is safe and is a no-op on the second run.

### Graceful shutdown

`server.ts` should call `await pool.end()` on process exit. Add a `process.on("SIGTERM")` and `process.on("SIGINT")` handler that calls `pool.end()` then exits. This prevents connection leaks during rolling deploys.

```ts
// In server.ts, after server starts:
const shutdown = async () => {
  await pool.end();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```
