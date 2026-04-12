# SQLite to PostgreSQL Migration - Alignment

## What We're Building

Migrate the workflow engine's database from SQLite (bun:sqlite) to PostgreSQL, and wire up automated Drizzle migrations. Closes GitHub issue #83.

## Approved Approach

1. **PostgreSQL in production**: Kamal accessory (Docker container on Mac Mini), persistent volume
2. **PostgreSQL locally**: Docker container in docker-compose.yml alongside Inngest
3. **Driver**: `node-postgres` (pg) via `drizzle-orm/node-postgres`
4. **Data migration**: Fresh start. No data transfer from existing SQLite. Re-seed with `db:seed`
5. **Migration automation**: Drizzle `migrate()` runs at server startup. Remove inline `CREATE TABLE IF NOT EXISTS` DDL from `client.ts`
6. **Tests**: Real Postgres in Docker (docker-compose for local, GitHub Actions service container for CI)

## Key Decisions (User-Approved)

- Kamal accessory over managed DB or serverless Postgres
- node-postgres (pg) over postgres.js or Neon driver
- Fresh start over data migration script or pgloader
- Real Postgres in tests over keeping SQLite test DB

## Scope

### IN

- Switch Drizzle schema from SQLite dialect (`drizzle-orm/sqlite-core`) to Postgres dialect (`drizzle-orm/pg-core`)
- New `client.ts` using `node-postgres` Pool + drizzle
- Postgres service in `docker-compose.yml` for local dev
- Postgres as Kamal accessory in `config/deploy.yml` for prod
- Fresh Drizzle PG migrations generated from schema, run on server startup via `migrate()`
- Update `env.ts` — `DATABASE_URL` becomes a postgres connection string (e.g., `postgresql://user:pass@host:5432/db`)
- Update `drizzle.config.ts` — dialect postgres, connection string
- Update test setup to use Dockerized Postgres (real DB, not in-memory SQLite)
- Update CI (GitHub Actions) to have Postgres service container
- Update `package.json` — add `pg` dependency, remove `better-sqlite3` dev dep, update drizzle adapter imports
- Postgres credentials in 1Password (`op://Homelab/...`) for prod

### OUT

- Data migration from existing SQLite
- Schema changes beyond Postgres compat (no new tables/columns)
- Connection pooling beyond pg's built-in Pool (no PgBouncer)
- Structured logging changes
- Any frontend changes

## Constraints

- Must work with Bun runtime (node-postgres works with Bun)
- Kamal accessories don't support restart policies in 2.11 (known issue, see PR #112)
- Existing logging stack (Alloy) will auto-discover Postgres container via Docker socket
- `GHRC_TOKEN` naming is intentional, never rename
- All services use port isolation via `PORT_OFFSET` env var
