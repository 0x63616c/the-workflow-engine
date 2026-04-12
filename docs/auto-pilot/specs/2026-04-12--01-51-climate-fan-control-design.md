# Climate/Fan Control Card Design Spec

## Overview

A hub grid card that shows current HVAC state (temperature, mode) and provides a fan on/off toggle. Follows the exact same vertical slice pattern as the lights card: HA service functions, tRPC routes, React hook, BentoCard component. The card targets a HomeKit AC exposed as a `climate.*` entity in Home Assistant.

---

## Assumptions

Decisions made autonomously (not specified in alignment doc):

- **Single climate entity**: The card targets the first `climate.*` entity found. No multi-entity picker in v1. If multiple climate entities exist, the service returns the first one (alphabetical by entity_id).
- **Fan toggle strategy**: Try `climate.set_hvac_mode` with `fan_only` / `off` first (HomeKit AC pattern). If a separate `fan.*` entity exists for the same device, use `fan.turn_on` / `fan.turn_off` instead. The service checks for `fan.*` entities at query time and picks the appropriate strategy.
- **Temperature unit**: Display whatever HA provides in `current_temperature`. No unit conversion. The `temperature_unit` attribute from the climate entity determines the suffix (F or C).
- **Grid placement**: Replace the theme-toggle card slot. The 3x3 grid becomes: `weather weather clock / wifi lights lights / calendar music climate`. Theme toggle is a low-priority card compared to climate control on a wall panel.
- **Poll interval**: 5000ms, matching lights and media player patterns.
- **Fan state derivation**: Fan is "on" when `hvac_action` is `fan` or `hvac_mode` is `fan_only`. Fan is "off" otherwise.
- **No HVAC mode selector**: Alignment explicitly excludes detailed HVAC mode selection. Only fan on/off toggle.
- **No target temperature display**: Alignment excludes temperature setpoint control. Only current temperature shown.
- **Error handling**: Same pattern as lights. `HaError` caught in router, returns `{ error: "HA unavailable" }`.

---

## Architecture

### Data Flow

```
ClimateCard (React)
  |
  useClimate() hook  -- trpc.devices.climate.useQuery (5s refetch)
  |                  -- trpc.devices.fanOn.useMutation
  |                  -- trpc.devices.fanOff.useMutation
  v
tRPC devicesRouter
  |
  v
ha-service.ts (getClimateState, turnFanOn, turnFanOff)
  |
  v
HomeAssistantIntegration (ha.getEntities, ha.callService)
  |
  v
Home Assistant REST API
```

### Import Boundaries

Same as existing:
- `ha-service.ts` imports from `integrations/homeassistant` only
- `devices.ts` router imports from `services/ha-service` only
- `use-climate.ts` imports from `@/lib/trpc` only
- `climate-card.tsx` imports from `@/hooks/use-climate` and `@/components/hub/bento-card`

---

## Implementation Details

### 1. API Service: `ha-service.ts` additions

New interface and three new exported functions added to the existing `ha-service.ts` file.

