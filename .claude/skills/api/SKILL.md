# API Skill (apps/api)

## Stack

- Runtime: Bun
- Framework: tRPC v11 (fetch adapter for HTTP, ws adapter for WebSocket)
- Database: SQLite via Drizzle ORM (`drizzle-orm/bun-sqlite`)
- Background jobs: Inngest
- Validation: Zod
- Env config: Validated via Zod in `src/env.ts`

## Directory Layout

```
apps/api/src/
  server.ts              HTTP + WS server entry point
  env.ts                 Environment config (Zod-validated)
  db/
    client.ts            Drizzle client instance
    schema.ts            Drizzle table definitions
  trpc/
    init.ts              tRPC initialization (router, publicProcedure)
    context.ts           Request context (db instance)
    routers/
      index.ts           Root router (merges sub-routers)
      health.ts          Health check router
  inngest/
    client.ts            Inngest client instance
    functions/           Inngest function definitions (empty)
  integrations/
    types.ts             Integration plugin interface
  services/              Business logic layer (empty)
  __tests__/             Test files
  __mocks__/             Vitest mocks (bun:sqlite stub)
```

## Adding a tRPC Router

1. Create `src/trpc/routers/<name>.ts`:

```ts
import { z } from "zod";
import { publicProcedure, router } from "../init";

export const myRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    // ctx.db is the Drizzle instance
    return [];
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
});
```

2. Register it in `src/trpc/routers/index.ts`:

```ts
import { myRouter } from "./my-router";

export const appRouter = router({
  health: healthRouter,
  my: myRouter,
});
```

## Drizzle ORM

Schema is in `src/db/schema.ts` using `drizzle-orm/sqlite-core`.

```ts
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const widgets = sqliteTable("widgets", {
  id: text().primaryKey(),   // TypeID string
  name: text().notNull(),
  createdAt: int({ mode: "timestamp" }).notNull(),
});
```

After modifying schema:
```bash
bun run db:generate   # Generate migration SQL
bun run db:migrate    # Apply migrations
bun run db:push       # Push directly (dev only, no migration file)
```

## Inngest Functions

Define functions in `src/inngest/functions/`. Register them in `server.ts` by adding to the `functions` array in the `serve()` call.

```ts
import { inngest } from "../client";

export const processWorkflow = inngest.createFunction(
  { id: "process-workflow" },
  { event: "workflow/submitted" },
  async ({ event, step }) => {
    // ...
  },
);
```

## Integration Plugins

The `Integration` interface in `src/integrations/types.ts` defines the plugin contract:

- `init()`: Setup/auth
- `getState()`: Current state snapshot
- `execute(command, params)`: Run a command
- `subscribe?(callback)`: Optional event subscription, returns unsubscribe fn

## Import Boundaries

Enforced by `scripts/check-boundaries.ts`. Run with `bun run check:boundaries` from repo root.

| Layer | May import |
|---|---|
| `db/` | `drizzle-orm`, `bun:sqlite`, `@repo/shared`, relative |
| `services/` | `db/`, `integrations/types`, `@repo/shared`, relative |
| `trpc/routers/` | `services/`, `@repo/shared`, `@trpc/*`, `zod`, `../init`, `../context` |
| `inngest/functions/` | `services/`, `@repo/shared`, `inngest`, `../client` |
| `integrations/` | `@repo/shared`, own files |

Routers must not import db or integrations directly. Business logic goes in `services/`.

## Environment

Env vars are validated in `src/env.ts`. Never read `process.env` directly elsewhere. See `.env.example` for available variables.

Key exports: `env` (parsed object), `EFFECTIVE_PORT` (PORT + PORT_OFFSET), `WS_PORT` (EFFECTIVE_PORT + 1).

## Testing

- Tests use Vitest (runs in Node, not Bun).
- `bun:sqlite` is aliased to a mock in `vitest.config.ts` so the import chain resolves.
- Use `appRouter.createCaller({} as never)` for endpoints that don't need context (like health).
- For endpoints that use db, provide a real or mocked context.

## Commands

```bash
bun run dev           # Bun --watch on port 4201
bun run test          # Vitest
bun run typecheck     # tsc --noEmit
bun run lint:fix      # Biome
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema (dev only)
bun run db:studio     # Drizzle Studio
```
