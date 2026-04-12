# Climate/Fan Control Card Implementation Plan

**Goal:** Add a hub grid card that shows current HVAC temperature and provides fan on/off toggle, following the exact lights card vertical slice pattern.
**Architecture:** Three new functions in `ha-service.ts` (getClimateState, turnFanOn, turnFanOff), three new tRPC procedures in `devices.ts`, a `useClimate` hook, and a `ClimateCard` component. Grid expands from 3x3 to 4x3 with climate spanning the full bottom row.
**Tech Stack:** TypeScript, tRPC, Zod, TanStack Query, React, Tailwind, Vitest

---

### Task 1: API Service - getClimateState

**Files:**
- Modify: `apps/api/src/services/ha-service.ts:1-124`
- Test: `apps/api/src/__tests__/services/ha-service-climate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/__tests__/services/ha-service-climate.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ha } from "../../integrations/homeassistant";
import { getClimateState } from "../../services/ha-service";

vi.mock("../../integrations/homeassistant", () => ({
  ha: {
    getEntities: vi.fn(),
    getEntity: vi.fn(),
    callService: vi.fn(),
    init: vi.fn(),
  },
}));

const mockGetEntities = vi.mocked(ha.getEntities);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getClimateState()", () => {
  it("returns state for first climate entity", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: {
              friendly_name: "Living Room AC",
              current_temperature: 72,
              temperature_unit: "F",
              hvac_action: "cooling",
            },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result).toEqual({
      entityId: "climate.living_room",
      friendlyName: "Living Room AC",
      currentTemp: 72,
      tempUnit: "F",
      hvacMode: "cool",
      hvacAction: "cooling",
      fanOn: false,
      fanEntityId: null,
    });
  });

  it("returns null when no climate entities", async () => {
    mockGetEntities.mockResolvedValue([]);
    const result = await getClimateState();
    expect(result).toBeNull();
  });

  it("picks first entity alphabetically by entity_id", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.z_bedroom",
            state: "off",
            attributes: { friendly_name: "Bedroom", current_temperature: 68, temperature_unit: "F" },
            last_updated: "",
          },
          {
            entity_id: "climate.a_living_room",
            state: "cool",
            attributes: { friendly_name: "Living Room", current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.entityId).toBe("climate.a_living_room");
  });

  it("fanOn true when hvac_mode is fan_only", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "fan_only",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanOn).toBe(true);
  });

  it("fanOn true when hvac_action is fan", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F", hvac_action: "fan" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanOn).toBe(true);
  });

  it("fanOn false when cooling", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F", hvac_action: "cooling" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanOn).toBe(false);
  });

  it("handles missing current_temperature", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "off",
            attributes: { temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.currentTemp).toBeNull();
  });

  it("detects Celsius unit", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 22, temperature_unit: "\u00b0C" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.tempUnit).toBe("C");
  });

  it("sets fanEntityId when exact fan match exists", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      if (domain === "fan") {
        return [
          { entity_id: "fan.living_room", state: "off", attributes: {}, last_updated: "" },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanEntityId).toBe("fan.living_room");
  });

  it("sets fanEntityId null when no fan match", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      if (domain === "fan") {
        return [];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanEntityId).toBeNull();
  });

  it("does not match fan entity with partial name", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      if (domain === "fan") {
        return [
          { entity_id: "fan.living_room_ceiling", state: "off", attributes: {}, last_updated: "" },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanEntityId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test src/__tests__/services/ha-service-climate.test.ts`

Expected: FAIL - `getClimateState` is not exported from `ha-service.ts`

- [ ] **Step 3: Write implementation**

Add to `apps/api/src/services/ha-service.ts` after the existing imports and before `getLightsState`:

