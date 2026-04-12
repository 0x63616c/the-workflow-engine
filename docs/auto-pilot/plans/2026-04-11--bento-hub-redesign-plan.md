# Bento Hub Redesign Implementation Plan

**Goal:** Transform the uniform 3x3 hub grid into a varied 6-column bento layout with mixed card sizes, per-card color identities, an expand/contract overlay pattern, countdown events (full stack), and four placeholder cards.
**Architecture:** Replace `useNavigationStore` with `useCardExpansionStore` that tracks which card is expanded (or null). The grid is always rendered; a fixed overlay renders expanded card content on top. Clock becomes the idle state via expansion (not a separate view). Countdown events are a full-stack feature: SQLite table, Drizzle schema, service layer, tRPC router, React card with mini/expanded views.
**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS v4, TanStack Query, tRPC v11, Drizzle ORM, SQLite, Vitest, Biome

---

## Task 1: Countdown Events Schema

**Files:**
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/__tests__/countdown-events.test.ts`:

```typescript
import { Database } from "bun:sqlite";
import { eq, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "../db/schema";

describe("countdown_events schema", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle({ client: sqlite, schema });
    db.run(sql`CREATE TABLE countdown_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  });

  afterEach(() => {
    sqlite.close();
  });

  it("inserts and retrieves a countdown event", async () => {
    const result = db
      .insert(schema.countdownEvents)
      .values({ title: "Test Event", date: "2026-12-25" })
      .returning()
      .get();

    expect(result.id).toBe(1);
    expect(result.title).toBe("Test Event");
    expect(result.date).toBe("2026-12-25");
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/api && bun run test
```

Expected: FAIL because `schema.countdownEvents` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add to `apps/api/src/db/schema.ts` after the existing `systemInfo` table:

```typescript
export const countdownEvents = sqliteTable("countdown_events", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  date: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
```

Add `sql` to the imports from `drizzle-orm`:

```typescript
import { int, sql, sqliteTable, text } from "drizzle-orm/sqlite-core";
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/api && bun run test
```

Expected: PASS

- [ ] **Step 5: Generate Drizzle migration**

```bash
cd apps/api && bun run db:generate
```

Expected: New migration file in `apps/api/src/db/migrations/`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/__tests__/countdown-events.test.ts apps/api/src/db/migrations/
git commit -m "feat: add countdown_events schema and migration"
git push
```

---

## Task 2: Countdown Events Service

**Files:**
- Create: `apps/api/src/services/countdown-events.ts`
- Modify: `apps/api/src/__tests__/countdown-events.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/__tests__/countdown-events.test.ts` (new describe block after the schema tests):

```typescript
import {
  createCountdownEvent,
  getCountdownEventById,
  listPastCountdownEvents,
  listUpcomingCountdownEvents,
  removeCountdownEvent,
  updateCountdownEvent,
} from "../services/countdown-events";

describe("countdown events service", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle({ client: sqlite, schema });
    db.run(sql`CREATE TABLE countdown_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  });

  afterEach(() => {
    sqlite.close();
  });

  it("create inserts and returns event with id", () => {
    const event = createCountdownEvent(db, {
      title: "Test Event",
      date: "2026-12-25",
    });

    expect(event.id).toBe(1);
    expect(event.title).toBe("Test Event");
    expect(event.date).toBe("2026-12-25");
  });

  it("listUpcoming returns only future events ordered by date ASC", () => {
    createCountdownEvent(db, { title: "Past", date: "2020-01-01" });
    createCountdownEvent(db, { title: "Far future", date: "2030-06-15" });
    createCountdownEvent(db, { title: "Near future", date: "2027-01-01" });

    const upcoming = listUpcomingCountdownEvents(db);

    expect(upcoming).toHaveLength(2);
    expect(upcoming[0].title).toBe("Near future");
    expect(upcoming[1].title).toBe("Far future");
  });

  it("listPast returns only past events ordered by date DESC", () => {
    createCountdownEvent(db, { title: "Past old", date: "2019-01-01" });
    createCountdownEvent(db, { title: "Past recent", date: "2024-06-15" });
    createCountdownEvent(db, { title: "Future", date: "2030-01-01" });

    const past = listPastCountdownEvents(db);

    expect(past).toHaveLength(2);
    expect(past[0].title).toBe("Past recent");
    expect(past[1].title).toBe("Past old");
  });

  it("getById returns a single event", () => {
    const created = createCountdownEvent(db, {
      title: "Find me",
      date: "2026-06-01",
    });

    const found = getCountdownEventById(db, created.id);

    expect(found.title).toBe("Find me");
  });

  it("getById throws for non-existent id", () => {
    expect(() => getCountdownEventById(db, 999)).toThrow();
  });

  it("update modifies title and date", () => {
    const created = createCountdownEvent(db, {
      title: "Original",
      date: "2026-06-01",
    });

    const updated = updateCountdownEvent(db, created.id, {
      title: "Updated",
      date: "2026-07-01",
    });

    expect(updated.title).toBe("Updated");
    expect(updated.date).toBe("2026-07-01");
  });

  it("update throws for non-existent id", () => {
    expect(() =>
      updateCountdownEvent(db, 999, { title: "Nope", date: "2026-01-01" }),
    ).toThrow();
  });

  it("remove deletes event", () => {
    const created = createCountdownEvent(db, {
      title: "Delete me",
      date: "2026-06-01",
    });

    removeCountdownEvent(db, created.id);

    expect(() => getCountdownEventById(db, created.id)).toThrow();
  });

  it("remove throws for non-existent id", () => {
    expect(() => removeCountdownEvent(db, 999)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/api && bun run test
```

Expected: FAIL because `../services/countdown-events` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/src/services/countdown-events.ts`:

```typescript
import { asc, desc, gte, lt, sql } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { countdownEvents } from "../db/schema";
import type * as schema from "../db/schema";

type DB = BunSQLiteDatabase<typeof schema>;

interface CountdownEventInput {
  title: string;
  date: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createCountdownEvent(db: DB, input: CountdownEventInput) {
  return db
    .insert(countdownEvents)
    .values({ title: input.title, date: input.date })
    .returning()
    .get();
}

export function listUpcomingCountdownEvents(db: DB) {
  return db
    .select()
    .from(countdownEvents)
    .where(gte(countdownEvents.date, todayISO()))
    .orderBy(asc(countdownEvents.date))
    .all();
}

export function listPastCountdownEvents(db: DB) {
  return db
    .select()
    .from(countdownEvents)
    .where(lt(countdownEvents.date, todayISO()))
    .orderBy(desc(countdownEvents.date))
    .all();
}

export function getCountdownEventById(db: DB, id: number) {
  const event = db
    .select()
    .from(countdownEvents)
    .where(sql`${countdownEvents.id} = ${id}`)
    .get();

  if (!event) {
    throw new Error(`Countdown event with id ${id} not found`);
  }

  return event;
}

export function updateCountdownEvent(
  db: DB,
  id: number,
  input: CountdownEventInput,
) {
  const existing = getCountdownEventById(db, id);

  return db
    .update(countdownEvents)
    .set({
      title: input.title,
      date: input.date,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(sql`${countdownEvents.id} = ${id}`)
    .returning()
    .get();
}

export function removeCountdownEvent(db: DB, id: number) {
  getCountdownEventById(db, id);

  db.delete(countdownEvents)
    .where(sql`${countdownEvents.id} = ${id}`)
    .run();
}
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/api && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/countdown-events.ts apps/api/src/__tests__/countdown-events.test.ts
git commit -m "feat: add countdown events service with CRUD operations"
git push
```

---

## Task 3: Countdown Events tRPC Router

**Files:**
- Create: `apps/api/src/trpc/routers/countdown-events.ts`
- Modify: `apps/api/src/trpc/routers/index.ts`
- Modify: `apps/api/src/__tests__/countdown-events.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/__tests__/countdown-events.test.ts` (new describe block):

```typescript
import { appRouter } from "../trpc/routers";

describe("countdown events router", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle({ client: sqlite, schema });
    db.run(sql`CREATE TABLE countdown_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    caller = appRouter.createCaller({ db } as any);
  });

  afterEach(() => {
    sqlite.close();
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

    await expect(
      caller.countdownEvents.getById({ id: created.id }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/api && bun run test
```

Expected: FAIL because `countdownEvents` router is not registered.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/src/trpc/routers/countdown-events.ts`:

```typescript
import { z } from "zod";

import {
  createCountdownEvent,
  getCountdownEventById,
  listPastCountdownEvents,
  listUpcomingCountdownEvents,
  removeCountdownEvent,
  updateCountdownEvent,
} from "../../services/countdown-events";
import { publicProcedure, router } from "../init";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const countdownEventInput = z.object({
  title: z.string().min(1),
  date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD format"),
});

export const countdownEventsRouter = router({
  listUpcoming: publicProcedure.query(({ ctx }) => {
    return listUpcomingCountdownEvents(ctx.db);
  }),

  listPast: publicProcedure.query(({ ctx }) => {
    return listPastCountdownEvents(ctx.db);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return getCountdownEventById(ctx.db, input.id);
    }),

  create: publicProcedure
    .input(countdownEventInput)
    .mutation(({ ctx, input }) => {
      return createCountdownEvent(ctx.db, input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1),
        date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD format"),
      }),
    )
    .mutation(({ ctx, input }) => {
      return updateCountdownEvent(ctx.db, input.id, {
        title: input.title,
        date: input.date,
      });
    }),

  remove: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      removeCountdownEvent(ctx.db, input.id);
      return { success: true };
    }),
});
```

Modify `apps/api/src/trpc/routers/index.ts`:

```typescript
import { router } from "../init";
import { countdownEventsRouter } from "./countdown-events";
import { healthRouter } from "./health";

export const appRouter = router({
  health: healthRouter,
  countdownEvents: countdownEventsRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/api && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/trpc/routers/countdown-events.ts apps/api/src/trpc/routers/index.ts apps/api/src/__tests__/countdown-events.test.ts
git commit -m "feat: add countdown events tRPC router"
git push
```

---

## Task 4: Countdown Events Seed Script

**Files:**
- Create: `apps/api/src/db/seed-countdown-events.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Write the seed script**

Create `apps/api/src/db/seed-countdown-events.ts`:

```typescript
import { db } from "./client";
import { countdownEvents } from "./schema";

const EVENTS = [
  { title: "New Year's Day", date: "2026-01-01" },
  { title: "MLK Day", date: "2026-01-19" },
  { title: "Valentine's Day", date: "2026-02-14" },
  { title: "Presidents' Day", date: "2026-02-16" },
  { title: "Daylight Saving Begins", date: "2026-03-08" },
  { title: "St. Patrick's Day", date: "2026-03-17" },
  { title: "April Fool's Day", date: "2026-04-01" },
  { title: "Tax Day", date: "2026-04-15" },
  { title: "Coachella W2", date: "2026-04-16" },
  { title: "Earth Day", date: "2026-04-22" },
  { title: "SF - SoFi Codathon", date: "2026-04-26" },
  { title: "Disco Lines", date: "2026-05-02" },
  { title: "Cinco de Mayo", date: "2026-05-05" },
  { title: "Mother's Day", date: "2026-05-10" },
  { title: "Memorial Day", date: "2026-05-25" },
  { title: "Father's Day", date: "2026-06-21" },
  { title: "Independence Day", date: "2026-07-04" },
  { title: "Labor Day", date: "2026-09-07" },
  { title: "Halloween", date: "2026-10-31" },
  { title: "Daylight Saving Ends", date: "2026-11-01" },
  { title: "Veterans Day", date: "2026-11-11" },
  { title: "Thanksgiving", date: "2026-11-26" },
  { title: "Christmas Eve", date: "2026-12-24" },
  { title: "Christmas Day", date: "2026-12-25" },
  { title: "New Year's Eve", date: "2026-12-31" },
  { title: "Super Bowl LX", date: "2027-02-07" },
  { title: "Spring Equinox", date: "2026-03-20" },
  { title: "Summer Solstice", date: "2026-06-20" },
  { title: "Fall Equinox", date: "2026-09-22" },
  { title: "Winter Solstice", date: "2026-12-21" },
  { title: "Juneteenth", date: "2026-06-19" },
  { title: "Columbus Day", date: "2026-10-12" },
  { title: "Election Day", date: "2026-11-03" },
  { title: "Black Friday", date: "2026-11-27" },
  { title: "Cyber Monday", date: "2026-11-30" },
  { title: "Pi Day", date: "2026-03-14" },
  { title: "Star Wars Day", date: "2026-05-04" },
  { title: "World Environment Day", date: "2026-06-05" },
  { title: "International Music Day", date: "2026-10-01" },
  { title: "New Year 2025 (past)", date: "2025-01-01" },
  { title: "Valentine's Day 2025 (past)", date: "2025-02-14" },
  { title: "July 4th 2025 (past)", date: "2025-07-04" },
  { title: "Christmas 2025 (past)", date: "2025-12-25" },
  { title: "NYE 2025 (past)", date: "2025-12-31" },
];

console.log(`Seeding ${EVENTS.length} countdown events...`);
db.insert(countdownEvents).values(EVENTS).run();
console.log(`Seeded ${EVENTS.length} countdown events`);
```

- [ ] **Step 2: Add db:seed script to package.json**

Add to `apps/api/package.json` scripts:

```json
"db:seed": "bun src/db/seed-countdown-events.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/seed-countdown-events.ts apps/api/package.json
git commit -m "feat: add countdown events seed script with 44 events"
git push
```

---

## Task 5: Card Expansion Store

**Files:**
- Create: `apps/web/src/stores/card-expansion-store.ts`
- Create: `apps/web/src/__tests__/card-expansion-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/card-expansion-store.test.ts`:

```typescript
import { afterEach, describe, expect, it } from "vitest";

import { useCardExpansionStore } from "@/stores/card-expansion-store";

describe("card-expansion-store", () => {
  afterEach(() => {
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("initializes with no card expanded", () => {
    const state = useCardExpansionStore.getState();
    expect(state.expandedCardId).toBeNull();
  });

  it("expandCard sets expandedCardId", () => {
    useCardExpansionStore.getState().expandCard("weather");
    expect(useCardExpansionStore.getState().expandedCardId).toBe("weather");
  });

  it("contractCard sets expandedCardId to null", () => {
    useCardExpansionStore.getState().expandCard("weather");
    useCardExpansionStore.getState().contractCard();
    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("expanding another card replaces the current one", () => {
    useCardExpansionStore.getState().expandCard("weather");
    useCardExpansionStore.getState().expandCard("clock");
    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because `card-expansion-store` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/stores/card-expansion-store.ts`:

```typescript
import { create } from "zustand";

interface CardExpansionState {
  expandedCardId: string | null;
}

interface CardExpansionActions {
  expandCard: (id: string) => void;
  contractCard: () => void;
}

export const useCardExpansionStore = create<
  CardExpansionState & CardExpansionActions
>((set) => ({
  expandedCardId: null,
  expandCard: (id) => set({ expandedCardId: id }),
  contractCard: () => set({ expandedCardId: null }),
}));
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS (new tests pass, existing tests still pass)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/stores/card-expansion-store.ts apps/web/src/__tests__/card-expansion-store.test.ts
git commit -m "feat: add card expansion store replacing navigation store"
git push
```

---

## Task 6: Card Registry

**Files:**
- Create: `apps/web/src/components/hub/card-registry.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/card-registry.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { CARD_CONFIGS, getCardConfig } from "@/components/hub/card-registry";

describe("card-registry", () => {
  it("has 12 card configs", () => {
    expect(CARD_CONFIGS).toHaveLength(12);
  });

  it("each card has required fields", () => {
    for (const config of CARD_CONFIGS) {
      expect(config.id).toBeTruthy();
      expect(config.gridColumn).toBeTruthy();
      expect(config.gridRow).toBeTruthy();
      expect(config.colorScheme).toBeDefined();
      expect(typeof config.hasExpandedView).toBe("boolean");
    }
  });

  it("getCardConfig returns config by id", () => {
    const weather = getCardConfig("weather");
    expect(weather).toBeDefined();
    expect(weather!.gridColumn).toBe("1 / 3");
    expect(weather!.gridRow).toBe("1 / 3");
  });

  it("getCardConfig returns undefined for unknown id", () => {
    expect(getCardConfig("nonexistent")).toBeUndefined();
  });

  it("wifi card has no expanded view", () => {
    const wifi = getCardConfig("wifi");
    expect(wifi!.hasExpandedView).toBe(false);
  });

  it("theme card has no expanded view", () => {
    const theme = getCardConfig("theme");
    expect(theme!.hasExpandedView).toBe(false);
  });

  it("weather card has expanded view", () => {
    const weather = getCardConfig("weather");
    expect(weather!.hasExpandedView).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because `card-registry` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/components/hub/card-registry.ts`:

```typescript
export interface CardColorScheme {
  bg: string;
  accent: string;
  border: string;
}

export interface CardConfig {
  id: string;
  gridColumn: string;
  gridRow: string;
  colorScheme: CardColorScheme;
  borderRadius?: string;
  hasExpandedView: boolean;
}

export const CARD_CONFIGS: CardConfig[] = [
  {
    id: "weather",
    gridColumn: "1 / 3",
    gridRow: "1 / 3",
    colorScheme: {
      bg: "bg-gradient-to-br from-sky-500/15 to-blue-400/10",
      accent: "#38bdf8",
      border: "border-sky-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "clock",
    gridColumn: "3 / 5",
    gridRow: "1 / 3",
    colorScheme: {
      bg: "",
      accent: "#facc15",
      border: "",
    },
    hasExpandedView: true,
  },
  {
    id: "countdown",
    gridColumn: "5 / 7",
    gridRow: "1 / 2",
    colorScheme: {
      bg: "bg-gradient-to-br from-purple-600/15 to-violet-500/10",
      accent: "#8b5cf6",
      border: "border-purple-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "photo",
    gridColumn: "5 / 7",
    gridRow: "2 / 3",
    colorScheme: {
      bg: "bg-gradient-to-br from-rose-400/15 to-pink-300/10",
      accent: "#fb7185",
      border: "border-rose-400/10",
    },
    borderRadius: "rounded-3xl",
    hasExpandedView: false,
  },
  {
    id: "wifi",
    gridColumn: "1 / 2",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "",
      accent: "#22c55e",
      border: "border-green-500/10",
    },
    hasExpandedView: false,
  },
  {
    id: "lights",
    gridColumn: "2 / 3",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-amber-400/15 to-yellow-300/10",
      accent: "#f59e0b",
      border: "border-amber-400/10",
    },
    hasExpandedView: true,
  },
  {
    id: "music",
    gridColumn: "3 / 4",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-slate-600/15 to-slate-500/10",
      accent: "#06b6d4",
      border: "border-slate-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "calendar",
    gridColumn: "4 / 5",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "",
      accent: "#f97316",
      border: "border-orange-400/10",
    },
    hasExpandedView: true,
  },
  {
    id: "email",
    gridColumn: "5 / 6",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-blue-400/15 to-blue-300/10",
      accent: "#3b82f6",
      border: "border-blue-400/10",
    },
    hasExpandedView: false,
  },
  {
    id: "system",
    gridColumn: "6 / 7",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-green-400/10 to-emerald-300/5",
      accent: "#22c55e",
      border: "border-green-400/10",
    },
    hasExpandedView: false,
  },
  {
    id: "quote",
    gridColumn: "1 / 3",
    gridRow: "4 / 5",
    colorScheme: {
      bg: "bg-gradient-to-br from-stone-200/10 to-stone-100/5",
      accent: "#84cc16",
      border: "border-stone-300/10",
    },
    borderRadius: "rounded-3xl",
    hasExpandedView: false,
  },
  {
    id: "theme",
    gridColumn: "3 / 4",
    gridRow: "4 / 5",
    colorScheme: {
      bg: "",
      accent: "#d4a574",
      border: "",
    },
    borderRadius: "rounded-full",
    hasExpandedView: false,
  },
];

export function getCardConfig(id: string): CardConfig | undefined {
  return CARD_CONFIGS.find((c) => c.id === id);
}
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/card-registry.ts apps/web/src/__tests__/card-registry.test.ts
git commit -m "feat: add card registry with grid positions and color schemes"
git push
```

---

## Task 7: Update BentoCard Component

**Files:**
- Modify: `apps/web/src/components/hub/bento-card.tsx`
- Modify: `apps/web/src/__tests__/widget-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Update `apps/web/src/__tests__/widget-card.test.tsx` (replace the gridArea test and add new tests):

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("BentoCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children", () => {
    render(<BentoCard testId="test-card">Hello</BentoCard>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <BentoCard testId="test-card" onClick={onClick}>
        Content
      </BentoCard>,
    );
    fireEvent.click(screen.getByTestId("test-card"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stops propagation on click", () => {
    const parentClick = vi.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents: test wrapper only
      <div onClick={parentClick}>
        <BentoCard testId="test-card">Content</BentoCard>
      </div>,
    );
    fireEvent.click(screen.getByTestId("test-card"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("has cursor-pointer when onClick is provided", () => {
    const onClick = vi.fn();
    render(
      <BentoCard testId="test-card" onClick={onClick}>
        Content
      </BentoCard>,
    );
    expect(screen.getByTestId("test-card").className).toContain("cursor-pointer");
  });

  it("does not have cursor-pointer without onClick", () => {
    render(<BentoCard testId="test-card">Content</BentoCard>);
    expect(screen.getByTestId("test-card").className).not.toContain("cursor-pointer");
  });

  it("sets gridColumn and gridRow styles", () => {
    render(
      <BentoCard testId="test-card" gridColumn="1 / 3" gridRow="1 / 3">
        Content
      </BentoCard>,
    );
    const el = screen.getByTestId("test-card");
    expect(el.style.gridColumn).toBe("1 / 3");
    expect(el.style.gridRow).toBe("1 / 3");
  });

  it("applies colorScheme bg and border classes", () => {
    render(
      <BentoCard
        testId="test-card"
        colorScheme={{ bg: "bg-gradient-to-br from-sky-500/15", border: "border-sky-500/10" }}
      >
        Content
      </BentoCard>,
    );
    const el = screen.getByTestId("test-card");
    expect(el.className).toContain("bg-gradient-to-br");
    expect(el.className).toContain("border-sky-500/10");
  });

  it("applies custom borderRadius class", () => {
    render(
      <BentoCard testId="test-card" borderRadius="rounded-3xl">
        Content
      </BentoCard>,
    );
    const el = screen.getByTestId("test-card");
    expect(el.className).toContain("rounded-3xl");
  });

  it("uses default rounded-2xl when no borderRadius override", () => {
    render(<BentoCard testId="test-card">Content</BentoCard>);
    const el = screen.getByTestId("test-card");
    expect(el.className).toContain("rounded-2xl");
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because `gridColumn`, `gridRow`, `colorScheme`, `borderRadius` props don't exist yet.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/hub/bento-card.tsx`:

```typescript
import { useThemeStore } from "@/stores/theme-store";
import type { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  testId?: string;
  gridColumn?: string;
  gridRow?: string;
  colorScheme?: {
    bg?: string;
    border?: string;
  };
  borderRadius?: string;
}

export function BentoCard({
  children,
  className = "",
  onClick,
  testId,
  gridColumn,
  gridRow,
  colorScheme,
  borderRadius,
}: BentoCardProps) {
  const isDark = useThemeStore((s) => s.activePaletteId === "midnight");
  const radiusClass = borderRadius ?? "rounded-2xl";

  return (
    <div
      data-testid={testId}
      className={`
        ${radiusClass} p-5 transition-all duration-150 ease-out
        border bg-card
        ${onClick ? "cursor-pointer active:scale-[0.97]" : ""}
        ${colorScheme?.bg ?? ""}
        ${colorScheme?.border ?? ""}
        ${className}
      `}
      style={{
        ...(gridColumn ? { gridColumn } : {}),
        ...(gridRow ? { gridRow } : {}),
        borderColor: colorScheme?.border
          ? undefined
          : isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/bento-card.tsx apps/web/src/__tests__/widget-card.test.tsx
git commit -m "feat: update BentoCard with gridColumn, gridRow, colorScheme, borderRadius props"
git push
```

---

## Task 8: Card Overlay Component

**Files:**
- Create: `apps/web/src/components/hub/card-overlay.tsx`
- Create: `apps/web/src/__tests__/card-overlay.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/card-overlay.test.tsx`:

```typescript
import { CardOverlay } from "@/components/hub/card-overlay";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
  },
}));

describe("CardOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("renders nothing when no card expanded", () => {
    render(<CardOverlay />);
    expect(screen.queryByTestId("card-overlay")).not.toBeInTheDocument();
  });

  it("renders backdrop when a card is expanded", () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    render(<CardOverlay />);
    expect(screen.getByTestId("card-overlay-backdrop")).toBeInTheDocument();
  });

  it("backdrop click calls contractCard", () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    render(<CardOverlay />);

    fireEvent.click(screen.getByTestId("card-overlay-backdrop"));

    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("renders expanded content container when card expanded", () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    render(<CardOverlay />);
    expect(screen.getByTestId("card-overlay-content")).toBeInTheDocument();
  });

  it("clock expanded view is fullscreen with no backdrop", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);
    expect(screen.queryByTestId("card-overlay-backdrop")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-overlay-content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because `card-overlay` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/components/hub/card-overlay.tsx`:

```typescript
import { ArtClock } from "@/components/art-clock/art-clock";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { useRef } from "react";

import { useSwipe } from "@/hooks/use-swipe";

function ExpandedWeather() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Weather</h2>
      <p className="text-muted-foreground">Detailed weather view</p>
    </div>
  );
}

function ExpandedLights() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Lights</h2>
      <p className="text-muted-foreground">Light controls</p>
    </div>
  );
}

function ExpandedMusic() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Music</h2>
      <p className="text-muted-foreground">Music controls</p>
    </div>
  );
}

function ExpandedCalendar() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Calendar</h2>
      <p className="text-muted-foreground">Calendar events</p>
    </div>
  );
}

const EXPANDED_VIEWS: Record<string, () => React.JSX.Element> = {
  weather: ExpandedWeather,
  lights: ExpandedLights,
  music: ExpandedMusic,
  calendar: ExpandedCalendar,
};

export function CardOverlay() {
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);

  useSwipe(contentRef, { onSwipeDown: contractCard }, { enabled: expandedCardId !== null });

  if (!expandedCardId) return null;

  const isClock = expandedCardId === "clock";

  if (isClock) {
    return (
      <div
        data-testid="card-overlay"
        className="fixed inset-0 z-50 bg-background"
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap to dismiss clock overlay */}
        <div
          ref={contentRef}
          data-testid="card-overlay-content"
          className="h-full w-full"
          onClick={contractCard}
        >
          <ArtClock />
        </div>
      </div>
    );
  }

  const ExpandedView = EXPANDED_VIEWS[expandedCardId];

  return (
    <div data-testid="card-overlay" className="fixed inset-0 z-50">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap backdrop to dismiss */}
      <div
        data-testid="card-overlay-backdrop"
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        onClick={contractCard}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          ref={contentRef}
          data-testid="card-overlay-content"
          className="w-[90%] h-[90%] bg-card rounded-2xl border pointer-events-auto overflow-auto transition-all duration-300 ease-out"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {ExpandedView ? <ExpandedView /> : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/card-overlay.tsx apps/web/src/__tests__/card-overlay.test.tsx
git commit -m "feat: add card overlay with expand/contract animation and swipe dismiss"
git push
```

---

## Task 9: Countdown Card (Mini + Expanded)

**Files:**
- Create: `apps/web/src/components/hub/countdown-card.tsx`
- Create: `apps/web/src/__tests__/countdown-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/countdown-card.test.tsx`:

```typescript
import { CountdownCardMini } from "@/components/hub/countdown-card";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("CountdownCardMini", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows next event title and days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        nextEvent={{ id: 1, title: "Coachella W2", date: "2026-04-16", createdAt: "", updatedAt: "" }}
      />,
    );

    expect(screen.getByText("Coachella W2")).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows 'No events' when nextEvent is null", () => {
    render(<CountdownCardMini nextEvent={null} />);
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("shows 'Today' when event is today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        nextEvent={{ id: 1, title: "Today Event", date: "2026-04-11", createdAt: "", updatedAt: "" }}
      />,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows '1 day' for tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        nextEvent={{ id: 1, title: "Tomorrow Event", date: "2026-04-12", createdAt: "", updatedAt: "" }}
      />,
    );

    expect(screen.getByText("1 day")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because `countdown-card` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/components/hub/countdown-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Calendar } from "lucide-react";

interface CountdownEvent {
  id: number;
  title: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDaysRemaining(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

interface CountdownCardMiniProps {
  nextEvent: CountdownEvent | null;
}

export function CountdownCardMini({ nextEvent }: CountdownCardMiniProps) {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("countdown");

  return (
    <BentoCard
      testId="widget-card-countdown"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      onClick={() => expandCard("countdown")}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Countdown</span>
          </div>
          {nextEvent ? (
            <>
              <div className="text-sm font-medium text-foreground truncate">
                {nextEvent.title}
              </div>
              <div className="text-2xl font-light text-foreground mt-1">
                {formatDaysRemaining(daysUntil(nextEvent.date))}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground/50">No events</div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

export function CountdownCardExpanded() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-light text-foreground">Countdown</h2>
      </div>
      <p className="text-muted-foreground">
        Countdown events will be loaded from the API.
      </p>
    </div>
  );
}
```

Note: The `CountdownCardExpanded` is a minimal placeholder. The full expanded view with tRPC queries, add/edit/delete, and upcoming/past toggle will be built in Task 12 after the grid is wired up and working.

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/countdown-card.tsx apps/web/src/__tests__/countdown-card.test.tsx
git commit -m "feat: add countdown card mini view with days remaining"
git push
```

---

## Task 10: Placeholder Cards (Email, Photo, Quote, System Status)

**Files:**
- Create: `apps/web/src/components/hub/email-card.tsx`
- Create: `apps/web/src/components/hub/photo-card.tsx`
- Create: `apps/web/src/components/hub/quote-card.tsx`
- Create: `apps/web/src/components/hub/system-status-card.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/placeholder-cards.test.tsx`:

```typescript
import { EmailCard } from "@/components/hub/email-card";
import { PhotoCard } from "@/components/hub/photo-card";
import { QuoteCard } from "@/components/hub/quote-card";
import { SystemStatusCard } from "@/components/hub/system-status-card";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("Placeholder cards", () => {
  afterEach(() => {
    cleanup();
  });

  it("EmailCard renders with test id and unread count", () => {
    render(<EmailCard />);
    expect(screen.getByTestId("widget-card-email")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("PhotoCard renders with test id", () => {
    render(<PhotoCard />);
    expect(screen.getByTestId("widget-card-photo")).toBeInTheDocument();
  });

  it("QuoteCard renders with test id and quote text", () => {
    render(<QuoteCard />);
    expect(screen.getByTestId("widget-card-quote")).toBeInTheDocument();
  });

  it("SystemStatusCard renders with test id and uptime", () => {
    render(<SystemStatusCard />);
    expect(screen.getByTestId("widget-card-system")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because none of the placeholder card files exist.

- [ ] **Step 3: Write minimal implementations**

Create `apps/web/src/components/hub/email-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Mail } from "lucide-react";

export function EmailCard() {
  const config = getCardConfig("email");

  return (
    <BentoCard
      testId="widget-card-email"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mail size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <div className="text-lg font-light text-foreground">3 unread</div>
        </div>
      </div>
    </BentoCard>
  );
}
```

Create `apps/web/src/components/hub/photo-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Image } from "lucide-react";

export function PhotoCard() {
  const config = getCardConfig("photo");

  return (
    <BentoCard
      testId="widget-card-photo"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      borderRadius={config?.borderRadius}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <Image size={20} className="text-muted-foreground/50 mb-2" />
        <span className="text-xs text-muted-foreground/40">Photo Frame</span>
      </div>
    </BentoCard>
  );
}
```

Create `apps/web/src/components/hub/quote-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Quote } from "lucide-react";

export function QuoteCard() {
  const config = getCardConfig("quote");

  return (
    <BentoCard
      testId="widget-card-quote"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      borderRadius={config?.borderRadius}
    >
      <div className="flex items-start gap-3">
        <Quote size={14} className="text-muted-foreground/40 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-foreground/80 italic leading-relaxed">
            The best way to predict the future is to invent it.
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2">Alan Kay</p>
        </div>
      </div>
    </BentoCard>
  );
}
```

Create `apps/web/src/components/hub/system-status-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Activity } from "lucide-react";

export function SystemStatusCard() {
  const config = getCardConfig("system");

  return (
    <BentoCard
      testId="widget-card-system"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <Activity size={14} className="text-muted-foreground" />
              <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">System</span>
          </div>
          <div className="text-xs text-muted-foreground/70">All systems OK</div>
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/email-card.tsx apps/web/src/components/hub/photo-card.tsx apps/web/src/components/hub/quote-card.tsx apps/web/src/components/hub/system-status-card.tsx apps/web/src/__tests__/placeholder-cards.test.tsx
git commit -m "feat: add email, photo, quote, and system status placeholder cards"
git push
```

---

## Task 11: Update Existing Cards (Expand Pattern + Colors)

**Files:**
- Modify: `apps/web/src/components/hub/weather-card.tsx`
- Modify: `apps/web/src/components/hub/clock-card.tsx`
- Modify: `apps/web/src/components/hub/wifi-card.tsx`
- Modify: `apps/web/src/components/hub/lights-card.tsx`
- Modify: `apps/web/src/components/hub/calendar-card.tsx`
- Modify: `apps/web/src/components/hub/music-card.tsx`
- Modify: `apps/web/src/components/hub/theme-toggle-card.tsx`
- Create: `apps/web/src/__tests__/card-expand-behavior.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/__tests__/card-expand-behavior.test.tsx`:

```typescript
import { CalendarCard } from "@/components/hub/calendar-card";
import { ClockCard } from "@/components/hub/clock-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { WeatherCard } from "@/components/hub/weather-card";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("card expand behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("weather card tap calls expandCard with 'weather'", () => {
    render(<WeatherCard temp={72} condition="Sunny" high={78} low={64} />);
    fireEvent.click(screen.getByTestId("widget-card-weather"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("weather");
  });

  it("clock card tap calls expandCard with 'clock'", () => {
    render(<ClockCard />);
    fireEvent.click(screen.getByTestId("widget-card-clock"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });

  it("lights card tap calls expandCard with 'lights'", () => {
    render(<LightsCard />);
    fireEvent.click(screen.getByTestId("widget-card-lights"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("lights");
  });

  it("calendar card tap calls expandCard with 'calendar'", () => {
    render(<CalendarCard />);
    fireEvent.click(screen.getByTestId("widget-card-calendar"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("calendar");
  });

  it("music card tap calls expandCard with 'music'", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByTestId("widget-card-music"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("music");
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because existing cards still use `useNavigationStore` and `gridArea`, not `useCardExpansionStore` and `expandCard`.

- [ ] **Step 3: Update WeatherCard**

Replace `apps/web/src/components/hub/weather-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { CloudSun } from "lucide-react";

interface WeatherCardProps {
  temp: number;
  condition: string;
  high: number;
  low: number;
}

export function WeatherCard({ temp, condition, high, low }: WeatherCardProps) {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("weather");

  return (
    <BentoCard
      testId="widget-card-weather"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      onClick={() => expandCard("weather")}
      className="relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-5xl font-light text-foreground tracking-tight">
            {temp}°
          </span>
          <div className="mt-1 flex items-center gap-2">
            <CloudSun size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{condition}</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground mt-2">
          <div>H: {high}°</div>
          <div>L: {low}°</div>
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 4: Update ClockCard**

Replace `apps/web/src/components/hub/clock-card.tsx`:

```typescript
import { formatTime } from "@/components/art-clock/art-clock";
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

export function ClockCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("clock");
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);

  const date = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <BentoCard
      testId="widget-card-clock"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      onClick={() => expandCard("clock")}
      className="flex flex-col items-center justify-center"
    >
      <div className="text-center">
        <div className="text-4xl font-light tracking-tight text-foreground font-mono">
          <span>{hours}</span>
          <span className="animate-[pulse-colon_2s_ease-in-out_infinite]">:</span>
          <span>{minutes}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
          {period}
        </div>
      </div>
      <div className="text-xs text-muted-foreground/60 mt-3">{date}</div>
    </BentoCard>
  );
}
```

- [ ] **Step 5: Update WifiCard**

Replace `apps/web/src/components/hub/wifi-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Check, Copy, Eye, EyeOff, Wifi } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

const WIFI_SSID = "HomeNet";
const WIFI_PASSWORD = "welcome2024";
const WIFI_ENCRYPTION = "WPA";
const AUTO_FLIP_BACK_MS = 300_000;

function generateWifiUri(ssid: string, password: string, encryption: string): string {
  return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
}

export function WifiCard() {
  const config = getCardConfig("wifi");
  const [flipped, setFlipped] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const uri = generateWifiUri(WIFI_SSID, WIFI_PASSWORD, WIFI_ENCRYPTION);
    QRCode.toString(uri, {
      type: "svg",
      width: 80,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrSvg);
  }, []);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(WIFI_PASSWORD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    if (flipped) {
      setCountdown(Math.ceil(AUTO_FLIP_BACK_MS / 1000));
      const tick = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setFlipped(false);
            setShowPassword(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(tick);
    }
    setCountdown(0);
  }, [flipped]);

  const handleFlip = () => {
    setFlipped(!flipped);
    if (flipped) setShowPassword(false);
  };

  return (
    <div
      data-testid="widget-card-wifi"
      className="[perspective:600px]"
      style={{
        gridColumn: config?.gridColumn,
        gridRow: config?.gridRow,
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <BentoCard testId="widget-card-wifi-front" onClick={handleFlip} className="h-full">
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <Wifi size={16} className="text-foreground" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">WiFi</span>
                </div>
                <div className="text-sm font-medium text-foreground">{WIFI_SSID}</div>
              </div>
              <div className="text-[10px] text-muted-foreground/40 mt-2">tap to share</div>
            </div>
          </BentoCard>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <BentoCard
            testId="widget-card-wifi-back"
            onClick={handleFlip}
            className="relative h-full overflow-hidden"
          >
            <div className="flex flex-col justify-between h-full">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Wifi size={12} className="text-accent" />
                  <span className="text-xs font-medium text-foreground">{WIFI_SSID}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {showPassword ? WIFI_PASSWORD : "\u2022".repeat(WIFI_PASSWORD.length)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={10} className="text-muted-foreground" />
                    ) : (
                      <Eye size={10} className="text-muted-foreground" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="
                    w-full py-1.5 rounded-lg text-[11px] font-medium
                    bg-accent/15 text-accent hover:bg-accent/25
                    transition-colors flex items-center justify-center gap-1
                  "
                >
                  {copied ? (
                    <>
                      <Check size={10} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  className="rounded-md overflow-hidden bg-white p-1"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: QR SVG from trusted qrcode library
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
            </div>
            {countdown > 0 && (
              <span className="absolute bottom-2 right-3 font-mono text-[10px] tabular-nums text-muted-foreground/25">
                {countdown}
              </span>
            )}
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update LightsCard**

Replace `apps/web/src/components/hub/lights-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

interface Room {
  name: string;
  on: boolean;
}

const PLACEHOLDER_ROOMS: Room[] = [
  { name: "Living", on: true },
  { name: "Kitchen", on: true },
  { name: "Bedroom", on: false },
  { name: "Office", on: true },
  { name: "Bathroom", on: false },
];

export function LightsCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("lights");
  const onCount = PLACEHOLDER_ROOMS.filter((r) => r.on).length;
  const total = PLACEHOLDER_ROOMS.length;

  return (
    <BentoCard
      testId="widget-card-lights"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      onClick={() => expandCard("lights")}
    >
      <div>
        <div className="text-sm text-muted-foreground mb-2">Lights</div>
        <div className="text-lg font-light text-foreground">
          {onCount} of {total} on
        </div>
        <div className="flex gap-1.5 mt-2">
          {PLACEHOLDER_ROOMS.map((room) => (
            <div
              key={room.name}
              className={`w-2 h-2 rounded-full ${room.on ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" : "bg-muted-foreground/20"}`}
              title={room.name}
            />
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 7: Update CalendarCard**

Replace `apps/web/src/components/hub/calendar-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

interface CalendarEvent {
  title: string;
  time: string;
  color: string;
}

const PLACEHOLDER_EVENT: CalendarEvent | null = {
  title: "Team standup",
  time: "in 2h",
  color: "#d4a574",
};

export function CalendarCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("calendar");
  const event = PLACEHOLDER_EVENT;

  return (
    <BentoCard
      testId="widget-card-calendar"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      onClick={() => expandCard("calendar")}
      className="relative overflow-hidden"
    >
      {event && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: event.color }}
        />
      )}
      <div className="pl-2">
        <div className="text-sm text-muted-foreground mb-2">Calendar</div>
        {event ? (
          <>
            <div className="text-sm font-medium text-foreground truncate">
              {event.title}
            </div>
            <div className="text-xs text-muted-foreground/70 mt-1">
              {event.time}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground/50">No events</div>
        )}
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 8: Update MusicCard**

Replace `apps/web/src/components/hub/music-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Pause, Play } from "lucide-react";

interface MusicState {
  playing: boolean;
  track: string;
  artist: string;
}

const PLACEHOLDER_MUSIC: MusicState = {
  playing: false,
  track: "Not playing",
  artist: "",
};

function EqualizerBars({ active }: { active: boolean }) {
  const barHeights = [60, 100, 40, 80];

  return (
    <div className="flex items-end gap-0.5 h-4">
      {barHeights.map((height, i) => (
        <div
          key={height}
          className={`
            w-[3px] rounded-full bg-accent transition-all
            ${active ? "animate-[equalizer_1s_ease-in-out_infinite]" : ""}
          `}
          style={{
            height: active ? undefined : "3px",
            animationDelay: active ? `${i * 0.15}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function MusicCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("music");
  const music = PLACEHOLDER_MUSIC;

  return (
    <BentoCard
      testId="widget-card-music"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      onClick={() => expandCard("music")}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Music</div>
            <EqualizerBars active={music.playing} />
          </div>
          <div className="text-sm text-foreground truncate">{music.track}</div>
          {music.artist && (
            <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
              {music.artist}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          {music.playing ? (
            <Pause size={14} className="text-muted-foreground" />
          ) : (
            <Play size={14} className="text-muted-foreground" />
          )}
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 9: Update ThemeToggleCard**

Replace `apps/web/src/components/hub/theme-toggle-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useThemeStore } from "@/stores/theme-store";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleCard() {
  const activePaletteId = useThemeStore((s) => s.activePaletteId);
  const setActivePalette = useThemeStore((s) => s.setActivePalette);
  const config = getCardConfig("theme");
  const isDark = activePaletteId === "midnight";

  const toggle = () => {
    const next = isDark ? "daylight" : "midnight";
    setActivePalette(next);
    localStorage.setItem("theme-mode", next);
  };

  return (
    <BentoCard
      testId="widget-card-theme"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{ bg: config?.colorScheme.bg, border: config?.colorScheme.border }}
      borderRadius={config?.borderRadius}
      onClick={toggle}
      className="flex flex-col items-center justify-center"
    >
      <div
        className="transition-transform duration-300 ease-out"
        style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
      >
        {isDark ? (
          <Moon size={24} className="text-foreground" />
        ) : (
          <Sun size={24} className="text-foreground" />
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
        {isDark ? "Dark" : "Light"}
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 10: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: PASS (some existing tests may need minor updates if they check gridArea, handled in Task 13)

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/hub/weather-card.tsx apps/web/src/components/hub/clock-card.tsx apps/web/src/components/hub/wifi-card.tsx apps/web/src/components/hub/lights-card.tsx apps/web/src/components/hub/calendar-card.tsx apps/web/src/components/hub/music-card.tsx apps/web/src/components/hub/theme-toggle-card.tsx apps/web/src/__tests__/card-expand-behavior.test.tsx
git commit -m "feat: update existing cards with expansion pattern and color schemes"
git push
```

---

## Task 12: Countdown Card Expanded View (Full tRPC Integration)

**Files:**
- Modify: `apps/web/src/components/hub/countdown-card.tsx`
- Modify: `apps/web/src/components/hub/card-overlay.tsx`

- [ ] **Step 1: Write the expanded view**

Replace the `CountdownCardExpanded` in `apps/web/src/components/hub/countdown-card.tsx` with the full implementation:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Calendar, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

interface CountdownEvent {
  id: number;
  title: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDaysRemaining(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatDaysPast(days: number): string {
  const absDays = Math.abs(days);
  if (absDays === 0) return "Today";
  if (absDays === 1) return "1 day ago";
  return `${absDays} days ago`;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CountdownCardMiniProps {
  nextEvent: CountdownEvent | null;
}

export function CountdownCardMini({ nextEvent }: CountdownCardMiniProps) {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("countdown");

  return (
    <BentoCard
      testId="widget-card-countdown"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={() => expandCard("countdown")}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Countdown</span>
          </div>
          {nextEvent ? (
            <>
              <div className="text-sm font-medium text-foreground truncate">
                {nextEvent.title}
              </div>
              <div className="text-2xl font-light text-foreground mt-1">
                {formatDaysRemaining(daysUntil(nextEvent.date))}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground/50">No events</div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

export function CountdownCardExpanded() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");

  const utils = trpc.useUtils();
  const upcoming = trpc.countdownEvents.listUpcoming.useQuery();
  const past = trpc.countdownEvents.listPast.useQuery();
  const createMutation = trpc.countdownEvents.create.useMutation({
    onSuccess: () => {
      utils.countdownEvents.listUpcoming.invalidate();
      utils.countdownEvents.listPast.invalidate();
      setShowForm(false);
      setFormTitle("");
      setFormDate("");
    },
  });
  const removeMutation = trpc.countdownEvents.remove.useMutation({
    onSuccess: () => {
      utils.countdownEvents.listUpcoming.invalidate();
      utils.countdownEvents.listPast.invalidate();
    },
  });

  const events = tab === "upcoming" ? upcoming.data : past.data;
  const isLoading = tab === "upcoming" ? upcoming.isLoading : past.isLoading;

  const handleSave = () => {
    if (!formTitle.trim() || !formDate) return;
    createMutation.mutate({ title: formTitle.trim(), date: formDate });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-light text-foreground">Countdown</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <Plus size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            tab === "upcoming"
              ? "bg-accent/15 text-accent"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            tab === "past"
              ? "bg-accent/15 text-accent"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Past
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-lg bg-muted/50 space-y-3">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Event title"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormTitle("");
                setFormDate("");
              }}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-1">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        {events?.map((event) => {
          const days = daysUntil(event.date);
          return (
            <div
              key={event.id}
              className="flex items-center justify-between py-3 border-b border-border/50"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </div>
                <div className="text-xs text-muted-foreground/70">
                  {formatEventDate(event.date)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm text-muted-foreground">
                  {days >= 0 ? formatDaysRemaining(days) : formatDaysPast(days)}
                </span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate({ id: event.id })}
                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} className="text-muted-foreground/50" />
                </button>
              </div>
            </div>
          );
        })}
        {!isLoading && events?.length === 0 && (
          <p className="text-sm text-muted-foreground/50">No events</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register countdown expanded view in CardOverlay**

Update `apps/web/src/components/hub/card-overlay.tsx` to import and register the countdown expanded view:

Add import:
```typescript
import { CountdownCardExpanded } from "@/components/hub/countdown-card";
```

Add to `EXPANDED_VIEWS`:
```typescript
countdown: CountdownCardExpanded,
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/hub/countdown-card.tsx apps/web/src/components/hub/card-overlay.tsx
git commit -m "feat: add countdown card expanded view with tRPC CRUD integration"
git push
```

---

## Task 13: Update WidgetGrid (6-Column Bento Layout)

**Files:**
- Modify: `apps/web/src/components/hub/widget-grid.tsx`
- Modify: `apps/web/src/__tests__/widget-grid.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace `apps/web/src/__tests__/widget-grid.test.tsx`:

```typescript
import { WidgetGrid } from "@/components/hub/widget-grid";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
  },
}));

describe("WidgetGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("renders all 12 widget cards", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("widget-card-weather")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-countdown")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-photo")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-wifi")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-email")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-system")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-quote")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-theme")).toBeInTheDocument();
  });

  it("uses 6-column grid layout", () => {
    render(<WidgetGrid />);

    const grid = screen.getByTestId("widget-grid");
    expect(grid.style.gridTemplateColumns).toBe("repeat(6, 1fr)");
  });

  it("renders weather data", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("72\u00b0")).toBeInTheDocument();
    expect(screen.getByText("Partly Cloudy")).toBeInTheDocument();
  });

  it("renders clock with current time", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
  });

  it("has hub-container and widget-grid test IDs", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("hub-container")).toBeInTheDocument();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd apps/web && bun run test
```

Expected: FAIL because WidgetGrid still uses 3-column layout and doesn't have all 12 cards.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/hub/widget-grid.tsx`:

```typescript
import { CalendarCard } from "@/components/hub/calendar-card";
import { ClockCard } from "@/components/hub/clock-card";
import { CountdownCardMini } from "@/components/hub/countdown-card";
import { EmailCard } from "@/components/hub/email-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { PhotoCard } from "@/components/hub/photo-card";
import { QuoteCard } from "@/components/hub/quote-card";
import { SystemStatusCard } from "@/components/hub/system-status-card";
import { ThemeToggleCard } from "@/components/hub/theme-toggle-card";
import { WeatherCard } from "@/components/hub/weather-card";
import { WifiCard } from "@/components/hub/wifi-card";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

const IDLE_TIMEOUT_MS = 45_000;

export function WidgetGrid() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);

  const { remainingSeconds } = useIdleTimeout(
    () => expandCard("clock"),
    IDLE_TIMEOUT_MS,
    { enabled: expandedCardId === null },
  );

  return (
    <div data-testid="hub-container" className="relative h-full bg-background">
      <div
        data-testid="widget-grid"
        className="relative grid gap-3 p-5 h-full"
        style={{
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: "repeat(4, 1fr)",
        }}
      >
        <WeatherCard temp={72} condition="Partly Cloudy" high={78} low={64} />
        <ClockCard />
        <CountdownCardMini nextEvent={null} />
        <PhotoCard />
        <WifiCard />
        <LightsCard />
        <MusicCard />
        <CalendarCard />
        <EmailCard />
        <SystemStatusCard />
        <QuoteCard />
        <ThemeToggleCard />
      </div>
      <span className="absolute bottom-2 left-3 font-mono text-xs tabular-nums text-muted-foreground/30">
        {remainingSeconds}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/widget-grid.tsx apps/web/src/__tests__/widget-grid.test.tsx
git commit -m "feat: update widget grid to 6-column bento layout with 12 cards"
git push
```

---

## Task 14: Update HomePage and Tests

**Files:**
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/__tests__/home-page.test.tsx`
- Modify: `apps/web/src/__tests__/home-page-hub.test.tsx`

- [ ] **Step 1: Update the tests**

Replace `apps/web/src/__tests__/home-page.test.tsx`:

```typescript
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
  },
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("renders widget grid", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });

  it("renders clock time in clock card", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
  });
});
```

Replace `apps/web/src/__tests__/home-page-hub.test.tsx`:

```typescript
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
  },
}));

describe("HomePage hub integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  async function renderHomePage() {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    return render(<HomePage />);
  }

  it("shows grid on initial render", async () => {
    await renderHomePage();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });

  it("no overlay initially", async () => {
    await renderHomePage();
    expect(screen.queryByTestId("card-overlay")).not.toBeInTheDocument();
  });

  it("tapping weather card opens overlay", async () => {
    await renderHomePage();

    fireEvent.click(screen.getByTestId("widget-card-weather"));

    expect(useCardExpansionStore.getState().expandedCardId).toBe("weather");
  });

  it("auto-expands clock after idle timeout", async () => {
    await renderHomePage();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });

  it("idle timer only active when no card is expanded", async () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    await renderHomePage();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(useCardExpansionStore.getState().expandedCardId).toBe("weather");
  });
});
```

- [ ] **Step 2: Update index.tsx**

Replace `apps/web/src/routes/index.tsx`:

```typescript
import { CardOverlay } from "@/components/hub/card-overlay";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative h-full">
      <WidgetGrid />
      <CardOverlay />
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && bun run test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/index.tsx apps/web/src/__tests__/home-page.test.tsx apps/web/src/__tests__/home-page-hub.test.tsx
git commit -m "refactor: simplify HomePage with card overlay pattern"
git push
```

---

## Task 15: Cleanup (Delete Old Files, Remove Navigation Store)

**Files:**
- Delete: `apps/web/src/stores/navigation-store.ts`
- Delete: `apps/web/src/__tests__/navigation-store.test.ts`
- Delete: `apps/web/src/components/hub/widget-card.tsx`

- [ ] **Step 1: Verify no remaining imports of navigation-store**

```bash
cd apps/web && grep -r "navigation-store" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results (all references removed in prior tasks). If any remain, update those files first.

- [ ] **Step 2: Delete files**

```bash
rm apps/web/src/stores/navigation-store.ts
rm apps/web/src/__tests__/navigation-store.test.ts
rm apps/web/src/components/hub/widget-card.tsx
```

- [ ] **Step 3: Rename widget-card.test.tsx to bento-card.test.tsx**

Since `widget-card.test.tsx` now tests `BentoCard` (updated in Task 7), rename for clarity:

```bash
mv apps/web/src/__tests__/widget-card.test.tsx apps/web/src/__tests__/bento-card.test.tsx
```

- [ ] **Step 4: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: PASS (all tests pass, no broken imports)

- [ ] **Step 5: Run lint and type check**

```bash
cd apps/web && bun run lint:fix && bunx tsc --noEmit
cd apps/api && bun run lint:fix && bunx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove navigation store and unused widget-card component"
git push
```

---

## Self-Review Checklist

### Spec Coverage
- [x] 6-column bento grid layout (Task 13)
- [x] Mixed card sizes via card registry (Task 6)
- [x] Per-card color identities (Tasks 6, 11)
- [x] Card expansion store replacing navigation store (Task 5)
- [x] Card overlay with expand/contract (Task 8)
- [x] Clock as idle state via expansion (Tasks 13, 14)
- [x] Countdown events full stack: schema (Task 1), service (Task 2), router (Task 3), seed (Task 4)
- [x] Countdown card mini view (Task 9)
- [x] Countdown card expanded view with CRUD (Task 12)
- [x] Placeholder cards: email, photo, quote, system (Task 10)
- [x] WiFi keeps 3D flip, no expanded view (Task 11)
- [x] Theme toggle, no expanded view (Task 11)
- [x] Updated BentoCard props (Task 7)
- [x] Simplified HomePage (Task 14)
- [x] Delete navigation store, widget-card (Task 15)
- [x] Swipe-down dismiss on overlay (Task 8)
- [x] Clock fullscreen with no backdrop (Task 8)

### Placeholder Scan
- [x] No "TBD" or "TODO" in plan steps
- [x] All code is complete in each step

### Type Consistency
- [x] `CardConfig`, `CardColorScheme` used consistently
- [x] `CountdownEvent` type matches schema output
- [x] Store types match across tests and implementation

### TDD Compliance
- [x] Every task with implementation starts with a failing test step
- [x] Test-first for: schema (T1), service (T2), router (T3), expansion store (T5), registry (T6), BentoCard (T7), overlay (T8), countdown card (T9), placeholder cards (T10), widget grid (T13), HomePage (T14)
