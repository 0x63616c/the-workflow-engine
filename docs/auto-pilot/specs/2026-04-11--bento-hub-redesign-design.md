# Bento Hub Redesign Design Spec

## Overview

Transform the current uniform 3x3 hub grid into a varied bento layout with mixed card sizes, unique per-card color identities, and shape treatments. Add countdown events as a full-stack feature (DB through UI). Replace the clock/hub view toggle with a unified expand/contract overlay pattern where every card (including clock) lives on the grid and expands into an overlay on tap. Add four placeholder cards (email, photo frame, quote, system status).

## Assumptions

Decisions made autonomously (not specified in alignment doc):

- **Grid is 6-column base** (not 5). 6 divides evenly and gives more layout flexibility for 1x1, 2x1, 1x2, 2x2 cards on iPad 4:3.
- **Grid rows: 4 rows** to accommodate 12+ cards in the bento layout (6 cols x 4 rows = 24 cells, cards fill ~18-20 cells with varied sizes).
- **Card expansion store** (`useCardExpansionStore`) replaces `useNavigationStore`. Tracks which card ID is expanded (or null). Only one card expanded at a time.
- **Expansion animation**: CSS transform scale + position transition from card's DOM rect to near-fullscreen overlay. No route change, no React portals needed. Use a fixed overlay div that renders the expanded content.
- **Idle timeout moves to expansion store**: 45s idle while no card is expanded triggers clock card expansion. While clock card is expanded, 45s idle contracts it back (matching current behavior where idle on hub goes to clock, idle on clock stays).
- **Card color identities** are defined as static config objects (background gradient, accent color, border treatment) per card type. Not stored in theme store, just co-located with each card.
- **Countdown events seed data** is a migration seed script (separate from schema migration), run via `bun run db:seed`.
- **Countdown event dates stored as ISO 8601 date strings** (YYYY-MM-DD) in SQLite text column, not unix timestamps. These are calendar dates, not moments in time.
- **Expanded card overlay is 90% viewport** with rounded corners, centered, with a dimmed backdrop. Not truly fullscreen.
- **Clock expanded view is 100% viewport** (special case, matches current art clock fullscreen feel). No rounded corners, no backdrop dimming.
- **Swipe down on expanded overlay dismisses** it (reuse existing `useSwipe` hook).
- **BentoCard updated in-place** (not a new component). Add size/color/shape variant props.
- **WiFi card keeps its 3D flip** on the grid. Tap-to-expand is a separate interaction (long-press or expand icon). For simplicity, WiFi card tap continues to flip. An expand button in the corner opens the overlay. This matches alignment doc saying "keep 3D flip on hub card."
- **Theme toggle card** stays as a simple toggle on the grid with no expanded view. Tap toggles theme directly.
- **Placeholder cards** show static/hardcoded data. No API calls, no stores. Just presentational components.

## Architecture

### State Management

**Remove `useNavigationStore`** entirely. Replace with:

```typescript
// apps/web/src/stores/card-expansion-store.ts
interface CardExpansionState {
  expandedCardId: string | null;
}

interface CardExpansionActions {
  expandCard: (id: string) => void;
  contractCard: () => void;
}
```

The hub is always the base view. When `expandedCardId` is null, the grid is fully interactive. When a card is expanded, the grid is visible but dimmed beneath the overlay.

### Card Registry

Each card declares its grid placement, size, color identity, and whether it has an expanded view:

```typescript
// apps/web/src/components/hub/card-registry.ts
interface CardConfig {
  id: string;
  gridColumn: string;    // CSS grid-column value, e.g. "1 / 3" (span 2)
  gridRow: string;       // CSS grid-row value, e.g. "1 / 2" (span 1)
  colorScheme: {
    bg: string;          // Tailwind classes for background
    accent: string;      // Hex color for accents
    border: string;      // Border treatment classes
  };
  borderRadius?: string; // Override default (for unique shapes)
  hasExpandedView: boolean;
}
```

This is a plain array, not a dynamic registry. Cards are statically known.

### Grid Layout (Bento)

