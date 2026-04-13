# Architecture Review

Date: 2026-04-12

---

## 1. Current State Assessment (main)

### What's good

**Frontend**
- `BentoCard` (`apps/web/src/components/hub/bento-card.tsx`) is a well-abstracted primitive. Grid positioning, border, shadow, and interaction state all live in one place. No card duplicates this logic.
- Zustand stores are tight and focused. `card-expansion-store.ts` (17 lines), `timer-store.ts` — no bloat. State/actions interface separation is clean.
- Hook abstraction is solid. `use-lights.ts`, `use-climate.ts` own all query/mutation boilerplate, keeping card components thin.
- `useIdleTimeout` → auto-expand clock is implemented correctly via the hook, not baked into the component.
- Import boundaries enforced via script + CI. The layering rule (routers → services → integrations) is checked at commit time.
- Theme engine (`theme-store.ts`) supports `registerPalette` — it's already plugin-ready.

**Backend**
- Router/service boundary is clean. `devicesRouter` contains zero business logic: it's flat `try/catch` wrappers around service calls, exactly as specified.
- `HomeAssistantIntegration` implements the `Integration` interface. The `ha` singleton makes cross-service HA calls uniform.
- Error wrapping with `HaError` keeps network failures from bubbling as 500s.
- `countdownEventsRouter` correctly threads `ctx.db` into service functions — no global DB access.

### What's not good

**Frontend**
- `card-overlay.tsx` has a critical seam problem: the `EXPANDED_VIEWS` map (line 119) is a hardcoded registry that must be updated manually every time a new card gains an expanded view. It duplicates the concept of "card → expanded component" that should already be in the card registry.
- `widget-grid.tsx` (lines 1–13) imports every card component directly. Adding a card means editing two files: the card itself and `widget-grid.tsx`.
- `ClimateCard` (`climate-card.tsx`) bypasses `BentoCard` and re-implements its entire style logic inline (border, shadow, grid placement). This pattern will diverge.
- `use-climate.ts` (lines 16–25) defines an inline `ClimateData` type that duplicates `ClimateState` from the backend service. The type should live in `@repo/shared`.
- `use-lights.ts` (lines 17–18): double type-casts `data as { onCount: number }` and `data as { totalCount: number }` — the tRPC types should flow through without manual casting.
- Polling interval `POLL_INTERVAL_MS = 5_000` is repeated independently in `use-climate.ts:3` and `use-lights.ts:3`. Not a shared constant.

**Backend**
- `getClimateState()` (`ha-service.ts` lines 42–66) makes two separate `/api/states` calls: one for `climate.*` entities and one for `fan.*` entities. Each call fetches the entire HA state tree and filters client-side. For a local smart home panel this is acceptable today, but it's N+1 equivalent.
- `setTemperature` in `devices.ts` (line 116) hardcodes `z.number().min(65).max(80)` — Fahrenheit-specific limits baked in, will break if HA reports Celsius.
- `HomeAssistantIntegration.getState()` (line 17) returns `{ connected: true }` unconditionally — it never actually checks connectivity. The `Integration` interface contract is hollow for HA.
- `systemInfo` table in `schema.ts` exists with no corresponding service, router, or query anywhere in the codebase. Dead schema.
- No Inngest functions exist yet (`apps/api/src/inngest/functions/` is empty). The infrastructure is wired but unused.

---

## 2. Card Plugin System Branch Analysis (`refactor/card-plugin-system`)

### What changed

| File | Change |
|---|---|
| `card-registry.ts` | Static `CARD_CONFIGS` array replaced with mutable registry + `registerCard()` / `getRegisteredCards()` / `getExpandedView()` |
| `register-cards.ts` | New file: all cards registered here with component + expandedView co-located |
| `card-overlay.tsx` | `EXPANDED_VIEWS` map removed, replaced with `getExpandedView(expandedCardId)` lookup |
| `widget-grid.tsx` | All direct card imports removed, replaced with `cards.map()` over registry |
| `lights-card.tsx` | Simplified: toggle instead of two buttons, `displayValue` utility used |
| `climate-card.tsx` | Redesigned as tap-up/tap-down temperature control, but bypasses `BentoCard` |
| `fan-card.tsx` | New standalone card extracted from climate card |
| `expanded-music.tsx` | Extracted from `card-overlay.tsx` into own file |
| `display-value.ts` | New utility function for loading/error/value display strings |
| `use-fan.ts` | New hook wrapping `use-climate` for fan-only concerns |

### What's good

