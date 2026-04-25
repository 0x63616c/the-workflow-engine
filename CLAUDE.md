# CLAUDE.md

Guidance for Claude Code when working in this repository.

## CRITICAL: ALWAYS USE WORKTREES

Every session MUST use a git worktree before editing any files. Multiple Claude sessions run in parallel on this repo. Without worktrees, agents corrupt each other's work.

- Auto-enter worktree at session start. No asking.
- Base off `main` unless the task specifically requires another branch.
- If already in a worktree, skip. Otherwise create one before any edits.

### Worktree Naming

Format: `{type}/{description}` for both directory and branch.

```
Directory: .claude/worktrees/{type}/{description}
Branch:    {type}/{description}
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`. Description is kebab-case.

```bash
git worktree add .claude/worktrees/feat/slack-notifications -b feat/slack-notifications
```

Never use `.worktrees/`, `worktrees/`, `worktree-` prefix, or `+` separator.

---

# Evee

Wall-mounted iPad Pro smart home panel. Living art that controls home. Also the Slack bot of the same name.

## Tech Stack

### Frontend (apps/web)

- Vite, React 19, TypeScript
- TanStack Router (file-based, Vite plugin), TanStack Query via tRPC React bindings
- Zustand for client state
- Tailwind CSS v4, shadcn/ui (new-york style, neutral base)
- Three.js via `@react-three/fiber` + `@react-three/drei` (art clock)
- Framer Motion, `lucide-react`, Geist font
- Vitest + `@testing-library/react` (jsdom)
- Playwright E2E at iPad resolution

### Backend (apps/api)

- Bun runtime
- tRPC v11 (HTTP batch + SSE via `splitLink`)
- PostgreSQL via Drizzle ORM (node-postgres driver), DB name `evee`, role `evee`
- Zod env validation in `src/env.ts`. Never read `.env` directly.

### Native Shell

- Running as PWA on iPad (Capacitor wraps as native iOS shell for store distribution)
- Bundle ID: `co.worldwidewebb.theworkflowengine` (intentional, preserved for TestFlight continuity — never rename)
- iPad runs in MDM Single App Mode
- Presence detection via Home Assistant motion sensor

### Slack Bot (Evee)

- Workspace: World Wide Webb (worldwidewebbco.slack.com)
- Runtime: `@slack/bolt` in Socket Mode, Vercel AI SDK (`ai` + `@openrouter/ai-sdk-provider`)
- Model: `google/gemma-4-31b-it` via OpenRouter
- Code: `apps/api/src/integrations/slack/` (handler) + `apps/api/src/services/evee-conversation-service.ts` (agentic loop)
- Capabilities: thread context via `conversations.replies`, image support, tool calling
- Credentials in 1Password (`op://Homelab/...`)
- App manifest: `infra/evee/slack-manifest.yml`

### Infrastructure

- Home Assistant (device layer, REST API)
- Local dev: Tilt + docker-compose + local Bun processes
- Prod: Docker Compose on Mac Mini via Kamal, GHCR images
- CI: GitHub Actions (lint, typecheck, test, boundary check, Playwright)

## Ports

| Service | Port |
|---------|------|
| Web (Vite) | 4200 |
| API (tRPC) | 4201 |
| Postgres | 5432 |
| Home Assistant | 8123 |
| Alloy debug | 12345 |
| Alloy Faro | 12346 |
| Grafana | 3000 |
| Loki | 3100 |

Port isolation for parallel agents: set `PORT_OFFSET` env var. `Tiltfile` adds offset to all ports. API reads `PORT_OFFSET` and adds to base port via `EFFECTIVE_PORT`.

## Monorepo

```
apps/web/    # React PWA (iPad panel)
apps/api/    # Bun tRPC backend
scripts/     # All scripts go here. Never bin/ or elsewhere.
infra/       # Kamal accessory dirs (postgres, loki, alloy, grafana, evee)
docs/        # Architecture notes, screenshots
```

Bun workspaces in root `package.json`: `"workspaces": ["apps/*"]`.

## Local Development

Never run `tilt up` / `tilt down` directly. Parallel Claude sessions collide on ports.