```typescript
export interface ClimateState {
  entityId: string;
  friendlyName: string;
  currentTemp: number | null;
  tempUnit: "F" | "C";
  hvacMode: string;
  hvacAction: string | null;
  fanOn: boolean;
}

export async function getClimateState(): Promise<ClimateState | null> {
  const entities = await ha.getEntities("climate");
  if (entities.length === 0) return null;

  const entity = entities.sort((a, b) =>
    a.entity_id.localeCompare(b.entity_id)
  )[0];

  const attrs = entity.attributes;
  const hvacMode = entity.state;
  const hvacAction = (attrs.hvac_action as string) ?? null;
  const fanOn = hvacMode === "fan_only" || hvacAction === "fan";

  return {
    entityId: entity.entity_id,
    friendlyName: (attrs.friendly_name as string) ?? entity.entity_id,
    currentTemp: (attrs.current_temperature as number) ?? null,
    tempUnit: (attrs.temperature_unit as string)?.includes("C") ? "C" : "F",
    hvacMode,
    hvacAction,
    fanOn,
  };
}

export async function turnFanOn(entityId: string): Promise<void> {
  // Check if a dedicated fan entity exists
  const fanEntities = await ha.getEntities("fan");
  const matchingFan = fanEntities.find((e) =>
    e.entity_id.includes(entityId.replace("climate.", ""))
  );

  if (matchingFan) {
    await ha.callService("fan", "turn_on", { entity_id: matchingFan.entity_id });
  } else {
    await ha.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: "fan_only",
    });
  }
}

export async function turnFanOff(entityId: string): Promise<void> {
  const fanEntities = await ha.getEntities("fan");
  const matchingFan = fanEntities.find((e) =>
    e.entity_id.includes(entityId.replace("climate.", ""))
  );

  if (matchingFan) {
    await ha.callService("fan", "turn_off", { entity_id: matchingFan.entity_id });
  } else {
    await ha.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: "off",
    });
  }
}
```

### 2. tRPC Router: `devices.ts` additions

Three new procedures added to the existing `devicesRouter`:

```typescript
climate: publicProcedure.query(async () => {
  try {
    return await getClimateState();
  } catch (err) {
    if (err instanceof HaError) return { error: "HA unavailable" };
    throw err;
  }
}),

fanOn: publicProcedure
  .input(z.object({ entityId: z.string() }))
  .mutation(async ({ input }) => {
    try {
      await turnFanOn(input.entityId);
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

fanOff: publicProcedure
  .input(z.object({ entityId: z.string() }))
  .mutation(async ({ input }) => {
    try {
      await turnFanOff(input.entityId);
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),
```

### 3. React Hook: `use-climate.ts`

New file at `apps/web/src/hooks/use-climate.ts`:

```typescript
import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5_000;

export function useClimate() {
  const climate = trpc.devices.climate.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const fanOnMutation = trpc.devices.fanOn.useMutation();
  const fanOffMutation = trpc.devices.fanOff.useMutation();

  const data = climate.data;
  const hasError = data != null && "error" in data;

  const state = !hasError && data ? data : null;

  return {
    entityId: state?.entityId ?? null,
    friendlyName: state?.friendlyName ?? null,
    currentTemp: state?.currentTemp ?? null,
    tempUnit: state?.tempUnit ?? "F",
    hvacMode: state?.hvacMode ?? null,
    fanOn: state?.fanOn ?? false,
    isLoading: climate.isLoading,
    isError: hasError || climate.isError,
    turnFanOn: (entityId: string) => fanOnMutation.mutate({ entityId }),
    turnFanOff: (entityId: string) => fanOffMutation.mutate({ entityId }),
  };
}
```

### 4. Component: `climate-card.tsx`

New file at `apps/web/src/components/hub/climate-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { useClimate } from "@/hooks/use-climate";

export function ClimateCard() {
  const {
    entityId, currentTemp, tempUnit, hvacMode,
    fanOn, isLoading, isError, turnFanOn, turnFanOff,
  } = useClimate();

  const tempLabel = isLoading
    ? "-- "
    : isError || currentTemp == null
      ? "Unavailable"
      : `${Math.round(currentTemp)}\u00b0${tempUnit}`;

  const modeLabel = isLoading ? "" : isError ? "" : hvacMode ?? "";
  const disabled = isLoading || isError || entityId == null;

  return (
    <BentoCard testId="widget-card-climate" gridArea="climate">
      <div className="flex items-center justify-between h-full">
        <div>
          <div className="text-sm text-muted-foreground mb-3">Climate</div>
          <div className="text-lg font-light text-foreground">{tempLabel}</div>
          {modeLabel && (
            <div className="text-xs text-muted-foreground mt-1 capitalize">
              {modeLabel.replace("_", " ")}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (entityId) turnFanOn(entityId);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed ${
              fanOn ? "text-white bg-white/10" : "text-white/60"
            }`}
          >
            Fan On
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (entityId) turnFanOff(entityId);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed ${
              !fanOn ? "text-white bg-white/10" : "text-white/60"
            }`}
          >
            Fan Off
          </button>
        </div>
      </div>
    </BentoCard>
  );
}
```

