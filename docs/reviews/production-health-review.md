# Production Health Review

**Date:** 2026-04-12
**Scope:** Postgres setup, migration pipeline, schema health, backups, health checks, logging/monitoring

---

## 1. Migration Pipeline

**Status: Automated via server startup — gap exists for failed-mid-deploy scenarios.**

Migrations run in `apps/api/src/server.ts` at the top level with `await runMigrations()` before the HTTP server starts. This means every `kamal deploy` automatically runs pending Drizzle migrations on startup.

**What works:**
- `runMigrations()` uses `drizzle-orm/node-postgres/migrator` pointing at `apps/api/src/db/migrations/`
- Migrations are idempotent (Drizzle tracks applied migrations in `__drizzle_migrations` table)
- Deploy pipeline has no separate migration step — it relies on server startup

**Gaps:**
- No pre-deploy migration check. If a migration fails, the container exits and Kamal rolls back the image, but the database may be left in a partially applied state (only matters for multi-statement migrations with no transaction wrapping)
- The single migration file (`0000_glossy_earthquake.sql`) uses `statement-breakpoint` comments — Drizzle does NOT wrap these in a transaction by default, so a crash mid-migration is a real risk
- No CI step verifies migrations apply cleanly against the production schema (CI runs against a fresh test DB, not a snapshot of prod)
- No migration dry-run or schema diff in the deploy pipeline

**Recommendation:** Wrap migration SQL in explicit transactions, or add a `bin/migrate` script that can be run as a Kamal boot hook (via `boot.pre_connect` or an init container pattern) so migrations run before traffic is served.

---

## 2. Postgres Configuration

**Status: Minimal — works for current load, several prod-hardening gaps.**

`apps/api/src/db/client.ts`:
```ts
export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

The `Pool` constructor is called with no options beyond the connection string. This means:
- Default `max` connections: 10 (pg default)
- No `idleTimeoutMillis` or `connectionTimeoutMillis` configured
- No explicit `ssl` config (relies on DATABASE_URL having `?sslmode=...` or none)

**What works:**
- `pool.end()` is called on SIGTERM/SIGINT in `server.ts` — graceful shutdown is handled
- Drizzle is initialized with schema for type-safe queries

**Gaps:**
- No connection timeout. If Postgres is briefly unavailable at startup, the server will hang indefinitely waiting for a pool connection rather than failing fast
- No pool size tuning — for a single-instance always-on iPad panel, 10 connections is fine, but it's implicit not explicit
- No SSL enforcement. The DATABASE_URL in prod (`op://Homelab/...`) should include SSL params if Postgres is exposed beyond localhost — currently Postgres runs on the same host (homelab) so this is low risk, but it's unverified
- The Postgres accessory in `config/deploy.yml` binds port `5432:5432` on the host. If the host firewall isn't blocking 5432, Postgres is reachable from the local network without auth (only password auth, but still exposed)

---

## 3. Database Schema Health

**Status: Simple and clean for current feature set, but missing indexes and schema conventions.**

Current tables (`apps/api/src/db/schema.ts`):
- `system_info` — key/value store, `key` has UNIQUE constraint (good)
- `countdown_events` — title, date (stored as `text`, not `timestamp`/`date`), created_at, updated_at

**Issues:**
- `countdown_events.date` is `text` not `timestamp`. This makes date ordering, range queries, and timezone handling all manual and error-prone. Should be `date` or `timestamp with time zone`
- No indexes beyond the implicit primary key and the unique constraint on `system_info.key`
- `countdown_events` has no index on `date`, which would be needed for "upcoming events" queries as the table grows
- `updated_at` has `defaultNow()` but no trigger or application-level update to keep it current on UPDATE — it will only reflect the insert time unless the application manually sets it
- Only one migration so far (`0000_glossy_earthquake.sql`) — schema is in early state, no technical debt yet

---

## 4. Backup Strategy

**Status: None. Issue #119 is open and nothing has been implemented.**

No `pg_dump` scripts, no cron jobs, no Kamal backup config, no scheduled Inngest functions for backup. The Postgres data lives in a named Docker volume (`postgres-data`) on the homelab Mac Mini.

Risk: a failed Docker volume, accidental `kamal accessory reboot postgres`, or `rm -rf /var/lib/docker/volumes/postgres-data` would destroy all data with no recovery path.

For current data (countdown events + system_info key/value) the loss impact is low — data can be re-seeded. But as features grow (notifications, scenes, config) this becomes more critical.

**Minimum viable backup:** A daily `pg_dump` via a cron job on homelab, or an Inngest cron function that dumps to a local file and optionally pushes to cloud storage.

---

## 5. Health Check

**Status: Kamal healthcheck is configured and working.**

`config/deploy.yml`:
```yaml
proxy:
  healthcheck:
    path: /up
    interval: 3
    timeout: 5
```

`apps/api/src/server.ts` handles `GET /up` with `200 OK` before any route logic. This is correct and sufficient for Kamal's deploy healthcheck.

**Gap:** The `/up` endpoint only checks that the server process is alive — it does not verify database connectivity. A deploy where the server boots but Postgres is unreachable would pass the healthcheck but fail at runtime.

A deeper healthcheck at `/health` (or enriched `/up`) that runs `SELECT 1` would catch this. The current behavior means a DB connection failure could go undetected until the first real request hits.

---

## 6. Logging & Monitoring

**Status: Stack deployed (Loki + Alloy + Grafana), no dashboards or alerts configured.**

The full Grafana/Loki/Alloy stack is present in `infra/logging/` and deployed as Kamal accessories:
- **Alloy** scrapes Docker container logs via the Docker socket and ships to Loki
- **Loki** stores logs with 30-day retention, filesystem backend, volume-persisted
- **Grafana** is accessible on homelab:3000, anonymous viewer access enabled, Loki datasource pre-configured

**What works:**
- All container logs (including the API) are automatically captured
- Log retention is configured (30 days)
- Grafana is set up and the Loki datasource is wired

**Gaps:**
- No dashboards committed — Grafana data is in a Docker volume, so any configured dashboards live only on the host
- Grafana anonymous access is `Viewer` role only, which is fine for a home network, but there's no auth at all
- No alerting configured (no alert rules, no notification channels)
- Alloy connects to Loki via container name `workflow-engine-loki:3100` — this relies on Kamal's container naming convention; worth verifying this resolves correctly (Kamal names accessories as `<service>-<accessory>` by default)
- No Postgres-specific metrics (pg_stat, connection count, slow queries) — only container stdout logs

---

## Summary: Issues by Priority

**High (production risk):**
1. No database backup strategy — issue #119 open, zero implementation
2. `/up` healthcheck does not verify database connectivity — silent DB failures possible
3. `countdown_events.date` stored as `text` — data integrity and query correctness risk

**Medium (operational gaps):**
4. No connection timeout on the Postgres pool — server can hang on DB unavailability at startup
5. Postgres port 5432 bound to host network — firewall exposure unverified
6. No pre-deploy migration validation against prod schema
7. No Grafana dashboards committed to code (only in volume, not reproducible)

**Low (nice-to-have):**
8. Pool size is implicit (pg default 10) — should be explicit in config
9. `updated_at` won't self-update without application-level logic
10. No index on `countdown_events.date` for future query performance