- **Self-registration pattern** works. `register-cards.ts` is the single place to add or remove a card from the grid. No more editing `widget-grid.tsx`.
- **Expanded view co-location**: `expandedView` now lives next to `component` in the same registration call. The `EXPANDED_VIEWS` map in `card-overlay.tsx` is gone — this was the biggest coupling problem.
- **`displayValue` utility** (`display-value.ts`): eliminates the `isLoading ? "..." : isError ? "..." : value` ternary chain that appeared in every card. Clean.
- **Fan extraction**: splitting `FanCard` out of `ClimateCard` follows single-responsibility. `use-fan.ts` composes on top of `use-climate.ts` without duplicating HA calls.
- **`getLightsState` fix** (ha-service.ts): filtering out `unavailable` entities before counting is a real correctness fix.
- **`targetTemp` addition**: exposing thermostat setpoint and wiring up `setTemperature` end-to-end is complete (service → router → hook → UI).

### What's missing or problematic

**ClimateCard bypasses BentoCard** (`climate-card.tsx` lines 25–54 in branch): the card reimplements border color logic, box shadow, and grid placement inline with `getCardConfig()` lookups. This is exactly the divergence `BentoCard` was built to prevent. `BentoCard` needs `onClick` split into top/bottom halves for the temperature control pattern — that's a `BentoCard` API extension, not a reason to bypass it.

**`CountdownCardMini` is special-cased** in `widget-grid.tsx` (lines 30–33 in branch):
```tsx
if (card.id === "countdown") {
  return <CountdownCardMini key={card.id} nextEvent={nextEvent} />;
}
```
The `nextEvent` prop breaks the zero-argument `component` contract in `CardConfig`. The plugin system promises `ComponentType<any>` but the grid renderer has to know about countdown specifically. Two options: (a) move the `trpc.countdownEvents.listUpcoming` query inside `CountdownCardMini` directly, or (b) support a `loaderQuery` field in `CardConfig`. Option (a) is simpler.

**Side-effect import** in `widget-grid.tsx` line 1:
```tsx
import "@/components/hub/register-cards";
```
This works but it means card registration is a side effect of importing `WidgetGrid`. If `WidgetGrid` is imported in a test, `register-cards.ts` runs and pulls in all card components. Tests that render `WidgetGrid` in isolation will execute all registrations. This is not a blocking problem but it makes test isolation harder.

**Temperature min/max still hardcoded** in the branch (devices.ts line 116): `z.number().min(65).max(80)`. This is Fahrenheit-only. Should be removed from the Zod schema or made dynamic based on HA's reported `min_temp`/`max_temp` attributes.

**`CARD_CONFIGS` deprecated export** (`card-registry.ts` line, branch): `export const CARD_CONFIGS = registry` with `@deprecated` comment. The registry array is mutable — anything that imported `CARD_CONFIGS` and kept a reference now has a live reference to the internal array. A snapshot copy (`[...registry]`) should be returned from `getRegisteredCards()` instead, or the `CARD_CONFIGS` alias should be removed.

**Grid layout changed** in the branch: clock card goes from `3/5` to `1/4` column span, and several other cards shift. This is a product-level change mixed into a refactor PR — worth calling out explicitly.

---

## 3. Specific Refactor Opportunities

### Frontend

**F1. Move `nextEvent` query into `CountdownCardMini`**
- `apps/web/src/components/hub/widget-grid.tsx:24` — query lives here only to pass to countdown
- Move `trpc.countdownEvents.listUpcoming.useQuery()` into the card component
- Removes the special-case branch in the plugin loop

**F2. Extend `BentoCard` with `topAction`/`bottomAction` or `sections` prop**
- `apps/web/src/components/hub/climate-card.tsx` (branch) — bypasses BentoCard entirely
- Add `sections?: Array<{ onClick?: () => void; className?: string; children: ReactNode }>` to BentoCardProps
- Lets climate card stay inside BentoCard while still having split-tap areas

**F3. Shared type for ClimateState**
- `apps/web/src/hooks/use-climate.ts:16–25` — inline `ClimateData` type duplicates backend `ClimateState`
- Move `ClimateState` from `apps/api/src/services/ha-service.ts` into `libs/shared/src/types/`
- Both hook and service import from `@repo/shared`

**F4. Shared polling interval constant**
- `apps/web/src/hooks/use-climate.ts:3` and `apps/web/src/hooks/use-lights.ts:3` — `POLL_INTERVAL_MS = 5_000` duplicated
- Single constant in `apps/web/src/lib/constants.ts` or `libs/shared`

**F5. Remove tRPC type casts in hooks**
- `apps/web/src/hooks/use-lights.ts:17–18` — manual casts to `{ onCount: number }` etc.
- tRPC infers output types from router definitions; the casts indicate the inferred type isn't being used
- Likely caused by the HA error union return (`{ error: string } | LightsState`) — the router should throw instead of returning error objects, allowing clean type inference

### Backend

**B1. Batch HA state fetch in `getClimateState`**
- `apps/api/src/services/ha-service.ts:42–55` — two calls to `/api/states` (one for climate, one for fan)
- Fetch all states once and filter both domains in one pass