```typescript
export interface ClimateState {
  entityId: string;
  friendlyName: string;
  currentTemp: number | null;
  tempUnit: "F" | "C";
  hvacMode: string;
  hvacAction: string | null;
  fanOn: boolean;
  fanEntityId: string | null;
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

  const climateName = entity.entity_id.replace("climate.", "");
  const fanEntities = await ha.getEntities("fan");
  const matchingFan = fanEntities.find(
    (e) => e.entity_id.replace("fan.", "") === climateName
  );

  return {
    entityId: entity.entity_id,
    friendlyName: (attrs.friendly_name as string) ?? entity.entity_id,
    currentTemp: (attrs.current_temperature as number) ?? null,
    tempUnit: (attrs.temperature_unit as string)?.includes("C") ? "C" : "F",
    hvacMode,
    hvacAction,
    fanOn,
    fanEntityId: matchingFan?.entity_id ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test src/__tests__/services/ha-service-climate.test.ts`

Expected: PASS (all 11 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add apps/api/src/services/ha-service.ts apps/api/src/__tests__/services/ha-service-climate.test.ts
git commit -m "feat: add getClimateState to ha-service with fan entity matching"
git push
```

---

### Task 2: API Service - turnFanOn / turnFanOff

**Files:**
- Modify: `apps/api/src/services/ha-service.ts`
- Test: `apps/api/src/__tests__/services/ha-service-climate.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `apps/api/src/__tests__/services/ha-service-climate.test.ts`:

```typescript
import { turnFanOn, turnFanOff } from "../../services/ha-service";

const mockCallService = vi.mocked(ha.callService);

describe("turnFanOn()", () => {
  it("uses climate.set_hvac_mode fan_only when fanEntityId null", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOn("climate.living_room", null);
    expect(mockCallService).toHaveBeenCalledWith("climate", "set_hvac_mode", {
      entity_id: "climate.living_room",
      hvac_mode: "fan_only",
    });
  });

  it("uses fan.turn_on when fanEntityId provided", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOn("climate.living_room", "fan.living_room");
    expect(mockCallService).toHaveBeenCalledWith("fan", "turn_on", {
      entity_id: "fan.living_room",
    });
  });
});

describe("turnFanOff()", () => {
  it("uses climate.set_hvac_mode off when fanEntityId null", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOff("climate.living_room", null);
    expect(mockCallService).toHaveBeenCalledWith("climate", "set_hvac_mode", {
      entity_id: "climate.living_room",
      hvac_mode: "off",
    });
  });

  it("uses fan.turn_off when fanEntityId provided", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOff("climate.living_room", "fan.living_room");
    expect(mockCallService).toHaveBeenCalledWith("fan", "turn_off", {
      entity_id: "fan.living_room",
    });
  });
});
```

Note: The import of `turnFanOn` and `turnFanOff` must be added at the top of the file alongside `getClimateState`.

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test src/__tests__/services/ha-service-climate.test.ts`

Expected: FAIL - `turnFanOn` and `turnFanOff` not exported

- [ ] **Step 3: Write implementation**

Add to `apps/api/src/services/ha-service.ts` after `getClimateState`:

```typescript
export async function turnFanOn(
  entityId: string,
  fanEntityId?: string | null,
): Promise<void> {
  if (fanEntityId) {
    await ha.callService("fan", "turn_on", { entity_id: fanEntityId });
  } else {
    await ha.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: "fan_only",
    });
  }
}

export async function turnFanOff(
  entityId: string,
  fanEntityId?: string | null,
): Promise<void> {
  if (fanEntityId) {
    await ha.callService("fan", "turn_off", { entity_id: fanEntityId });
  } else {
    await ha.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: "off",
    });
  }
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test src/__tests__/services/ha-service-climate.test.ts`

Expected: PASS (all 15 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add apps/api/src/services/ha-service.ts apps/api/src/__tests__/services/ha-service-climate.test.ts
git commit -m "feat: add turnFanOn/turnFanOff with dedicated fan entity support"
git push
```

---

### Task 3: tRPC Router - climate, fanOn, fanOff procedures

