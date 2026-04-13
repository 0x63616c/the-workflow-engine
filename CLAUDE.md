# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: ALWAYS USE WORKTREES

**Every session MUST use a git worktree before editing any files.** Multiple Claude sessions run in parallel on this repo. Without worktrees, agents corrupt each other's work.

- Auto-enter worktree at session start. No asking, no confirmation needed.
- Base off `main` when possible (unless task specifically requires another branch).
- Use `using-git-worktrees` skill or `EnterWorktree` tool.
- If already in a worktree, skip. Otherwise, create one before any edits.

### Worktree Naming Convention

**Format:** `{type}/{description}` for both directory and branch name.

```
Directory: .claude/worktrees/{type}/{description}
Branch:    {type}/{description}
```

**Valid types** (conventional commit prefixes): `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`

**Description**: kebab-case, concise.

**Examples:**
```bash
git worktree add .claude/worktrees/feat/slack-notifications -b feat/slack-notifications
git worktree add .claude/worktrees/fix/auth-token-expiry -b fix/auth-token-expiry
git worktree add .claude/worktrees/chore/update-dependencies -b chore/update-dependencies
```

**Rules:**
- Always use `.claude/worktrees/` — never `.worktrees/` or `worktrees/`
- Branch name = folder path (e.g. `feat/slack-notifications`, NOT `worktree-feat+slack-notifications`)
- No `worktree-` prefix. No `+` separator.

---

# The Workflow Engine

Wall-mounted iPad Pro smart home panel. Living art, controls home.

## Tech Stack

### Frontend (apps/web)

- **Bundler / Dev server**: Vite
- **UI**: React 19, TypeScript
- **Routing**: TanStack Router (file-based, Vite plugin)
- **Data fetching / server state**: TanStack Query via tRPC React bindings
- **Client state**: Zustand
- **Styling**: Tailwind CSS v4, shadcn/ui (style: new-york, base: neutral)
- **3D**: Three.js via @react-three/fiber + @react-three/drei (used in art clock states)
- **Animation**: Framer Motion
- **Icons**: `lucide-react`
- **Fonts**: Geist (`geist` package)
- **Testing**: Vitest + @testing-library/react (jsdom)
- **Linting / formatting**: Biome

### Backend (apps/api)

- **Runtime**: Bun
- **Framework**: tRPC v11 (HTTP batch + SSE subscriptions via `splitLink`)
- **Database**: PostgreSQL via Drizzle ORM (node-postgres driver)
- **Auth**: PIN code, hashed, long-lived token
- **Validation**: Zod
- **Env config**: Validated via Zod in `src/env.ts`. Never read `.env` directly.

### Shared Library (libs/shared)

- `@repo/shared` workspace package, re-exports from `src/types/` and `src/schemas/`
- Used by both apps for shared Zod schemas and TypeScript types

### Native Shell

- **Currently running as PWA** on iPad (Capacitor native shell planned for later)
- **Capacitor** wraps the PWA in a native iOS shell (WKWebView)
- Enables native API access (screen brightness, camera, haptics) via JS-to-native bridge
- iPad runs in **MDM Single App Mode** (via Apple Configurator 2, no subscription needed)
- Presence detection: motion sensor via Home Assistant (not camera), triggers UI wake/sleep

### Event/Workflow Engine

- **Inngest** (self-hosted via Docker) for background work, event-driven functions, cron jobs
- Runs as Docker container in both dev (via docker-compose.yml) and prod
- API registers Inngest handler at `/api/inngest` endpoint
- Inngest dev server calls back to API via `host.docker.internal`

### Infrastructure

- **Device layer**: Home Assistant (REST API, accessed from API service)
- **Local dev**: Tilt (orchestrates docker-compose + local bun processes)
- **Prod**: Docker Compose on Mac Mini (Kamal deploy, GHCR images)
- **CI**: GitHub Actions on PRs to main (lint, typecheck, test, boundary check)

### Deployment