6-column, 4-row CSS Grid. Target resolution 2732x2048 (iPad Pro 12.9" 4:3).

```
Layout (6 cols x 4 rows):
+----------+----------+-----+-----+-----+-----+
| Weather  | Weather  |Clock|Clock|Count|Count|
| (2x2)    | (2x2)    |(2x2)|(2x2)|down |down |
+----------+----------+-----+-----+(2x1)+(2x1)+
|          |          |     |     |     |     |
+-----+----+-----+----+-----+-----+-----+-----+
|WiFi |Lite|Music|Cal |Email|Photo|
|(1x1)|(1x1)|(1x1)|(1x1)|(1x1)|(1x1)|
+-----+-----+-----+-----+-----+-----+
|Quote|Sys  |Theme|     |     |     |
|(1x1)|(1x1)|(1x1)|     |     |     |
+-----+-----+-----+-----+-----+-----+
```

Refined layout assignments:

| Card           | Size | Grid Column | Grid Row | Notes |
|----------------|------|-------------|----------|-------|
| Weather        | 2x2  | 1 / 3       | 1 / 3    | Large hero card, top-left |
| Clock          | 2x2  | 3 / 5       | 1 / 3    | Live mini clock, center top |
| Countdown      | 2x1  | 5 / 7       | 1 / 2    | Next event + days remaining |
| Photo Frame    | 2x1  | 5 / 7       | 2 / 3    | Static gradient/image |
| WiFi           | 1x1  | 1 / 2       | 3 / 4    | 3D flip card |
| Lights         | 1x1  | 2 / 3       | 3 / 4    | Colored dots |
| Music          | 1x1  | 3 / 4       | 3 / 4    | Equalizer bars |
| Calendar       | 1x1  | 4 / 5       | 3 / 4    | Next event |
| Email          | 1x1  | 5 / 6       | 3 / 4    | Unread count |
| System Status  | 1x1  | 6 / 7       | 3 / 4    | Uptime indicator |
| Quote          | 2x1  | 1 / 3       | 4 / 5    | Quote of the day |
| Theme Toggle   | 1x1  | 3 / 4       | 4 / 5    | Sun/moon toggle |

13 cards total. Row 4 has some empty cells (cols 4-6), providing visual breathing room.

### Card Expansion Overlay

```typescript
// apps/web/src/components/hub/card-overlay.tsx
```

A fixed-position overlay that:
1. Renders when `expandedCardId !== null`
2. Shows a dimmed backdrop (click/tap backdrop = dismiss)
3. Contains the expanded card content (animated from card position to center)
4. Supports swipe-down to dismiss

The overlay does NOT use React portals. It's a sibling div to the grid, positioned fixed over the viewport.

**Animation approach**: CSS transitions on transform/opacity. When expanding:
- Card's bounding rect is captured via `ref.getBoundingClientRect()`
- Overlay starts at that position/size, transitions to final position
- 300ms ease-out transition

**Expanded content**: Each card that has an expanded view exports both a `MiniView` (grid) and `ExpandedView` component. The overlay renders the appropriate `ExpandedView`.

### Countdown Events (Full Stack)

#### Database Layer

```typescript
// apps/api/src/db/schema.ts (add to existing)
export const countdownEvents = sqliteTable("countdown_events", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  date: text().notNull(), // ISO 8601 date: "YYYY-MM-DD"
  createdAt: text().notNull().default(sql`(datetime('now'))`),
  updatedAt: text().notNull().default(sql`(datetime('now'))`),
});
```

#### Service Layer

```typescript
// apps/api/src/services/countdown-events.ts
interface CountdownEventInput {
  title: string;
  date: string; // "YYYY-MM-DD"
}

// Functions:
// - listUpcoming(db): events where date >= today, ordered by date ASC
// - listPast(db): events where date < today, ordered by date DESC
// - getById(db, id): single event
// - create(db, input): insert, return created
// - update(db, id, input): update title/date, set updatedAt
// - remove(db, id): delete by id
```

All functions take `db` as first argument (dependency injection, matches clean architecture). No direct imports of db client in service.

#### tRPC Router

```typescript
// apps/api/src/trpc/routers/countdown-events.ts
// Thin wrapper calling service functions with ctx.db
// Procedures:
//   listUpcoming: query
//   listPast: query
//   getById: query (input: { id: number })
//   create: mutation (input: { title: string, date: string })
//   update: mutation (input: { id: number, title: string, date: string })
//   remove: mutation (input: { id: number })
```

Zod validation on all inputs. Date validated as `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`.

#### Seed Script

```typescript
// apps/api/src/db/seed-countdown-events.ts
// Imports db client, inserts all 44 events from alignment doc
// Run: bun run apps/api/src/db/seed-countdown-events.ts
// Add "db:seed" script to apps/api/package.json
```

#### Frontend

**Hub card (mini view)**: Shows title of next upcoming event and "X days" remaining. If no upcoming events, shows "No events".

**Expanded view**: 
- Header with "Countdown" title
- Toggle for "Upcoming" / "Past" (default: upcoming)
- Scrollable list of events, each showing: title, date formatted as "Mon DD, YYYY", days remaining (or "X days ago")
- Add button (opens inline form at top)
- Each event has edit/delete actions (swipe or icon buttons)
- Form: title text input + date picker input

Uses `trpc.countdownEvents.listUpcoming.useQuery()` and `trpc.countdownEvents.listPast.useQuery()` with TanStack Query. Mutations invalidate queries on success.

### Existing Cards (Visual Refresh)

Each card gets a `colorScheme` prop applied through the updated `BentoCard`:

| Card     | Background                    | Accent  | Shape Treatment |
|----------|-------------------------------|---------|-----------------|
| Weather  | Gradient by condition         | Sky blue| Default radius  |
| Clock    | Subtle dark/light background  | Gold    | Default radius  |
| Countdown| Deep purple gradient          | Violet  | Default radius  |
| WiFi     | Current (keep 3D flip)        | Green   | Default radius  |
| Lights   | Warm amber tint               | Amber   | Default radius  |
| Calendar | Left-bar accent (keep)        | Coral   | Default radius  |
| Music    | Dark slate gradient           | Cyan    | Default radius  |
| Email    | Light blue tint               | Blue    | Default radius  |
| Photo    | Gradient placeholder          | Rose    | Rounded-3xl     |
| Quote    | Subtle paper texture bg       | Sage    | Rounded-3xl     |
| Theme    | Current adaptive              | Current | Rounded-full (pill) |
| System   | Subtle green tint             | Green   | Default radius  |

### Updated BentoCard Component

```typescript
interface BentoCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  testId?: string;
  gridColumn?: string;
  gridRow?: string;
  colorScheme?: {
    bg?: string;       // Additional bg classes
    border?: string;   // Border color/style
  };
  borderRadius?: string; // Tailwind border-radius class override
}
```

Replaces `gridArea` with `gridColumn`/`gridRow` for the new layout.

### HomePage Changes

The `index.tsx` route simplifies significantly:

```typescript
function HomePage() {
  return (
    <div className="relative h-full">
      <WidgetGrid />
      <CardOverlay />
    </div>
  );
}
```

No more ArtClock layer, no more navigation store, no more opacity toggles. The grid is always rendered. The overlay is conditionally rendered on top. The ArtClock component is rendered inside the clock card's expanded view.

### Idle Timeout Integration

The idle timeout logic moves into `WidgetGrid`:
- When no card is expanded and idle for 45s: expand clock card
- When clock card is expanded and idle for 45s: contract it (grid visible, screen goes idle-dark via OLED)
- Any touch resets the idle timer

This replaces the current `setView("clock")` call with `expandCard("clock")` and `contractCard()`.

## Implementation Details

### File-by-File Changes

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/src/db/schema.ts` | Add `countdownEvents` table (modify existing) |
| `apps/api/src/services/countdown-events.ts` | CRUD service for countdown events |
| `apps/api/src/trpc/routers/countdown-events.ts` | tRPC router for countdown events |
| `apps/api/src/db/seed-countdown-events.ts` | Seed script with 44 events |
| `apps/api/src/__tests__/countdown-events.test.ts` | API tests for countdown service + router |
| `apps/web/src/stores/card-expansion-store.ts` | Zustand store for card expansion state |
| `apps/web/src/components/hub/card-overlay.tsx` | Overlay container for expanded cards |
| `apps/web/src/components/hub/card-registry.ts` | Static card config (grid positions, colors) |
| `apps/web/src/components/hub/countdown-card.tsx` | Countdown mini + expanded views |
| `apps/web/src/components/hub/email-card.tsx` | Email placeholder card |
| `apps/web/src/components/hub/photo-card.tsx` | Photo frame placeholder card |
| `apps/web/src/components/hub/quote-card.tsx` | Quote of the day placeholder card |
| `apps/web/src/components/hub/system-status-card.tsx` | System status placeholder card |
| `apps/web/src/__tests__/card-expansion-store.test.ts` | Store tests |
| `apps/web/src/__tests__/card-overlay.test.tsx` | Overlay tests |
| `apps/web/src/__tests__/countdown-card.test.tsx` | Countdown card tests |

**Modified files:**

| File | Changes |
|------|---------|
| `apps/web/src/components/hub/bento-card.tsx` | Add gridColumn, gridRow, colorScheme, borderRadius props. Remove gridArea. |
| `apps/web/src/components/hub/widget-grid.tsx` | 6-col bento layout, add new cards, replace navigation store with expansion store, update idle timeout. |
| `apps/web/src/components/hub/clock-card.tsx` | Remove navigation store usage. Add expanded view (ArtClock). Add expand-on-tap via expansion store. |
| `apps/web/src/components/hub/weather-card.tsx` | Add expand-on-tap, color scheme. Add expanded view (detailed weather placeholder). |
| `apps/web/src/components/hub/wifi-card.tsx` | Add expand icon for overlay. Keep 3D flip on tap. |
| `apps/web/src/components/hub/lights-card.tsx` | Add expand-on-tap, color scheme. |
| `apps/web/src/components/hub/calendar-card.tsx` | Add expand-on-tap, color scheme. |
| `apps/web/src/components/hub/music-card.tsx` | Add expand-on-tap, color scheme. |
| `apps/web/src/components/hub/theme-toggle-card.tsx` | Update color scheme. No expanded view. |
| `apps/web/src/routes/index.tsx` | Remove navigation store, ArtClock import, opacity toggle. Add CardOverlay. |
| `apps/api/src/trpc/routers/index.ts` | Add countdownEvents router. |
| `apps/api/src/db/schema.ts` | Add countdownEvents table. |
| `apps/api/package.json` | Add db:seed script. |

**Deleted files:**

| File | Reason |
|------|--------|
| `apps/web/src/stores/navigation-store.ts` | Replaced by card-expansion-store.ts |
| `apps/web/src/__tests__/navigation-store.test.ts` | Replaced by card-expansion-store tests |

**Files needing test updates:**

| File | Reason |
|------|--------|
| `apps/web/src/__tests__/widget-grid.test.tsx` | New grid layout, new cards, expansion store instead of navigation store |
| `apps/web/src/__tests__/home-page.test.tsx` | No more view toggle, simplified structure |
| `apps/web/src/__tests__/home-page-hub.test.tsx` | May need updates for overlay pattern |

### Countdown Card Expanded View Detail

```
+------------------------------------------+
|  Countdown                    [+ Add]    |
|                                          |
|  [Upcoming] [Past]                       |
|                                          |
|  Coachella W2                            |
|  Apr 16, 2026              5 days        |
|  ----------------------------------------|
|  SF - SoFi Codathon                      |
|  Apr 26, 2026              15 days       |
|  ----------------------------------------|
|  Disco Lines                             |
|  May 02, 2026              21 days       |
|  ...                                     |
+------------------------------------------+
```

Add form (inline, appears at top when "+" tapped):
```
+------------------------------------------+
|  Event title          [text input]       |
|  Date                 [date input]       |
|  [Cancel]  [Save]                        |
+------------------------------------------+
```

Edit: tap event row to toggle inline edit. Delete: trash icon on each row, with confirmation.

### Card Overlay Animation Detail

1. User taps card on grid
2. `expandCard(cardId)` called on store
3. CardOverlay renders:
   - Backdrop fades in (opacity 0 to 0.5, 200ms)
   - Expanded content fades in + scales up (opacity 0 to 1, scale 0.95 to 1, 300ms ease-out)
4. User dismisses (swipe down, tap backdrop, or idle timeout):
   - Reverse animation (200ms)
   - `contractCard()` called on store

The animation is simple CSS transitions, no spring physics or layout animations needed. The expanded view is always centered in viewport, not animated from the card's position (simpler, less janky).

**Exception**: Clock expanded view is fullscreen with no backdrop dimming, black background. It IS the art clock.

### Per-Card Color Scheme Detail

Color schemes are defined in `card-registry.ts` and passed to BentoCard. They use Tailwind classes for theming:

```typescript
const CARD_CONFIGS: CardConfig[] = [
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
  // ... etc for each card
];
```

Dark/light mode: color schemes use Tailwind opacity modifiers (e.g., `/15`, `/10`) so they work on both dark and light backgrounds. The base card bg comes from the theme (bg-card), and the color scheme overlays on top.

## File Structure

```
apps/api/src/
  db/
    schema.ts                          # + countdownEvents table
    seed-countdown-events.ts           # NEW: seed 44 events
  services/
    countdown-events.ts                # NEW: CRUD service
  trpc/routers/
    countdown-events.ts                # NEW: tRPC router
    index.ts                           # + mount countdown router
  __tests__/
    countdown-events.test.ts           # NEW: service + router tests

apps/web/src/
  stores/
    card-expansion-store.ts            # NEW: replaces navigation-store
    navigation-store.ts                # DELETE
  components/hub/
    bento-card.tsx                     # MODIFY: new variant props
    widget-grid.tsx                    # MODIFY: 6-col bento layout
    card-overlay.tsx                   # NEW: expansion overlay
    card-registry.ts                   # NEW: card configs
    clock-card.tsx                     # MODIFY: expand pattern
    weather-card.tsx                   # MODIFY: expand pattern, colors
    wifi-card.tsx                      # MODIFY: expand icon
    lights-card.tsx                    # MODIFY: expand pattern, colors
    calendar-card.tsx                  # MODIFY: expand pattern, colors
    music-card.tsx                     # MODIFY: expand pattern, colors
    theme-toggle-card.tsx              # MODIFY: colors
    countdown-card.tsx                 # NEW: full countdown feature
    email-card.tsx                     # NEW: placeholder
    photo-card.tsx                     # NEW: placeholder
    quote-card.tsx                     # NEW: placeholder
    system-status-card.tsx             # NEW: placeholder
  routes/
    index.tsx                          # MODIFY: simplify
  __tests__/
    card-expansion-store.test.ts       # NEW
    card-overlay.test.tsx              # NEW
    countdown-card.test.tsx            # NEW
    widget-grid.test.tsx               # MODIFY
    home-page.test.tsx                 # MODIFY
    home-page-hub.test.tsx             # MODIFY
    navigation-store.test.ts           # DELETE
```

## Testing Strategy

### API Tests (apps/api)

**Countdown events service tests** (`countdown-events.test.ts`):
- Use `appRouter.createCaller()` pattern (matches existing health.test.ts)
- In-memory SQLite via Drizzle for test isolation
- Tests:
  - `create` inserts event, returns it with id
  - `create` rejects invalid date format
  - `create` rejects empty title
  - `listUpcoming` returns only future events, ordered by date ASC
  - `listPast` returns only past events, ordered by date DESC
  - `update` modifies title and date, updates `updatedAt`
  - `update` rejects non-existent id (throws)
  - `remove` deletes event
  - `remove` rejects non-existent id (throws)
  - `getById` returns single event
  - `getById` throws for non-existent id

### Frontend Tests (apps/web)

**Card expansion store tests** (`card-expansion-store.test.ts`):
- `expandCard` sets expandedCardId
- `contractCard` sets expandedCardId to null
- Only one card expanded at a time (expand replaces)
- Initial state is null

**Card overlay tests** (`card-overlay.test.tsx`):
- Renders nothing when no card expanded
- Renders backdrop + content when card expanded
- Backdrop click calls contractCard
- Renders correct expanded view for card id

**Countdown card tests** (`countdown-card.test.tsx`):
- Mini view shows next event title and days remaining
- Mini view shows "No events" when empty
- (Expanded view tests would need tRPC mocking, keep minimal)

**Widget grid tests** (update existing):
- Renders all 13 cards (up from 7)
- Uses 6-column grid layout
- Cards have correct grid positions
- Tap on card calls expandCard

### TDD Flow

For each component/module:
1. Write failing test
2. Implement minimum code to pass
3. Refactor
4. Repeat

Order of implementation (dependency order):
1. API: schema migration, service, router, tests
2. Frontend: card-expansion-store + tests
3. Frontend: updated BentoCard + card-registry
4. Frontend: card-overlay + tests
5. Frontend: countdown-card (mini + expanded) + tests
6. Frontend: placeholder cards (email, photo, quote, system)
7. Frontend: update existing cards (expand pattern, colors)
8. Frontend: update widget-grid (bento layout) + tests
9. Frontend: update index.tsx (remove navigation store)
10. Cleanup: delete navigation-store, update affected tests
11. Seed data script

## E2E Verification Plan

### Prerequisites
- Start dev environment: `tilt up` (starts API on :4201, web on :4200, HA on :8123)
- OR start individually:
  - `cd apps/api && bun run dev` (API on :4201)
  - `cd apps/web && bun run dev` (web on :4200)

### Verification Steps

**1. API: Countdown CRUD**

```bash
# Create event
curl -X POST http://localhost:4201/trpc/countdownEvents.create \
  -H "Content-Type: application/json" \
  -d '{"json":{"title":"Test Event","date":"2026-12-25"}}'
# PASS: Returns JSON with id, title, date

# List upcoming
curl http://localhost:4201/trpc/countdownEvents.listUpcoming
# PASS: Returns array with Test Event (future date)

# List past
curl http://localhost:4201/trpc/countdownEvents.listPast
# PASS: Returns empty array or past seed events

# Update
curl -X POST http://localhost:4201/trpc/countdownEvents.update \
  -H "Content-Type: application/json" \
  -d '{"json":{"id":1,"title":"Updated Event","date":"2026-12-31"}}'
# PASS: Returns updated event

# Delete
curl -X POST http://localhost:4201/trpc/countdownEvents.remove \
  -H "Content-Type: application/json" \
  -d '{"json":{"id":1}}'
# PASS: Returns success
```

**2. Seed data**
```bash
cd apps/api && bun run db:seed
# PASS: No errors, "Seeded 44 countdown events" output
curl http://localhost:4201/trpc/countdownEvents.listUpcoming
# PASS: Returns 15 upcoming events ordered by date
curl http://localhost:4201/trpc/countdownEvents.listPast
# PASS: Returns 29 past events ordered by date DESC
```

**3. UI: Bento Grid Layout**
- Open http://localhost:4200 in browser
- PASS: Grid shows 12-13 cards in varied sizes (not uniform 3x3)
- PASS: Weather card is large (top-left, 2x2)
- PASS: Clock card shows live time (top-center, 2x2)
- PASS: Countdown card shows next event name + days
- PASS: New cards visible: email, photo, quote, system status
- PASS: Cards have distinct color identities (not all same color)

**4. UI: Card Expansion**
- Tap weather card
- PASS: Overlay appears with expanded weather content
- PASS: Grid is dimmed beneath
- Tap backdrop or swipe down
- PASS: Overlay dismisses, grid returns to normal

**5. UI: Clock Card**
- Tap clock card on grid
- PASS: Fullscreen art clock appears (hours:minutes, large text)
- Wait 45 seconds without touching
- PASS: Art clock contracts back to grid
- Tap anywhere on grid
- PASS: Idle timer resets (visible countdown in corner)

**6. UI: Countdown Expanded View**
- Tap countdown card
- PASS: Expanded overlay shows scrollable list of upcoming events
- Tap "Past" toggle
- PASS: Shows past events
- Tap "+" to add event
- PASS: Inline form appears
- Fill in title "Test" and date, tap Save
- PASS: Event appears in list
- PASS: Hub mini card updates with correct next event

**7. UI: WiFi Card 3D Flip**
- Tap WiFi card
- PASS: Card flips (3D rotation) showing QR code (existing behavior preserved)
- PASS: Expand icon/button visible on card for overlay expansion

**8. UI: Theme Toggle**
- Tap theme toggle card
- PASS: Theme switches (dark/light), no overlay opens

**9. Run test suites**
```bash
cd apps/api && bun run test
# PASS: All tests pass including new countdown tests
cd apps/web && bun run test
# PASS: All tests pass including new card/overlay tests
```

**10. Lint + Type Check**
```bash
cd apps/api && bun run lint:fix && bunx tsc --noEmit
cd apps/web && bun run lint:fix && bunx tsc --noEmit
# PASS: No errors
```

### What Constitutes FAIL
- Any card missing from grid
- Uniform grid layout (still 3x3)
- Clock still uses view toggle instead of expansion overlay
- Countdown CRUD returns errors
- Seed script fails
- Expanded overlay doesn't dismiss on backdrop tap or swipe
- Cards all same color (no per-card identity)
- Test suite failures
- Type errors

## Error Handling

### API Layer
- **Invalid input**: Zod validation on router procedures returns 400-level tRPC errors automatically. No custom error handling needed.
- **Not found**: Service functions throw `TRPCError({ code: "NOT_FOUND" })` when getById/update/remove targets non-existent id.
- **Database errors**: Unhandled, bubble up as 500. SQLite operations are local, unlikely to fail in normal operation.

### Frontend Layer
- **Network errors**: TanStack Query handles retries (default 3). Expanded countdown view shows loading state via `isLoading` and error state via `isError` from useQuery.
- **Optimistic updates**: Not used. Mutations invalidate queries on success. Simple and correct.
- **Empty states**: Each card handles its own empty state (e.g., "No events" for countdown, "No emails" for email placeholder).
- **Animation failures**: CSS transitions are fire-and-forget. If getBoundingClientRect returns unexpected values, the overlay still renders centered (fallback position).
