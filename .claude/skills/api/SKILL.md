---
name: api
description: Guide for working on the tRPC API backend in apps/api (routers, services, database, Inngest, import boundaries)
user_invocable: false
---

# API Development (apps/api)

## tRPC Routers

Create new routers in `src/trpc/routers/<name>.ts`, then merge into the root router in `src/trpc/routers/index.ts`.

```ts
// src/trpc/routers/notifications.ts
import { z } from "zod";
import { publicProcedure, router } from "../init";
import { NotificationService } from "../../services/notifications";

export const notificationRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return NotificationService.list(ctx.db);
  }),
  dismiss: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return NotificationService.dismiss(ctx.db, input.id);
    }),
});
```

Register in the root router:

```ts
// src/trpc/routers/index.ts
import { notificationRouter } from "./notifications";

export const appRouter = router({
  health: healthRouter,
  notifications: notificationRouter,
});
```

Routers are thin wrappers. Business logic goes in services.

## Services

Services live in `src/services/` and contain all business logic. They receive the DB instance as a parameter (no global imports of the db client).

```ts
// src/services/notifications.ts
import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { notifications } from "../db/schema";
import type * as schema from "../db/schema";

export const NotificationService = {
  async list(db: BunSQLiteDatabase<typeof schema>) {
    return db.select().from(notifications).all();
  },
  async dismiss(db: BunSQLiteDatabase<typeof schema>, id: string) {
    return db.delete(notifications).where(eq(notifications.id, id));
  },
};
```

## Database (Drizzle ORM + SQLite)

Schema defined in `src/db/schema.ts` using `drizzle-orm/sqlite-core`.

```ts
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notifications = sqliteTable("notifications", {
  id: text().primaryKey(),
  title: text().notNull(),
  body: text(),
  createdAt: int({ mode: "timestamp" }).notNull(),
});
```

After schema changes:

```bash
bun run db:generate   # Generate migration files
bun run db:migrate    # Apply migrations
bun run db:push       # Push directly (dev only, skips migration file)
```

## Inngest Functions

Background/async work uses Inngest. Functions live in `src/inngest/functions/`.

```ts
// src/inngest/functions/poll-ha.ts
import { inngest } from "../client";
import { HAService } from "../../services/home-assistant";

export const pollHomeAssistant = inngest.createFunction(
  { id: "poll-home-assistant" },
  { cron: "*/30 * * * * *" },
  async ({ step }) => {
    await step.run("fetch-states", async () => {
      return HAService.fetchStates();
    });
  },
);
```

Register in the `functions` array in `src/server.ts`:

```ts
const inngestHandler = serve({
  client: inngest,
  functions: [pollHomeAssistant],
});
```

## Import Boundaries (CRITICAL)

These are strictly enforced. Violations will be caught by lint/pre-commit hooks.

| Layer | Can import from | Cannot import from |
|---|---|---|
| `db/` | `drizzle-orm`, `bun:sqlite` | tRPC, Inngest, services, HTTP |
| `services/` | `db/`, `integrations/types` | tRPC, Inngest, HTTP |
| `trpc/routers/` | `services/`, `trpc/init`, `trpc/context` | `db/` directly, Inngest |
| `inngest/functions/` | `services/`, `inngest/client` | `db/` directly, tRPC |
| `integrations/` | shared types only | everything else |

Dependencies point inward: infrastructure -> services -> domain. Never reverse.

## Environment

Env vars validated via Zod in `src/env.ts`. Never read `process.env` directly. Import from `env.ts`:

```ts
import { env, EFFECTIVE_PORT } from "./env";
```

`PORT_OFFSET` enables multiple instances (worktrees) to run simultaneously without port conflicts.

## Testing

Use `createCaller` for router-level tests:

```ts
import { createCaller } from "../trpc/routers";

const caller = createCaller({ db: testDb });
const result = await caller.health.ping();
expect(result.status).toBe("ok");
```

## Commands

```bash
bun run dev         # Start API on port 4201 (hot-reload)
bun run db:generate # Generate Drizzle migration files
bun run db:migrate  # Apply pending migrations
bun run db:push     # Push schema directly (dev only)
bun run db:studio   # Open Drizzle Studio
bun run test        # Run Vitest
bun run lint:fix    # Biome lint + auto-fix
```