```bash
scripts/run-dev    # Auto-picks isolated ports, writes .tilt-session, starts tilt in background
scripts/stop-dev   # Reads .tilt-session, runs tilt down, removes lockfile
```

When Claude starts the stack, call `scripts/run-dev` via the Bash tool with `run_in_background: true`. The script prints all port assignments on startup.

Tilt starts services in order: postgres (healthy) → api → web. Vite proxies `/trpc` to API (configured in `vite.config.ts`).

## Common Commands

```bash
bun run test              # All workspace tests
bun run lint              # Biome check
bun run lint:fix          # Biome check + fix (root handles everything via one config)
bun run typecheck         # Typecheck all workspaces
bun run check:boundaries  # Verify import boundary rules
bun run screenshots       # Playwright screenshots at iPad resolution
bun run test:e2e          # Playwright full suite
```

Single-test runs:

```bash
cd apps/api && bunx vitest run src/__tests__/services/ha-service.test.ts
cd apps/web && bunx vitest run src/__tests__/timer-card.test.tsx
```

Drizzle:

```bash
cd apps/api && bun run db:generate   # Generate migration from schema changes
cd apps/api && bun run db:migrate    # Apply migrations (API runs this on boot too)
cd apps/api && bun run db:studio     # Drizzle Studio UI
```

## Prod database access

```bash
pgcli "postgresql://evee:$(op read 'op://Homelab/Evee Postgres/password')@homelab:5432/evee"

scripts/drizzle-prod    # Drizzle Studio against prod
```

## Infrastructure & Gitops

Principle: infra state lives in the repo. Never edit prod by hand.

### Adding a new Postgres database

1. Create `infra/postgres/initdb/NN-<name>.sql` with `CREATE DATABASE <name> OWNER evee;`
2. Commit, push, merge.
3. On next deploy, `.kamal/hooks/post-deploy` checks prod PG and creates the DB if missing. Idempotent.

Fresh volumes (disaster recovery, new machine) bootstrap all DBs via the postgres image's `/docker-entrypoint-initdb.d/` mount (see `config/deploy.yml`).

Never run `psql -c "CREATE DATABASE ..."` against prod directly. The hook is the only entry point.

### Accessory reboot convention

Each Kamal accessory `<name>` in `config/deploy.yml` owns `infra/<name>/`. After `kamal deploy`, CI diffs `infra/<name>/` against the previous deploy and reboots only accessories whose dir changed. No per-accessory CI steps to maintain.

### Accessory `files:` pattern

Any accessory config that used to live as CLI flags or env vars can be mounted as a checked-in file via Kamal `files:` in `config/deploy.yml`. Prefer this over long flags.

### Kamal hooks (`.kamal/hooks/`)

- `post-deploy` — ensures all databases declared in `infra/postgres/initdb/*.sql` exist on prod PG.

### Schema migrations

Drizzle owns all app-table migrations inside the `evee` DB. On every API container startup, `apps/api/src/db/migrate.ts` applies `apps/api/src/db/migrations/`. New migration:

```bash
cd apps/api && bun run db:generate
```

Commit the generated SQL. On next deploy the app runs it on boot. Never hand-write migration SQL.

### Deployment