### 5. Widget Grid: `widget-grid.tsx` changes

- Import `ClimateCard`
- Replace `<ThemeToggleCard />` with `<ClimateCard />`
- Update `gridTemplateAreas` to change `theme` to `climate`

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/hooks/use-climate.ts` | TanStack Query hook for climate state + fan mutations |
| `apps/web/src/components/hub/climate-card.tsx` | BentoCard component for climate/fan display |
| `apps/api/src/__tests__/services/ha-service-climate.test.ts` | Unit tests for climate service functions |
| `apps/api/src/__tests__/routers/devices-climate.test.ts` | Unit tests for climate tRPC routes |
| `apps/web/src/__tests__/use-climate.test.ts` | Unit tests for useClimate hook |
| `apps/web/src/__tests__/climate-card.test.tsx` | Unit tests for ClimateCard component |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/src/services/ha-service.ts` | Add `ClimateState` interface, `getClimateState()`, `turnFanOn()`, `turnFanOff()` |
| `apps/api/src/trpc/routers/devices.ts` | Add `climate` query, `fanOn` mutation, `fanOff` mutation |
| `apps/web/src/components/hub/widget-grid.tsx` | Import ClimateCard, replace ThemeToggleCard, update grid areas |
| `apps/web/src/__tests__/widget-grid.test.tsx` | Add `use-climate` mock, update card count assertion, add climate testId check |

---

## Testing Strategy

### API Service Tests (`ha-service-climate.test.ts`)

Mock `ha.getEntities` and `ha.callService` (same pattern as existing lights tests).

| Test | Description |
|------|-------------|
| `getClimateState() returns state for first climate entity` | Mock single climate entity, verify all fields mapped |
| `getClimateState() returns null when no climate entities` | Mock empty array, verify null return |
| `getClimateState() picks first entity alphabetically` | Mock two entities, verify first by entity_id used |
| `getClimateState() fanOn true when hvac_mode is fan_only` | Mock entity with state "fan_only", verify fanOn=true |
| `getClimateState() fanOn true when hvac_action is fan` | Mock entity with hvac_action "fan", verify fanOn=true |
| `getClimateState() fanOn false when cooling` | Mock entity with state "cool", verify fanOn=false |
| `getClimateState() handles missing current_temperature` | Mock entity without current_temperature, verify null |
| `getClimateState() detects Celsius unit` | Mock entity with temperature_unit containing "C" |
| `turnFanOn() uses climate.set_hvac_mode when no fan entity` | Mock empty fan entities, verify callService args |
| `turnFanOn() uses fan.turn_on when matching fan entity exists` | Mock matching fan entity, verify fan domain call |
| `turnFanOff() uses climate.set_hvac_mode off when no fan entity` | Verify hvac_mode "off" |
| `turnFanOff() uses fan.turn_off when matching fan entity exists` | Verify fan domain call |

### Router Tests (`devices-climate.test.ts`)

Mock `ha-service` functions (same pattern as existing router tests).

| Test | Description |
|------|-------------|
| `devices.climate returns ClimateState on success` | Verify pass-through |
| `devices.climate returns error on HaError` | Verify error object |
| `devices.climate returns null when no entities` | Verify null pass-through |
| `devices.fanOn calls turnFanOn with entityId` | Verify mutation forwarding |
| `devices.fanOn returns error on HaError` | Verify error handling |
| `devices.fanOff calls turnFanOff with entityId` | Verify mutation forwarding |

### Hook Tests (`use-climate.test.ts`)

Mock `@/lib/trpc` (same pattern as `use-lights.test.ts`).

