# Architecture

## Overview

The Workflow Engine is a monorepo containing a web frontend and a tRPC API backend. It is designed to orchestrate workflow automation with pluggable integrations and background job processing.

## Monorepo Structure

```
the-workflow-engine/
  apps/
    web/       React SPA (Vite, TanStack Router, tRPC client)
    api/       tRPC API server (Bun, Drizzle ORM, Inngest)
  libs/
    shared/    Shared types and Zod schemas
  scripts/     Build/CI tooling (boundary checker)
  docs/        Documentation
  infra/       Deployment config (planned)
```

Workspace packages: `@repo/web`, `@repo/api`, `@repo/shared`.

## Data Flow

```
Browser
  |
  |  HTTP (queries/mutations)
  v
Vite Dev Server (port 4200)
  |
  |  proxy /trpc -> localhost:4201
  v
tRPC Fetch Handler (port 4201)
  |
  |  also: WebSocket (port 4202) for subscriptions
  v
tRPC Routers
  |
  v
Services (business logic)
  |
  +---> Drizzle ORM ---> SQLite (file-based, ./data.db)
  |
  +---> Inngest Client ---> Inngest Server (port 8288)
  |
  +---> Integration Plugins
```

## API Layers

The API enforces a layered architecture with strict import boundaries:

1. **db/**: Database schema and Drizzle client. Only imports `drizzle-orm`, `bun:sqlite`, `@repo/shared`.
2. **services/**: Business logic. Imports `db/`, `integrations/types`, `@repo/shared`.
3. **trpc/routers/**: HTTP/WS endpoint definitions. Imports `services/`, `@trpc/*`, `zod`, tRPC init/context.
4. **inngest/functions/**: Background jobs. Imports `services/`, `inngest`, `@repo/shared`.
5. **integrations/**: Plugin implementations. Only imports `@repo/shared` and own files.

These boundaries are enforced by `scripts/check-boundaries.ts` (`bun run check:boundaries`).

## Port Scheme

| Service  | Default Port | With PORT_OFFSET=N |
|----------|-------------|--------------------|
| Web      | 4200        | 4200 + N           |
| API      | 4201        | 4201 + N           |
| WS       | 4202        | 4202 + N           |
| Inngest  | 8288        | 8288 + N           |

`PORT_OFFSET` (0-99) allows multiple instances to run side-by-side (e.g., for parallel development or CI).

## Local Development

Tilt orchestrates all services:

```bash
tilt up                             # Start everything
PORT_OFFSET=10 tilt up              # Start on offset ports
tilt down                           # Stop everything
```

Tilt starts: Docker Compose (Inngest), API (bun --watch), Web (vite dev). The API depends on Inngest, and the Web depends on the API.

## ID System

TypeID is used for entity identifiers. IDs are prefixed, time-sortable strings (e.g., `user_2x4y6z8a...`). Stored as `text` (varchar) columns in SQLite.

## Auth (planned)

JWT via `jose` library, password hashing via `Bun.password` (argon2). Not yet implemented.

## Integration Plugin System

Plugins implement the `Integration` interface (`src/integrations/types.ts`):

- `init()`: One-time setup/authentication.
- `getState()`: Returns current state snapshot.
- `execute(command, params)`: Runs a command against the integration.
- `subscribe?(callback)`: Optional event stream, returns unsubscribe function.

Plugins are isolated: they may only import `@repo/shared` and their own files.