**Files:**
- Modify: `apps/api/src/trpc/routers/devices.ts:1-82`
- Test: `apps/api/src/__tests__/routers/devices-climate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/__tests__/routers/devices-climate.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HaError } from "../../integrations/homeassistant/types";
import * as haService from "../../services/ha-service";
import { appRouter } from "../../trpc/routers";

vi.mock("../../services/ha-service", () => ({
  getLightsState: vi.fn(),
  turnAllLightsOn: vi.fn(),
  turnAllLightsOff: vi.fn(),
  getMediaPlayers: vi.fn(),
  mediaPlayerCommand: vi.fn(),
  setVolume: vi.fn(),
  getClimateState: vi.fn(),
  turnFanOn: vi.fn(),
  turnFanOff: vi.fn(),
}));

const caller = appRouter.createCaller({} as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("devices.climate", () => {
  it("returns ClimateState on success", async () => {
    const mockState = {
      entityId: "climate.living_room",
      friendlyName: "Living Room AC",
      currentTemp: 72,
      tempUnit: "F" as const,
      hvacMode: "cool",
      hvacAction: "cooling",
      fanOn: false,
      fanEntityId: null,
    };
    vi.mocked(haService.getClimateState).mockResolvedValueOnce(mockState);
    const result = await caller.devices.climate();
    expect(result).toEqual(mockState);
  });

  it("returns error on HaError", async () => {
    vi.mocked(haService.getClimateState).mockRejectedValueOnce(new HaError(503, "Unavailable"));
    const result = await caller.devices.climate();
    expect(result).toHaveProperty("error");
  });

  it("returns null when no entities", async () => {
    vi.mocked(haService.getClimateState).mockResolvedValueOnce(null);
    const result = await caller.devices.climate();
    expect(result).toBeNull();
  });
});

describe("devices.fanOn", () => {
  it("calls turnFanOn with entityId and fanEntityId", async () => {
    vi.mocked(haService.turnFanOn).mockResolvedValueOnce(undefined);
    await caller.devices.fanOn({ entityId: "climate.lr", fanEntityId: "fan.lr" });
    expect(haService.turnFanOn).toHaveBeenCalledWith("climate.lr", "fan.lr");
  });

  it("returns error on HaError", async () => {
    vi.mocked(haService.turnFanOn).mockRejectedValueOnce(new HaError(503, "Unavailable"));
    const result = await caller.devices.fanOn({ entityId: "climate.lr" });
    expect(result).toHaveProperty("error");
  });
});

describe("devices.fanOff", () => {
  it("calls turnFanOff with entityId and fanEntityId", async () => {
    vi.mocked(haService.turnFanOff).mockResolvedValueOnce(undefined);
    await caller.devices.fanOff({ entityId: "climate.lr", fanEntityId: "fan.lr" });
    expect(haService.turnFanOff).toHaveBeenCalledWith("climate.lr", "fan.lr");
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test src/__tests__/routers/devices-climate.test.ts`

Expected: FAIL - `devices.climate` procedure does not exist

- [ ] **Step 3: Write implementation**

Modify `apps/api/src/trpc/routers/devices.ts`. Add imports for new service functions and Zod:

```typescript
import {
  getClimateState,
  getLightsState,
  getMediaPlayers,
  mediaPlayerCommand,
  setVolume,
  turnAllLightsOff,
  turnAllLightsOn,
  turnFanOff,
  turnFanOn,
} from "../../services/ha-service";
```