- CI auto-deploys on push to `main`
- Local deploy (emergency): `scripts/deploy` — fetches secrets from 1Password then runs `kamal deploy`
- Never run `kamal deploy` directly from local (secrets won't be set)

## Architecture

### Frontend data flow

```
App (trpc.Provider + QueryClient + ThemeProvider)
  -> RouterProvider (file-based routes in src/routes/)
    -> HomePage (src/routes/index.tsx)
      -> WidgetGrid (CSS grid of BentoCard components)
      -> CardOverlay (fullscreen expanded view)
```

- Path alias `@` → `apps/web/src/`
- tRPC client `src/lib/trpc.ts`: `splitLink` (HTTP batch for queries/mutations, SSE for subs)
- Zustand stores: `card-expansion-store.ts`, `theme-store.ts`, `navigation-store.ts`, `timer-store.ts`
- Card registry `card-registry.ts` defines grid positions + color schemes
- Art Clock: idle timeout auto-expands clock card with carousel of animated states

### Backend data flow

```
Bun.serve (src/server.ts)
  -> /trpc/*      -> fetchRequestHandler -> appRouter
  -> /api/collect -> Alloy (Faro telemetry proxy)
  -> (prod) static serving from public/
```

- Router: `appRouter` merges `health`, `countdownEvents`, `devices`
- Service layer: `services/` wraps integrations with typed functions
- Evee conversations: `services/evee-conversation-service.ts` runs the full LLM tool-call loop inline
- Home Assistant singleton `ha` initialized at server start
- tRPC context provides `db` (Drizzle)

### Import boundaries (enforced)

Checked by `scripts/check-boundaries.ts` in pre-commit and CI:

| Layer | Allowed imports |
|-------|-----------------|
| `db/` | drizzle-orm, pg, nanoid, relative |
| `services/` | db/, integrations/evee/, integrations/slack/(format,constants), drizzle-orm, @slack/web-api, ai, @ai-sdk/provider, env, lib/ |
| `trpc/routers/` | services/, @trpc/, zod, ../init, ../context |
| `integrations/evee/` | @openrouter/, ai, zod, db/, env |
| `integrations/slack/` | @slack/, slackify-markdown, drizzle-orm, db/, services/, lib/, env |

Routers are thin wrappers calling services. Never put business logic in routers.

## Key Conventions

- `biome.json` at repo root is the single lint + format config. One `bun run lint` from root handles everything. No ESLint / Prettier.
- `routeTree.gen.ts` is committed (TanStack Router plugin generates it)
- `bun` / `bunx` only. Never `npm` / `npx`.
- Numeric constants must have unit suffix: `_MS`, `_SECONDS`, `_BYTES`, etc.
- `GHRC_TOKEN` is the CI secret for GHCR. Intentional naming, NOT a typo — never rename.
- All scripts live in `scripts/`.
- Bundle ID `co.worldwidewebb.theworkflowengine` stays for iOS app continuity. Never rename.

## Pre-commit (Lefthook)

Parallel:
- Biome lint + format (auto-fix, stages fixed files)
- TypeScript typecheck
- Vitest on changed tests
- Import boundary check
- SwiftFormat for `.swift`, plutil for `.plist`, yamllint, actionlint, shellcheck, shfmt
- Screenshot naming check, `.env` file guard

Pre-push: blocks direct push to `main`.

## Target Device & Testing Resolution

- **iPad Pro 12.9" (4th gen, 2020)**: 2732x2048, 4:3, LCD, always-on safe
- All UI work MUST be tested at iPad resolution (browser devtools emulation or `screencapture`)
- Never design at laptop/desktop proportions

## Testing

- TDD: red/green cycle. Failing test first.
- Vitest for unit + integration (API services, frontend components).
- Playwright E2E for real-browser testing at iPad resolution.
- Browser automation (agent-browser CLI, never computer-use MCP) for manual visual verification after UI tasks.

### Playwright E2E (mandatory for frontend changes)

Write E2E tests alongside frontend code, not after.

- Config: `playwright.config.ts` (root), tests in `e2e/`
- Mock data: `e2e/mock-trpc.ts`
- Run: `bun run test:e2e` full, `bun run screenshots` screenshot-only
- CI: E2E on every PR; screenshots on PRs touching `apps/web/**`
- Never use `waitForTimeout` for sleeps. Use `waitForLoadState`, `expect(...).toBeVisible()`, `toPass()`. Only acceptable use is waiting for CSS animations (smallest delay possible).

When adding a new card: card visibility test in `e2e/dashboard-grid.spec.ts`, expand test in `e2e/card-expand-collapse.spec.ts`, card-specific test file. New tRPC query: mock in `e2e/mock-trpc.ts`. New expanded view: content verification test.

## Core Systems

1. **Notification System** — central bus, plugins push, persisted to Postgres
2. **Theme Engine** — Zustand store with palette registration, localStorage persistence
3. **Integration Hub** — plugin interface for device integrations (init, getState, execute, subscribe)
4. **Scene/Layout System** — bento grid of cards with overlay expansion, idle-to-clock carousel

## Personal

- Dog: Zero
- Home: Kurve Wilshire, 2801 Sunset Pl Apt 2124, Los Angeles, CA 90005
- Coordinates: 34.0617, -118.2836 (weather service)