- **CI deploys automatically** on push to `main` via GitHub Actions (`kamal deploy`)
- **Local deploy** (emergency/hotfix): `scripts/deploy` — fetches secrets from 1Password then runs `kamal deploy`
- Never run `kamal deploy` directly from local (secrets won't be set)

### Slack Bot (Evee)

- **Evee** is the project's Slack bot in the World Wide Webb workspace (worldwidewebbco.slack.com)
- **Runtime**: Slack Bolt (Socket Mode), Vercel AI SDK (`ai` + `@openrouter/ai-sdk-provider`)
- **Model**: `google/gemma-4-31b-it` via OpenRouter
- **Code**: `apps/api/src/integrations/slack/` (modular: handler, thread, llm, format, tools)
- **Capabilities**: thread context via `conversations.replies`, image support, tool calling (getCurrentDateTime, rollDice)
- **Agentic loop**: `generateText()` with up to 50 tool-calling steps, 2-minute timeout
- Posts deploy pipeline notifications (start, checks, deploy status) to Slack
- Credentials stored in 1Password (`op://Homelab/...`)
- App manifest: `infra/evee/slack-manifest.yml`

## Ports

| Service        | Port         |
| -------------- | ------------ |
| web (Vite)     | 4200         |
| api (tRPC)     | 4201         |
| Inngest dev    | 8288         |
| Home Assistant | 8123         |

Port isolation for parallel agents: set `PORT_OFFSET` env var. Tiltfile adds offset to all ports. API reads `PORT_OFFSET` from env and adds to base port via `EFFECTIVE_PORT`.

## Monorepo Structure

```
apps/web/          # React PWA (iPad panel UI)
apps/api/          # tRPC backend (Bun + SQLite)
libs/shared/       # @repo/shared - types and schemas
scripts/           # ALL scripts go here (dev helpers, setup, automation, boundary checks)
docs/              # Screenshots, architecture docs
```

Bun workspaces configured in root `package.json` (`"workspaces": ["apps/*", "libs/*"]`).

## Local Development

```bash
tilt up           # Start Inngest (Docker), API (bun --watch), web (Vite)
tilt down         # Stop all
```

Tilt starts services in order: docker-compose (Inngest) -> api -> web. Vite proxies `/trpc` to API (configured in `vite.config.ts`).

## Common Commands

### Root (monorepo)

```bash
bun run test              # Run all workspace tests
bun run lint:fix          # Biome check + fix entire repo
bun run typecheck         # Typecheck all workspaces
bun run check:boundaries  # Verify import boundary rules
```

### apps/web

```bash
cd apps/web
bun run dev               # Vite dev server (port 4200)
bun run build             # tsc -b && vite build
bun run test              # vitest run
bun run test:watch        # vitest (watch mode)
bun run lint:fix          # biome check --write src/
```

### apps/api

```bash
cd apps/api
bun run dev               # bun --watch src/server.ts (port 4201)
bun run test              # vitest run
bun run test:watch        # vitest (watch mode)
bun run lint:fix          # biome check --write src/
bun run db:generate       # Drizzle migration generation
bun run db:migrate        # Apply migrations
bun run db:push           # Push schema directly (dev only)
bun run db:studio         # Open Drizzle Studio
```

### Run single test file

```bash
cd apps/web && bunx vitest run src/__tests__/timer-card.test.tsx
cd apps/api && bunx vitest run src/__tests__/services/ha-service.test.ts
```

### Prod database

```bash
# pgcli (interactive terminal with autocomplete)
pgcli "postgresql://workflow:$(op read 'op://Homelab/Workflow Engine Postgres/password')@homelab:5432/workflow_engine"

# Drizzle Studio (web UI) — runs from anywhere
scripts/drizzle-prod
```

## Architecture

### Frontend Data Flow

```
App (trpc.Provider + QueryClient + ThemeProvider)
  -> RouterProvider (TanStack Router, file-based routes in src/routes/)
    -> HomePage (src/routes/index.tsx)
      -> WidgetGrid (6x4 CSS grid of BentoCard components)
      -> CardOverlay (fullscreen expanded view, rendered when card tapped)
```

- **Path alias**: `@` maps to `apps/web/src/` (configured in vite.config.ts)
- **tRPC client**: `src/lib/trpc.ts` creates React-aware tRPC client with `splitLink` (HTTP batch for queries/mutations, SSE for subscriptions)
- **Stores** (Zustand): `card-expansion-store.ts` (expand/contract cards), `theme-store.ts` (palette management), `navigation-store.ts`, `timer-store.ts`
- **Card system**: `card-registry.ts` defines grid positions and color schemes for all cards. `CardOverlay` maps card IDs to expanded view components.
- **Art Clock**: Idle timeout (45s) auto-expands clock card. Clock has carousel of animated states (black hole, constellation, pendulum, radar, topographic, waveform, wireframe globe, particle drift).

### Backend Data Flow

```
Bun.serve (src/server.ts)
  -> /trpc/*      -> fetchRequestHandler -> appRouter
  -> /api/inngest -> Inngest serve handler
  -> (production) -> static file serving from public/
```

- **Router structure**: `appRouter` merges `health`, `countdownEvents`, `devices` routers
- **Service layer**: `services/ha-service.ts` wraps HA integration with typed functions (lights, media players)
- **Integration interface**: `integrations/types.ts` defines `Integration` (id, name, init, getState, execute, subscribe). HomeAssistant is the only implementation.
- **HA integration**: Singleton `ha` instance initialized at server start. All HA calls go through typed wrapper methods (getEntities, getEntity, callService).
- **Context**: tRPC context provides `db` (Drizzle instance). No auth middleware yet.

### Import Boundaries (Enforced)

Checked by `scripts/check-boundaries.ts` in pre-commit and CI:

| Layer | Can Import |
|-------|-----------|
| `db/` | drizzle-orm, bun:sqlite, @repo/shared, relative |
| `services/` | db/, integrations/types, @repo/shared, drizzle-orm |
| `trpc/routers/` | services/, @trpc/, zod, @repo/shared, ../init, ../context |
| `inngest/functions/` | services/, inngest, @repo/shared, ../client |
| `integrations/` | @repo/shared, own files |

Routers and Inngest functions are **thin wrappers** calling services. Never put business logic in routers.

### Test Setup

- **API tests**: `src/__tests__/setup.ts` sets `HA_TOKEN` and `HA_URL` env vars if not present. Tests mock HA calls.
- **Web tests**: `src/test-setup.ts` configures jsdom environment. Uses @testing-library/react.
- Tests live in `src/__tests__/` in both apps.

## Key Conventions

- `biome.json` at repo root: 2-space indent, 100 char line width, recommended rules.
- `routeTree.gen.ts` committed (auto-generated by TanStack Router Vite plugin).
- Use `bun` / `bunx`, never `npm` / `npx`.
- Numeric constants must have unit suffix (`_MS`, `_SECONDS`, `_BYTES`, etc.).
- New features = plugins registering w/ core systems (Notification System, Theme Engine, Integration Hub, Scene/Layout System).
- `GHRC_TOKEN` is the CI secret for GitHub Container Registry. This is **intentional naming**, NOT a typo of `GHCR_TOKEN`. Never rename, never suggest renaming, never "fix" it.
- All scripts live in `scripts/`. Never use `bin/` or other directories for scripts.

## Pre-commit Hooks (Lefthook)

Runs in parallel:
- Biome lint + format (auto-fix, stages fixed files)
- TypeScript type-check (`tsc --noEmit`)
- Vitest run changed tests
- Import boundary check
- Block `.env` files from commits
- SwiftFormat for `.swift` files
- plutil lint for `.plist` files

Pre-push: blocks direct push to `main`.

## Agent Development

### Agent Teams

- Build using agent teams, not independent sub-agents.
- Each teammate owns an area: frontend, API, integrations, testing, infra.
- Agents use **git worktrees** for isolated dev spaces (own services, own code, no conflicts).
- Merge back to main when work is tested and verified.

### Build Phases

- Phased approach: tooling first -> test tooling -> solidify -> build app using everything set up.
- Never skip ahead. Each phase tested before next begins.

## Target Device & Testing Resolution

- **iPad Pro 12.9" (4th gen, 2020)**: 2732x2048, 4:3 aspect ratio, LCD, always-on safe
- All UI work MUST be tested at iPad resolution. Use browser dev tools device emulation or `screencapture` at this size.
- Never design or test at laptop/desktop proportions. Cards, fonts, and layouts optimized for 4:3.

## Testing

- **TDD always.** Red/green cycle. Write failing test first, implement, refactor.
- **Vitest** for unit + integration tests (API services, frontend components).
- **Browser automation** (agent-browser CLI or equivalent) for E2E and manual visual verification after every UI task.
- No task is "done" until tests pass AND browser automation confirms visually.
- API tests: hit real endpoints (SQLite in-memory for test DB).
- Frontend tests: Vitest + Testing Library for units, browser automation for flows.

## Core Systems

1. **Notification System** - Central bus, plugins push notifications, persisted to SQLite
2. **Theme Engine** - Zustand store with palette registration, midnight/daylight built-in, localStorage persistence
3. **Integration Hub** - Plugin interface for device integrations (init, getState, execute, subscribe)
4. **Scene/Layout System** - Bento grid of cards with overlay expansion, idle-to-clock carousel