Add three new procedures inside `devicesRouter` after `setVolume`:

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
    .input(z.object({ entityId: z.string(), fanEntityId: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      try {
        await turnFanOn(input.entityId, input.fanEntityId);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

  fanOff: publicProcedure
    .input(z.object({ entityId: z.string(), fanEntityId: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      try {
        await turnFanOff(input.entityId, input.fanEntityId);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test src/__tests__/routers/devices-climate.test.ts`

Expected: PASS (all 6 tests)

- [ ] **Step 5: Run full API test suite**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun test`

Expected: PASS - all existing tests still pass, no regressions

- [ ] **Step 6: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add apps/api/src/trpc/routers/devices.ts apps/api/src/__tests__/routers/devices-climate.test.ts
git commit -m "feat: add climate/fanOn/fanOff tRPC procedures to devices router"
git push
```

---

### Task 4: React Hook - useClimate

**Files:**
- Create: `apps/web/src/hooks/use-climate.ts`
- Test: `apps/web/src/__tests__/use-climate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/use-climate.test.ts`:

```typescript
import { useClimate } from "@/hooks/use-climate";
import { trpc } from "@/lib/trpc";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    devices: {
      climate: {
        useQuery: vi.fn(),
      },
      fanOn: {
        useMutation: vi.fn(),
      },
      fanOff: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const mockClimateQuery = vi.mocked(trpc.devices.climate.useQuery);
const mockFanOnMutation = vi.mocked(trpc.devices.fanOn.useMutation);
const mockFanOffMutation = vi.mocked(trpc.devices.fanOff.useMutation);

function setupMocks({
  queryData = undefined as
    | {
        entityId: string;
        friendlyName: string;
        currentTemp: number | null;
        tempUnit: "F" | "C";
        hvacMode: string;
        hvacAction: string | null;
        fanOn: boolean;
        fanEntityId: string | null;
      }
    | { error: string }
    | undefined,
  isLoading = false,
  isError = false,
} = {}) {
  const fanOnMutate = vi.fn();
  const fanOffMutate = vi.fn();
  mockClimateQuery.mockReturnValue({ data: queryData, isLoading, isError } as never);
  mockFanOnMutation.mockReturnValue({ mutate: fanOnMutate } as never);
  mockFanOffMutation.mockReturnValue({ mutate: fanOffMutate } as never);
  return { fanOnMutate, fanOffMutate };
}

describe("useClimate", () => {
  it("returns null values when loading", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useClimate());
    expect(result.current.entityId).toBeNull();
    expect(result.current.currentTemp).toBeNull();
    expect(result.current.fanOn).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns climate data when query succeeds", () => {
    setupMocks({
      queryData: {
        entityId: "climate.living_room",
        friendlyName: "Living Room AC",
        currentTemp: 72,
        tempUnit: "F",
        hvacMode: "cool",
        hvacAction: "cooling",
        fanOn: false,
        fanEntityId: null,
      },
    });
    const { result } = renderHook(() => useClimate());
    expect(result.current.entityId).toBe("climate.living_room");
    expect(result.current.currentTemp).toBe(72);
    expect(result.current.tempUnit).toBe("F");
    expect(result.current.hvacMode).toBe("cool");
    expect(result.current.fanOn).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("returns isError true when query fails", () => {
    setupMocks({ isError: true });
    const { result } = renderHook(() => useClimate());
    expect(result.current.isError).toBe(true);
  });

  it("returns isError true when data contains error field", () => {
    setupMocks({ queryData: { error: "HA unavailable" } });
    const { result } = renderHook(() => useClimate());
    expect(result.current.isError).toBe(true);
  });

  it("turnFanOn calls fanOn mutation with entityId and fanEntityId", () => {
    const { fanOnMutate } = setupMocks();
    const { result } = renderHook(() => useClimate());
    result.current.turnFanOn("climate.lr", "fan.lr");
    expect(fanOnMutate).toHaveBeenCalledWith({ entityId: "climate.lr", fanEntityId: "fan.lr" });
  });

  it("turnFanOff calls fanOff mutation with entityId and fanEntityId", () => {
    const { fanOffMutate } = setupMocks();
    const { result } = renderHook(() => useClimate());
    result.current.turnFanOff("climate.lr", "fan.lr");
    expect(fanOffMutate).toHaveBeenCalledWith({ entityId: "climate.lr", fanEntityId: "fan.lr" });
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test src/__tests__/use-climate.test.ts`

Expected: FAIL - module `@/hooks/use-climate` not found

- [ ] **Step 3: Write implementation**

Create `apps/web/src/hooks/use-climate.ts`:

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
  const hasError = "error" in (data ?? {});

  const state = !hasError && data ? data : null;

  return {
    entityId: state?.entityId ?? null,
    fanEntityId: state?.fanEntityId ?? null,
    friendlyName: state?.friendlyName ?? null,
    currentTemp: state?.currentTemp ?? null,
    tempUnit: state?.tempUnit ?? "F",
    hvacMode: state?.hvacMode ?? null,
    fanOn: state?.fanOn ?? false,
    isLoading: climate.isLoading,
    isError: hasError || climate.isError,
    turnFanOn: (entityId: string, fanEntityId?: string | null) =>
      fanOnMutation.mutate({ entityId, fanEntityId }),
    turnFanOff: (entityId: string, fanEntityId?: string | null) =>
      fanOffMutation.mutate({ entityId, fanEntityId }),
  };
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test src/__tests__/use-climate.test.ts`

Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add apps/web/src/hooks/use-climate.ts apps/web/src/__tests__/use-climate.test.ts
git commit -m "feat: add useClimate hook with polling and fan mutations"
git push
```

---

### Task 5: React Component - ClimateCard

**Files:**
- Create: `apps/web/src/components/hub/climate-card.tsx`
- Test: `apps/web/src/__tests__/climate-card.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/climate-card.test.tsx`:

```typescript
import { ClimateCard } from "@/components/hub/climate-card";
import * as useClimateModule from "@/hooks/use-climate";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-climate");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseClimate = vi.mocked(useClimateModule.useClimate);

const turnFanOnFn = vi.fn();
const turnFanOffFn = vi.fn();

function setupHook(overrides = {}) {
  mockUseClimate.mockReturnValue({
    entityId: "climate.living_room",
    fanEntityId: null,
    friendlyName: "Living Room AC",
    currentTemp: 72,
    tempUnit: "F" as const,
    hvacMode: "cool",
    fanOn: false,
    isLoading: false,
    isError: false,
    turnFanOn: turnFanOnFn,
    turnFanOff: turnFanOffFn,
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe("ClimateCard", () => {
  it("shows current temperature", () => {
    render(<ClimateCard />);
    expect(screen.getByText("72\u00b0F")).toBeInTheDocument();
  });

  it("shows hvac mode", () => {
    render(<ClimateCard />);
    expect(screen.getByText("cool")).toBeInTheDocument();
  });

  it("renders Fan On and Fan Off buttons", () => {
    render(<ClimateCard />);
    expect(screen.getByRole("button", { name: /fan on/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fan off/i })).toBeInTheDocument();
  });

  it("calls turnFanOn when Fan On clicked", () => {
    render(<ClimateCard />);
    fireEvent.click(screen.getByRole("button", { name: /fan on/i }));
    expect(turnFanOnFn).toHaveBeenCalledWith("climate.living_room", null);
  });

  it("calls turnFanOff when Fan Off clicked", () => {
    render(<ClimateCard />);
    fireEvent.click(screen.getByRole("button", { name: /fan off/i }));
    expect(turnFanOffFn).toHaveBeenCalledWith("climate.living_room", null);
  });

  it("highlights Fan On button when fan is on", () => {
    setupHook({ fanOn: true });
    render(<ClimateCard />);
    const fanOnBtn = screen.getByRole("button", { name: /fan on/i });
    expect(fanOnBtn.className).toContain("bg-white/10");
  });

  it("highlights Fan Off button when fan is off", () => {
    setupHook({ fanOn: false });
    render(<ClimateCard />);
    const fanOffBtn = screen.getByRole("button", { name: /fan off/i });
    expect(fanOffBtn.className).toContain("bg-white/10");
  });

  it("shows Unavailable and disables buttons on error", () => {
    setupHook({ isError: true });
    render(<ClimateCard />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fan on/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fan off/i })).toBeDisabled();
  });

  it("shows loading state and disables buttons", () => {
    setupHook({ isLoading: true });
    render(<ClimateCard />);
    expect(screen.getByText("--\u00b0F")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fan on/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fan off/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test src/__tests__/climate-card.test.tsx`

Expected: FAIL - module `@/components/hub/climate-card` not found

- [ ] **Step 3: Write implementation**

Create `apps/web/src/components/hub/climate-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { useClimate } from "@/hooks/use-climate";

export function ClimateCard() {
  const {
    entityId,
    fanEntityId,
    currentTemp,
    tempUnit,
    hvacMode,
    fanOn,
    isLoading,
    isError,
    turnFanOn,
    turnFanOff,
  } = useClimate();

  const tempLabel = isLoading
    ? `--\u00b0${tempUnit}`
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
              if (entityId) turnFanOn(entityId, fanEntityId);
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
              if (entityId) turnFanOff(entityId, fanEntityId);
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

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test src/__tests__/climate-card.test.tsx`

Expected: PASS (all 9 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add apps/web/src/components/hub/climate-card.tsx apps/web/src/__tests__/climate-card.test.tsx
git commit -m "feat: add ClimateCard component with fan toggle buttons"
git push
```

---

### Task 6: Widget Grid - Add ClimateCard and expand to 4x3

**Files:**
- Modify: `apps/web/src/components/hub/widget-grid.tsx:1-57`
- Modify: `apps/web/src/__tests__/widget-grid.test.tsx:1-87`

- [ ] **Step 1: Update widget-grid test to expect 8 cards**

Edit `apps/web/src/__tests__/widget-grid.test.tsx`:

Add `use-climate` mock alongside existing hook mocks:

```typescript
vi.mock("@/hooks/use-climate", () => ({
  useClimate: () => ({
    entityId: "climate.living_room",
    fanEntityId: null,
    friendlyName: "Living Room AC",
    currentTemp: 72,
    tempUnit: "F",
    hvacMode: "cool",
    fanOn: false,
    isLoading: false,
    isError: false,
    turnFanOn: vi.fn(),
    turnFanOff: vi.fn(),
  }),
}));
```

Update the card count test:
- Change test name from `"renders all 7 widget cards"` to `"renders all 8 widget cards"`
- Add assertion: `expect(screen.getByTestId("widget-card-climate")).toBeInTheDocument();`

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test src/__tests__/widget-grid.test.tsx`

Expected: FAIL - `widget-card-climate` not found

- [ ] **Step 3: Update widget-grid.tsx**

Add import at top of `apps/web/src/components/hub/widget-grid.tsx`:

```typescript
import { ClimateCard } from "@/components/hub/climate-card";
```

Add `<ClimateCard />` after `<ThemeToggleCard />` inside the grid div.

Update grid style:
- `gridTemplateRows`: change from `"1fr 1fr 1fr"` to `"1fr 1fr 1fr 1fr"`
- `gridTemplateAreas`: change to:
```
"weather weather clock"
"wifi    lights  lights"
"calendar music  theme"
"climate climate climate"
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test src/__tests__/widget-grid.test.tsx`

Expected: PASS (all tests)

- [ ] **Step 5: Run full web test suite**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun test`

Expected: PASS - all existing tests still pass, no regressions

- [ ] **Step 6: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add apps/web/src/components/hub/widget-grid.tsx apps/web/src/__tests__/widget-grid.test.tsx
git commit -m "feat: add ClimateCard to widget grid, expand to 4x3 layout"
git push
```

---

### Task 7: Type check and lint

**Files:**
- No new files

- [ ] **Step 1: Type check API**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bunx tsc --noEmit`

Expected: No type errors

- [ ] **Step 2: Type check web**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bunx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Lint API**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/api && bun run lint:fix`

Expected: No unfixable errors

- [ ] **Step 4: Lint web**

Run: `cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control/apps/web && bun run lint:fix`

Expected: No unfixable errors

- [ ] **Step 5: Commit any lint fixes**

Only if lint auto-fixed anything:

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+ha-climate-fan-control
git add -A
git commit -m "chore: apply lint fixes for climate card feature"
git push
```

---

## Self-Review Checklist

1. **Spec coverage**: Every requirement from the design spec has a corresponding task:
   - `getClimateState` with fan entity matching (Task 1)
   - `turnFanOn`/`turnFanOff` with dedicated fan support (Task 2)
   - tRPC procedures (Task 3)
   - `useClimate` hook (Task 4)
   - `ClimateCard` component (Task 5)
   - Widget grid expansion to 4x3 (Task 6)
   - Type check and lint (Task 7)

2. **Placeholder scan**: No "TBD", "TODO", or vague steps found.

3. **Type consistency**: `ClimateState` interface matches across service, router, hook, and component. `fanEntityId` is `string | null` everywhere.

4. **TDD compliance**: Every task (1-6) starts with writing failing tests before implementation.