| Test | Description |
|------|-------------|
| `returns null values when loading` | Verify defaults during loading |
| `returns climate data when query succeeds` | Verify all fields passed through |
| `returns isError true when query fails` | Verify error state |
| `returns isError true when data contains error field` | Verify HA error detection |
| `turnFanOn calls fanOn mutation with entityId` | Verify mutation call |
| `turnFanOff calls fanOff mutation with entityId` | Verify mutation call |

### Component Tests (`climate-card.test.tsx`)

Mock `use-climate` hook (same pattern as `lights-card.test.tsx`).

| Test | Description |
|------|-------------|
| `shows current temperature` | Verify "72F" displayed |
| `shows hvac mode` | Verify mode label |
| `renders Fan On and Fan Off buttons` | Verify buttons exist |
| `calls turnFanOn when Fan On clicked` | Verify callback |
| `calls turnFanOff when Fan Off clicked` | Verify callback |
| `highlights Fan On button when fan is on` | Verify active style |
| `highlights Fan Off button when fan is off` | Verify active style |
| `shows Unavailable and disables buttons on error` | Verify error state |
| `shows loading state and disables buttons` | Verify loading state |

### Widget Grid Test Updates

- Add `use-climate` mock to existing `widget-grid.test.tsx`
- Update "renders all 7 widget cards" test to check for `widget-card-climate` instead of `widget-card-theme`

---

## E2E Verification Plan

### Prerequisites

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
```

### Step 1: Run all tests

```bash
cd apps/api && bun run test
cd apps/web && bun run test
```

**PASS**: All tests pass, zero failures.
**FAIL**: Any test failure.

### Step 2: Type check

```bash
cd apps/api && bunx tsc --noEmit
cd apps/web && bunx tsc --noEmit
```

**PASS**: No type errors.
**FAIL**: Any type error.

### Step 3: Lint

```bash
cd apps/api && bun run lint:fix
cd apps/web && bun run lint:fix
```

**PASS**: No lint errors remaining after fix.
**FAIL**: Unfixable lint errors.

### Step 4: Dev server smoke test

```bash
tilt up
```

Wait for services to be ready, then:

```bash
curl -s http://localhost:4201/health | jq .
```

**PASS**: Returns `{ "status": "ok" }`.

### Step 5: tRPC climate endpoint

```bash
# Query climate state (via HTTP, not WebSocket for simplicity)
curl -s 'http://localhost:4201/devices.climate' | jq .
```

**PASS**: Returns either a `ClimateState` object with `entityId`, `currentTemp`, `fanOn` fields, or `null` if no climate entity exists in HA, or `{ "error": "HA unavailable" }` if HA is down.
**FAIL**: 500 error or unexpected response shape.

### Step 6: Visual verification

Capture the web app window (port 4200) using `screencapture -x -l <windowID>` and verify:

1. Climate card visible in bottom-right grid slot
2. Shows temperature value or "Unavailable"
3. Fan On / Fan Off buttons visible
4. Buttons respond to taps (fan state toggles)

**PASS**: Card renders correctly with expected layout matching lights card pattern.
**FAIL**: Card missing, broken layout, or buttons non-functional.

---

## Error Handling

| Layer | Error | Handling |
|-------|-------|----------|
| `ha-service.ts` | HA fetch fails (network) | `HaError` thrown (status 0) |
| `ha-service.ts` | HA returns non-2xx | `HaError` thrown (with status) |
| `devices.ts` router | `HaError` caught | Returns `{ error: "HA unavailable" }` |
| `devices.ts` router | Non-HA error | Re-thrown (500 to client) |
| `use-climate.ts` hook | Data has `error` field | Sets `isError: true` |
| `use-climate.ts` hook | Query network failure | TanStack Query sets `isError: true` |
| `climate-card.tsx` | `isError: true` | Shows "Unavailable", disables buttons |
| `climate-card.tsx` | `isLoading: true` | Shows "-- ", disables buttons |
| `climate-card.tsx` | No climate entity (null) | Disables buttons, shows "Unavailable" |