**B2. Remove Fahrenheit-specific temperature bounds**
- `apps/api/src/trpc/routers/devices.ts:116` — `z.number().min(65).max(80)`
- Either remove the range check from the schema (trust the UI) or read `min_temp`/`max_temp` from the HA entity attributes

**B3. Fix `HomeAssistantIntegration.getState()`**
- `apps/api/src/integrations/homeassistant/index.ts:17–19` — returns `{ connected: true }` unconditionally
- Should call `GET /api/` and check the `message: "API running."` response to verify connectivity

**B4. Remove or use `systemInfo` table**
- `apps/api/src/db/schema.ts:3–7` — `systemInfo` table with no service, router, or migration consumer
- Either wire it up (key/value store for persisted app settings) or drop it

**B5. HA error return pattern creates weak types**
- Pattern in every router procedure: `if (err instanceof HaError) return { error: "HA unavailable" }`
- This creates a union return type (`LightsState | { error: string }`) that callers have to manually discriminate with `"error" in data`
- Better: throw a `TRPCError` with code `SERVICE_UNAVAILABLE` — tRPC error handling on the client is cleaner and the output type stays `LightsState`

---

## 4. Frontend Architecture

**Component composition**: Good. `BentoCard` is the right abstraction level. The card system is composable. The problem is that `ClimateCard` (branch) defects from it.

**State management**: Zustand stores are appropriate in scope and size. No store has mixed concerns. One gap: there is no server-side push; everything polls. When HA events arrive (motion, lights switched from wall), the panel won't reflect them until the next 5-second poll. This is acceptable now but worth noting for the real-time roadmap.

**File organization**: Clear. `components/hub/` owns the card system. `hooks/` owns data access. `stores/` owns client state. `lib/` owns infrastructure (tRPC client). No file is doing two jobs.

**Code duplication**: Low overall, but `use-climate.ts:16–25` (inline type) and `climate-card.tsx` (inline BentoCard styles) are the current divergence points.

---

## 5. Backend Architecture

**Router/service layering**: Clean and consistent. The boundary check enforces it. No business logic has leaked into routers.

**Integration interface** (`integrations/types.ts`): The current `Integration` interface is generic but `HomeAssistantIntegration` only implements `init()` meaningfully. `getState()` returns a stub, `execute()` is a no-op, and `subscribe` is not implemented. The HA integration bypasses the interface entirely — all callers go through typed methods (`ha.getEntities`, `ha.callService`) not `ha.execute()`. This means the interface provides no actual abstraction value today. For future integrations (e.g. Vacuum, Calendar API), the pattern to follow is: typed service functions in `services/`, HA HTTP calls in `integrations/homeassistant/`, not `execute()`.

**Database**: SQLite/Drizzle is appropriately scoped. Schema is minimal. The date stored as `text` in `countdown_events.date` is fine for `YYYY-MM-DD` strings, but ordering by date will be lexicographic — acceptable for this format.

**Inngest**: Functions directory is empty. The infrastructure is ready (docker-compose, handler registered at `/api/inngest`). First natural use case: nightly countdown event cleanup or HA polling fallback if SSE ever replaces polling.

---

## 6. Extensibility Assessment

### Adding a new card

**On main**: requires editing `card-registry.ts` (add config), `card-overlay.tsx` (add to `EXPANDED_VIEWS`), `widget-grid.tsx` (import + place component). Three files.

**On plugin branch**: requires adding a `registerCard()` call in `register-cards.ts`. One file, unless the card needs a prop that breaks the zero-argument component contract (see CountdownCardMini issue above).

**Verdict**: branch is the right direction. Fix the `nextEvent` prop problem and it's complete.

### Adding a new integration

The `Integration` interface exists but the real pattern is: (1) add typed methods to `integrations/yourservice/index.ts`, (2) add service functions in `services/`, (3) add router procedures in `trpc/routers/`. The generic `execute()` path is unused. The layering is correct; the interface is underselling itself.

### Adding real-time features (SSE subscriptions)

`splitLink` in `apps/web/src/lib/trpc.ts` is already configured to route subscriptions over SSE. The backend supports tRPC subscriptions. No architectural change needed — just add a `subscription` procedure to a router and a `trpc.router.procedure.useSubscription()` call on the frontend.

### Adding notifications

`docs/plugins.md` describes a Notification System. No implementation exists. The natural storage is a `notifications` table in SQLite, with Inngest as the trigger mechanism. The tRPC SSE subscription path is the delivery mechanism to the frontend. All three infrastructure pieces are present.

### Adding themes

`useThemeStore.registerPalette()` already supports runtime registration. A third-party palette is one `registerPalette()` call. Complete.
