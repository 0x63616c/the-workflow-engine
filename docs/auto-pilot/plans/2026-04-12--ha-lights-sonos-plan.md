# HA + Lights + Sonos Implementation Plan

**Goal:** Wire Home Assistant REST API into the app to power a live lights on/off widget and a full Sonos music panel with playback controls and per-speaker volume.

**Architecture:** Frontend polls tRPC at 5s intervals; tRPC procedures are thin wrappers over a services layer; services call a singleton `HomeAssistantIntegration` class that makes HTTP fetch calls to the HA REST API. No SQLite persistence — all state is live from HA.

**Tech Stack:** Bun fetch (no extra HTTP lib), tRPC v11, Zod, React 19, TanStack Query, Zustand, Vitest, Testing Library.

---

## Phase 1: HA Foundation (Tasks 1–5, sequential)

These tasks must be completed in order before Lights or Sonos work begins.

---

### Task 1: Env Vars

**Phase:** HA Foundation

**Files:**
- Modify: `apps/api/src/env.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/__tests__/env.test.ts
import { describe, it, expect } from "vitest";

describe("env schema", () => {
  it("parses HA_URL with valid URL", () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      HA_URL: "http://homeassistant.local:8123",
      HA_TOKEN: "abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.HA_URL).toBe("http://homeassistant.local:8123");
    }
  });

  it("uses default HA_URL when not set", () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      HA_URL: undefined,
      HA_TOKEN: "abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.HA_URL).toBe("http://homeassistant.local:8123");
    }
  });

  it("fails when HA_TOKEN is missing", () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      HA_URL: "http://homeassistant.local:8123",
      HA_TOKEN: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("fails when HA_TOKEN is empty string", () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      HA_URL: "http://homeassistant.local:8123",
      HA_TOKEN: "",
    });
    expect(result.success).toBe(false);
  });
});
```

Note: `envSchema` must be exported (not just `env`) for this test. Add `export const envSchema = ...` to env.ts.

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/env.test.ts
```

Expected: FAIL (envSchema not exported, HA_URL/HA_TOKEN not in schema)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/env.ts
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4201),
  PORT_OFFSET: z.coerce.number().int().min(0).max(99).default(0),
  DATABASE_URL: z.string().default("./data.db"),
  BUILD_HASH: z.string().default("dev"),
  INNGEST_EVENT_KEY: z.string().default("local-dev-event-key-00000000"),
  INNGEST_SIGNING_KEY: z.string().default("signing-key-0000000000000000"),
  INNGEST_DEV: z.coerce.number().int().default(1),
  HA_URL: z.string().url().default("http://homeassistant.local:8123"),
  HA_TOKEN: z.string().min(1),
});

export const env = envSchema.parse(process.env);
export const EFFECTIVE_PORT = env.PORT + env.PORT_OFFSET;
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/env.test.ts
```

Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/api/src/env.ts apps/api/src/__tests__/env.test.ts && git commit -m "feat: add HA_URL and HA_TOKEN env vars"
```

---

### Task 2: HA Types

**Phase:** HA Foundation

**Files:**
- Create: `apps/api/src/integrations/homeassistant/types.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/__tests__/integrations/ha-types.test.ts
import { describe, it, expect } from "vitest";
import type { HaEntity } from "../../integrations/homeassistant/types";
import { HaError } from "../../integrations/homeassistant/types";

describe("HaError", () => {
  it("is an instance of Error", () => {
    const err = new HaError(401, "Unauthorized");
    expect(err).toBeInstanceOf(Error);
  });

  it("sets name to HaError", () => {
    const err = new HaError(401, "Unauthorized");
    expect(err.name).toBe("HaError");
  });

  it("stores status code", () => {
    const err = new HaError(503, "Service Unavailable");
    expect(err.status).toBe(503);
  });

  it("stores message", () => {
    const err = new HaError(404, "Not Found");
    expect(err.message).toBe("Not Found");
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/integrations/ha-types.test.ts
```

Expected: FAIL (file does not exist)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/integrations/homeassistant/types.ts
export interface HaEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_updated: string;
}

export class HaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HaError";
  }
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/integrations/ha-types.test.ts
```

Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/api/src/integrations/homeassistant/types.ts apps/api/src/__tests__/integrations/ha-types.test.ts && git commit -m "feat: add HA integration types (HaEntity, HaError)"
```

---

### Task 3: HA REST Client

**Phase:** HA Foundation

**Files:**
- Create: `apps/api/src/integrations/homeassistant/index.ts`
- Create: `apps/api/src/__tests__/integrations/homeassistant.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/__tests__/integrations/homeassistant.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HomeAssistantIntegration, ha } from "../../integrations/homeassistant";
import { HaError } from "../../integrations/homeassistant/types";

const MOCK_URL = "http://ha.local:8123";
const MOCK_TOKEN = "test-token-abc";

// Mock env before importing integration
vi.mock("../../env", () => ({
  env: {
    HA_URL: MOCK_URL,
    HA_TOKEN: MOCK_TOKEN,
  },
}));

describe("HomeAssistantIntegration", () => {
  let client: HomeAssistantIntegration;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    client = new HomeAssistantIntegration();
    await client.init();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("init()", () => {
    it("sets integration id to 'homeassistant'", () => {
      expect(client.id).toBe("homeassistant");
    });

    it("sets integration name", () => {
      expect(client.name).toBe("Home Assistant");
    });
  });

  describe("getState()", () => {
    it("returns connected true after init", async () => {
      const state = await client.getState();
      expect(state).toEqual({ connected: true });
    });
  });

  describe("getEntities(domain)", () => {
    it("returns only entities matching the domain", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { entity_id: "light.living_room", state: "on", attributes: {}, last_updated: "2026-01-01T00:00:00Z" },
          { entity_id: "light.bedroom", state: "off", attributes: {}, last_updated: "2026-01-01T00:00:00Z" },
          { entity_id: "media_player.sonos", state: "playing", attributes: {}, last_updated: "2026-01-01T00:00:00Z" },
        ],
      });

      const lights = await client.getEntities("light");
      expect(lights).toHaveLength(2);
      expect(lights[0].entity_id).toBe("light.living_room");
      expect(lights[1].entity_id).toBe("light.bedroom");
    });

    it("calls GET /api/states with Authorization header", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

      await client.getEntities("light");

      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_URL}/api/states`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        }),
      );
    });

    it("throws HaError on non-2xx response", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "Unauthorized" });

      await expect(client.getEntities("light")).rejects.toThrow(HaError);
      await expect(client.getEntities("light")).rejects.toMatchObject({ status: 401 });
    });

    it("throws HaError when fetch throws (network error)", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getEntities("light")).rejects.toThrow(HaError);
    });
  });

  describe("getEntity(entityId)", () => {
    it("calls GET /api/states/<entity_id>", async () => {
      const mockEntity = { entity_id: "light.living_room", state: "on", attributes: {}, last_updated: "" };
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => mockEntity });

      const result = await client.getEntity("light.living_room");
      expect(result.entity_id).toBe("light.living_room");
      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_URL}/api/states/light.living_room`,
        expect.anything(),
      );
    });
  });

  describe("callService(domain, service, params)", () => {
    it("calls POST /api/services/<domain>/<service> with JSON body", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

      await client.callService("light", "turn_on", { entity_id: "all" });

      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_URL}/api/services/light/turn_on`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ entity_id: "all" }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("throws HaError on non-2xx response", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503, text: async () => "Service Unavailable" });

      await expect(client.callService("light", "turn_on", {})).rejects.toThrow(HaError);
    });
  });
});

describe("ha singleton", () => {
  it("is an instance of HomeAssistantIntegration", () => {
    expect(ha).toBeInstanceOf(HomeAssistantIntegration);
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/integrations/homeassistant.test.ts
```

Expected: FAIL (file does not exist)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/integrations/homeassistant/index.ts
import type { Integration } from "../types";
import { HaError, type HaEntity } from "./types";
import { env } from "../../env";

export class HomeAssistantIntegration implements Integration {
  id = "homeassistant";
  name = "Home Assistant";

  private baseUrl = "";
  private token = "";

  async init(): Promise<void> {
    this.baseUrl = env.HA_URL;
    this.token = env.HA_TOKEN;
  }

  async getState(): Promise<Record<string, unknown>> {
    return { connected: true };
  }

  async execute(command: string, params: Record<string, unknown>): Promise<unknown> {
    return null;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          ...this.authHeaders(),
          ...(init?.headers ?? {}),
        },
      });
    } catch (err) {
      throw new HaError(0, `Network error: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new HaError(res.status, text);
    }
    return res.json() as Promise<T>;
  }

  async getEntities(domain: string): Promise<HaEntity[]> {
    const all = await this.request<HaEntity[]>(`${this.baseUrl}/api/states`);
    return all.filter((e) => e.entity_id.startsWith(`${domain}.`));
  }

  async getEntity(entityId: string): Promise<HaEntity> {
    return this.request<HaEntity>(`${this.baseUrl}/api/states/${entityId}`);
  }

  async callService(
    domain: string,
    service: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`${this.baseUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export const ha = new HomeAssistantIntegration();
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/integrations/homeassistant.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/api/src/integrations/homeassistant/ apps/api/src/__tests__/integrations/homeassistant.test.ts && git commit -m "feat: add HomeAssistantIntegration REST client"
```

---

### Task 4: HA Service

**Phase:** HA Foundation

**Files:**
- Create: `apps/api/src/services/ha-service.ts`
- Create: `apps/api/src/__tests__/services/ha-service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/__tests__/services/ha-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLightsState,
  turnAllLightsOn,
  turnAllLightsOff,
  getMediaPlayers,
  mediaPlayerCommand,
  setVolume,
} from "../../services/ha-service";
import { ha } from "../../integrations/homeassistant";

vi.mock("../../integrations/homeassistant", () => ({
  ha: {
    getEntities: vi.fn(),
    getEntity: vi.fn(),
    callService: vi.fn(),
    init: vi.fn(),
  },
}));

const mockGetEntities = vi.mocked(ha.getEntities);
const mockGetEntity = vi.mocked(ha.getEntity);
const mockCallService = vi.mocked(ha.callService);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLightsState()", () => {
  it("counts on and total entities", async () => {
    mockGetEntities.mockResolvedValueOnce([
      { entity_id: "light.a", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.b", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.c", state: "off", attributes: {}, last_updated: "" },
      { entity_id: "light.d", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.e", state: "off", attributes: {}, last_updated: "" },
    ]);

    const result = await getLightsState();
    expect(result).toEqual({ onCount: 3, totalCount: 5 });
  });

  it("returns zero counts when no lights", async () => {
    mockGetEntities.mockResolvedValueOnce([]);
    const result = await getLightsState();
    expect(result).toEqual({ onCount: 0, totalCount: 0 });
  });
});

describe("turnAllLightsOn()", () => {
  it("calls callService with light, turn_on, entity_id all", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnAllLightsOn();
    expect(mockCallService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "all" });
  });
});

describe("turnAllLightsOff()", () => {
  it("calls callService with light, turn_off, entity_id all", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnAllLightsOff();
    expect(mockCallService).toHaveBeenCalledWith("light", "turn_off", { entity_id: "all" });
  });
});

describe("getMediaPlayers()", () => {
  it("maps HA entity attributes to MediaPlayer shape", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "media_player.living_room",
        state: "playing",
        attributes: {
          friendly_name: "Living Room",
          media_title: "Song A",
          media_artist: "Artist A",
          media_album_name: "Album A",
          entity_picture: "/api/media_player_proxy/abc",
          volume_level: 0.6,
          shuffle: true,
          repeat: "off",
          media_position: 30,
          media_duration: 180,
          media_position_updated_at: "2026-01-01T00:00:30Z",
        },
        last_updated: "",
      },
    ]);

    const players = await getMediaPlayers();
    expect(players).toHaveLength(1);
    const p = players[0];
    expect(p.entityId).toBe("media_player.living_room");
    expect(p.friendlyName).toBe("Living Room");
    expect(p.state).toBe("playing");
    expect(p.attributes.volume).toBe(60);
    expect(p.attributes.shuffle).toBe(true);
    expect(p.attributes.repeat).toBe("off");
    expect(p.attributes.mediaTitle).toBe("Song A");
    expect(p.attributes.mediaArtist).toBe("Artist A");
    expect(p.attributes.mediaPosition).toBe(30);
    expect(p.attributes.mediaDuration).toBe(180);
    // albumArtUrl should be full URL
    expect(p.attributes.albumArtUrl).toContain("/api/media_player_proxy/abc");
  });

  it("handles missing optional attributes gracefully", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "media_player.bedroom",
        state: "off",
        attributes: { friendly_name: "Bedroom", volume_level: 0.3 },
        last_updated: "",
      },
    ]);

    const players = await getMediaPlayers();
    const p = players[0];
    expect(p.attributes.mediaTitle).toBeUndefined();
    expect(p.attributes.albumArtUrl).toBeUndefined();
    expect(p.attributes.volume).toBe(30);
  });

  it("sorts players alphabetically by friendlyName", async () => {
    mockGetEntities.mockResolvedValueOnce([
      { entity_id: "media_player.z", state: "off", attributes: { friendly_name: "Zebra", volume_level: 0 }, last_updated: "" },
      { entity_id: "media_player.a", state: "off", attributes: { friendly_name: "Apple", volume_level: 0 }, last_updated: "" },
    ]);

    const players = await getMediaPlayers();
    expect(players[0].friendlyName).toBe("Apple");
    expect(players[1].friendlyName).toBe("Zebra");
  });
});

describe("mediaPlayerCommand()", () => {
  it("maps 'play' to media_player.media_play", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "play");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_play", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'pause' to media_player.media_pause", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "pause");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_pause", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'next' to media_player.media_next_track", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "next");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_next_track", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'previous' to media_player.media_previous_track", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "previous");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_previous_track", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'shuffle' to media_player.shuffle_set and toggles current value", async () => {
    mockGetEntity.mockResolvedValueOnce({
      entity_id: "media_player.living_room",
      state: "playing",
      attributes: { shuffle: false },
      last_updated: "",
    });
    mockCallService.mockResolvedValueOnce(undefined);

    await mediaPlayerCommand("media_player.living_room", "shuffle");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "shuffle_set", {
      entity_id: "media_player.living_room",
      shuffle: true,
    });
  });

  it("maps 'repeat' to media_player.repeat_set and cycles off->one->all->off", async () => {
    mockGetEntity.mockResolvedValueOnce({
      entity_id: "media_player.living_room",
      state: "playing",
      attributes: { repeat: "off" },
      last_updated: "",
    });
    mockCallService.mockResolvedValueOnce(undefined);

    await mediaPlayerCommand("media_player.living_room", "repeat");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "repeat_set", {
      entity_id: "media_player.living_room",
      repeat: "one",
    });
  });
});

describe("setVolume()", () => {
  it("scales integer 0-100 to float 0.0-1.0", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await setVolume("media_player.living_room", 60);
    expect(mockCallService).toHaveBeenCalledWith("media_player", "volume_set", {
      entity_id: "media_player.living_room",
      volume_level: 0.6,
    });
  });

  it("handles volume 0", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await setVolume("media_player.living_room", 0);
    expect(mockCallService).toHaveBeenCalledWith("media_player", "volume_set", {
      entity_id: "media_player.living_room",
      volume_level: 0,
    });
  });

  it("handles volume 100", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await setVolume("media_player.living_room", 100);
    expect(mockCallService).toHaveBeenCalledWith("media_player", "volume_set", {
      entity_id: "media_player.living_room",
      volume_level: 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/services/ha-service.test.ts
```

Expected: FAIL (file does not exist)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/services/ha-service.ts
import { ha } from "../integrations/homeassistant";
import { env } from "../env";

export interface LightsState {
  onCount: number;
  totalCount: number;
}

export interface MediaPlayer {
  entityId: string;
  friendlyName: string;
  state: "playing" | "paused" | "idle" | "off" | "unavailable";
  attributes: {
    mediaTitle?: string;
    mediaArtist?: string;
    mediaAlbumName?: string;
    albumArtUrl?: string;
    volume: number;
    shuffle: boolean;
    repeat: "off" | "one" | "all";
    mediaPosition?: number;
    mediaDuration?: number;
    mediaPositionUpdatedAt?: string;
  };
}

export type MediaPlayerCommand = "play" | "pause" | "next" | "previous" | "shuffle" | "repeat";

const REPEAT_CYCLE: Array<"off" | "one" | "all"> = ["off", "one", "all"];

export async function getLightsState(): Promise<LightsState> {
  const entities = await ha.getEntities("light");
  return {
    onCount: entities.filter((e) => e.state === "on").length,
    totalCount: entities.length,
  };
}

export async function turnAllLightsOn(): Promise<void> {
  await ha.callService("light", "turn_on", { entity_id: "all" });
}

export async function turnAllLightsOff(): Promise<void> {
  await ha.callService("light", "turn_off", { entity_id: "all" });
}

function normalizePlayerState(state: string): MediaPlayer["state"] {
  if (state === "playing" || state === "paused" || state === "idle" || state === "off") {
    return state;
  }
  return "unavailable";
}

export async function getMediaPlayers(): Promise<MediaPlayer[]> {
  const entities = await ha.getEntities("media_player");
  const players: MediaPlayer[] = entities.map((e) => {
    const attrs = e.attributes;
    const entityPicture = attrs.entity_picture as string | undefined;
    const albumArtUrl =
      entityPicture != null
        ? entityPicture.startsWith("http")
          ? entityPicture
          : `${env.HA_URL}${entityPicture}`
        : undefined;

    return {
      entityId: e.entity_id,
      friendlyName: (attrs.friendly_name as string) ?? e.entity_id,
      state: normalizePlayerState(e.state),
      attributes: {
        mediaTitle: attrs.media_title as string | undefined,
        mediaArtist: attrs.media_artist as string | undefined,
        mediaAlbumName: attrs.media_album_name as string | undefined,
        albumArtUrl,
        volume: Math.round(((attrs.volume_level as number) ?? 0) * 100),
        shuffle: Boolean(attrs.shuffle),
        repeat: (attrs.repeat as "off" | "one" | "all") ?? "off",
        mediaPosition: attrs.media_position as number | undefined,
        mediaDuration: attrs.media_duration as number | undefined,
        mediaPositionUpdatedAt: attrs.media_position_updated_at as string | undefined,
      },
    };
  });

  return players.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
}

export async function mediaPlayerCommand(
  entityId: string,
  command: MediaPlayerCommand,
): Promise<void> {
  if (command === "shuffle") {
    const entity = await ha.getEntity(entityId);
    const current = Boolean(entity.attributes.shuffle);
    await ha.callService("media_player", "shuffle_set", { entity_id: entityId, shuffle: !current });
    return;
  }

  if (command === "repeat") {
    const entity = await ha.getEntity(entityId);
    const current = (entity.attributes.repeat as "off" | "one" | "all") ?? "off";
    const idx = REPEAT_CYCLE.indexOf(current);
    const next = REPEAT_CYCLE[(idx + 1) % REPEAT_CYCLE.length];
    await ha.callService("media_player", "repeat_set", { entity_id: entityId, repeat: next });
    return;
  }

  const serviceMap: Record<string, string> = {
    play: "media_play",
    pause: "media_pause",
    next: "media_next_track",
    previous: "media_previous_track",
  };

  await ha.callService("media_player", serviceMap[command], { entity_id: entityId });
}

export async function setVolume(entityId: string, volumeLevel: number): Promise<void> {
  await ha.callService("media_player", "volume_set", {
    entity_id: entityId,
    volume_level: volumeLevel / 100,
  });
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/services/ha-service.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/api/src/services/ha-service.ts apps/api/src/__tests__/services/ha-service.test.ts && git commit -m "feat: add ha-service with lights and media player logic"
```

---

### Task 5: tRPC Devices Router + Server Init

**Phase:** HA Foundation

**Files:**
- Create: `apps/api/src/trpc/routers/devices.ts`
- Modify: `apps/api/src/trpc/routers/index.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/api/src/__tests__/routers/devices.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/__tests__/routers/devices.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../../trpc/routers";
import * as haService from "../../services/ha-service";
import { HaError } from "../../integrations/homeassistant/types";

vi.mock("../../services/ha-service", () => ({
  getLightsState: vi.fn(),
  turnAllLightsOn: vi.fn(),
  turnAllLightsOff: vi.fn(),
  getMediaPlayers: vi.fn(),
  mediaPlayerCommand: vi.fn(),
  setVolume: vi.fn(),
}));

const caller = appRouter.createCaller({} as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("devices.lights", () => {
  it("returns LightsState on success", async () => {
    vi.mocked(haService.getLightsState).mockResolvedValueOnce({ onCount: 3, totalCount: 5 });
    const result = await caller.devices.lights();
    expect(result).toEqual({ onCount: 3, totalCount: 5 });
  });

  it("returns error object when HaError thrown", async () => {
    vi.mocked(haService.getLightsState).mockRejectedValueOnce(new HaError(503, "Unavailable"));
    const result = await caller.devices.lights();
    expect(result).toHaveProperty("error");
  });
});

describe("devices.lightsOn", () => {
  it("calls turnAllLightsOn", async () => {
    vi.mocked(haService.turnAllLightsOn).mockResolvedValueOnce(undefined);
    await caller.devices.lightsOn();
    expect(haService.turnAllLightsOn).toHaveBeenCalledOnce();
  });
});

describe("devices.lightsOff", () => {
  it("calls turnAllLightsOff", async () => {
    vi.mocked(haService.turnAllLightsOff).mockResolvedValueOnce(undefined);
    await caller.devices.lightsOff();
    expect(haService.turnAllLightsOff).toHaveBeenCalledOnce();
  });
});

describe("devices.mediaPlayers", () => {
  it("returns array of MediaPlayer on success", async () => {
    const mockPlayers = [
      {
        entityId: "media_player.living_room",
        friendlyName: "Living Room",
        state: "playing" as const,
        attributes: {
          volume: 60,
          shuffle: false,
          repeat: "off" as const,
        },
      },
    ];
    vi.mocked(haService.getMediaPlayers).mockResolvedValueOnce(mockPlayers);
    const result = await caller.devices.mediaPlayers();
    expect(result).toEqual(mockPlayers);
  });

  it("returns error object when HaError thrown", async () => {
    vi.mocked(haService.getMediaPlayers).mockRejectedValueOnce(new HaError(401, "Auth failed"));
    const result = await caller.devices.mediaPlayers();
    expect(result).toHaveProperty("error");
  });
});

describe("devices.mediaPlayerCommand", () => {
  it("calls mediaPlayerCommand with correct args", async () => {
    vi.mocked(haService.mediaPlayerCommand).mockResolvedValueOnce(undefined);
    await caller.devices.mediaPlayerCommand({ entityId: "media_player.lr", command: "play" });
    expect(haService.mediaPlayerCommand).toHaveBeenCalledWith("media_player.lr", "play");
  });

  it("rejects invalid command via Zod", async () => {
    await expect(
      caller.devices.mediaPlayerCommand({ entityId: "x", command: "invalid" as never }),
    ).rejects.toThrow();
  });
});

describe("devices.setVolume", () => {
  it("calls setVolume with correct args", async () => {
    vi.mocked(haService.setVolume).mockResolvedValueOnce(undefined);
    await caller.devices.setVolume({ entityId: "media_player.lr", volumeLevel: 75 });
    expect(haService.setVolume).toHaveBeenCalledWith("media_player.lr", 75);
  });

  it("rejects volume > 100 via Zod", async () => {
    await expect(
      caller.devices.setVolume({ entityId: "x", volumeLevel: 101 }),
    ).rejects.toThrow();
  });

  it("rejects volume < 0 via Zod", async () => {
    await expect(
      caller.devices.setVolume({ entityId: "x", volumeLevel: -1 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/routers/devices.test.ts
```

Expected: FAIL (devices router does not exist)

- [ ] **Step 3: Write minimal implementation**

**`apps/api/src/trpc/routers/devices.ts`:**
```typescript
import { z } from "zod";
import { publicProcedure, router } from "../init";
import {
  getLightsState,
  turnAllLightsOn,
  turnAllLightsOff,
  getMediaPlayers,
  mediaPlayerCommand,
  setVolume,
} from "../../services/ha-service";
import { HaError } from "../../integrations/homeassistant/types";

export const devicesRouter = router({
  lights: publicProcedure.query(async () => {
    try {
      return await getLightsState();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  lightsOn: publicProcedure.mutation(async () => {
    try {
      await turnAllLightsOn();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  lightsOff: publicProcedure.mutation(async () => {
    try {
      await turnAllLightsOff();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  mediaPlayers: publicProcedure.query(async () => {
    try {
      return await getMediaPlayers();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  mediaPlayerCommand: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        command: z.enum(["play", "pause", "next", "previous", "shuffle", "repeat"]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await mediaPlayerCommand(input.entityId, input.command);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

  setVolume: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        volumeLevel: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await setVolume(input.entityId, input.volumeLevel);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),
});
```

**`apps/api/src/trpc/routers/index.ts`:**
```typescript
import { router } from "../init";
import { healthRouter } from "./health";
import { devicesRouter } from "./devices";

export const appRouter = router({
  health: healthRouter,
  devices: devicesRouter,
});

export type AppRouter = typeof appRouter;
```

**`apps/api/src/server.ts`** — add `await ha.init()` before `Bun.serve`:
```typescript
// Add these two lines before the `const inngestHandler = ...` line:
import { ha } from "./integrations/homeassistant";
// ... existing imports ...

// Add this before Bun.serve:
await ha.init();
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test src/__tests__/routers/devices.test.ts
```

Expected: PASS (all tests)

Also run full API test suite:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test
```

Expected: PASS (all tests including existing health tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/api/src/trpc/routers/devices.ts apps/api/src/trpc/routers/index.ts apps/api/src/server.ts apps/api/src/__tests__/routers/devices.test.ts && git commit -m "feat: add devices tRPC router and wire HA init to server"
```

---

## Phase 2a: Lights Widget (Tasks 6–7, parallelizable after Task 5)

---

### Task 6: useLights Hook

**Phase:** Lights

**Files:**
- Create: `apps/web/src/hooks/use-lights.ts`
- Create: `apps/web/src/__tests__/use-lights.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/__tests__/use-lights.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLights } from "@/hooks/use-lights";
import { trpc } from "@/lib/trpc";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    devices: {
      lights: {
        useQuery: vi.fn(),
      },
      lightsOn: {
        useMutation: vi.fn(),
      },
      lightsOff: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const mockLightsQuery = vi.mocked(trpc.devices.lights.useQuery);
const mockLightsOnMutation = vi.mocked(trpc.devices.lightsOn.useMutation);
const mockLightsOffMutation = vi.mocked(trpc.devices.lightsOff.useMutation);

function setupMocks({
  queryData = undefined as { onCount: number; totalCount: number } | { error: string } | undefined,
  isLoading = false,
  isError = false,
} = {}) {
  const mutateFn = vi.fn();
  mockLightsQuery.mockReturnValue({ data: queryData, isLoading, isError } as never);
  mockLightsOnMutation.mockReturnValue({ mutate: mutateFn } as never);
  mockLightsOffMutation.mockReturnValue({ mutate: mutateFn } as never);
  return mutateFn;
}

describe("useLights", () => {
  it("returns zero counts when loading", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useLights());
    expect(result.current.onCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns counts when query succeeds", () => {
    setupMocks({ queryData: { onCount: 3, totalCount: 5 } });
    const { result } = renderHook(() => useLights());
    expect(result.current.onCount).toBe(3);
    expect(result.current.totalCount).toBe(5);
    expect(result.current.isError).toBe(false);
  });

  it("returns isError true when query fails", () => {
    setupMocks({ isError: true });
    const { result } = renderHook(() => useLights());
    expect(result.current.isError).toBe(true);
  });

  it("returns isError true when data contains error field", () => {
    setupMocks({ queryData: { error: "HA unavailable" } });
    const { result } = renderHook(() => useLights());
    expect(result.current.isError).toBe(true);
  });

  it("turnOn calls lightsOn mutation", () => {
    const mutateFn = setupMocks();
    const { result } = renderHook(() => useLights());
    result.current.turnOn();
    expect(mutateFn).toHaveBeenCalled();
  });

  it("turnOff calls lightsOff mutation", () => {
    const mutateFn = setupMocks();
    const { result } = renderHook(() => useLights());
    result.current.turnOff();
    expect(mutateFn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/use-lights.test.ts
```

Expected: FAIL (hook does not exist)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/hooks/use-lights.ts
import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5_000;

export function useLights() {
  const lights = trpc.devices.lights.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const lightsOnMutation = trpc.devices.lightsOn.useMutation();
  const lightsOffMutation = trpc.devices.lightsOff.useMutation();

  const data = lights.data;
  const hasError = "error" in (data ?? {});

  return {
    onCount: !hasError && data ? (data as { onCount: number }).onCount : 0,
    totalCount: !hasError && data ? (data as { totalCount: number }).totalCount : 0,
    isLoading: lights.isLoading,
    isError: hasError || lights.isError,
    turnOn: () => lightsOnMutation.mutate(undefined),
    turnOff: () => lightsOffMutation.mutate(undefined),
  };
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/use-lights.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/hooks/use-lights.ts apps/web/src/__tests__/use-lights.test.ts && git commit -m "feat: add useLights hook"
```

---

### Task 7: LightsCard Component

**Phase:** Lights

**Files:**
- Modify: `apps/web/src/components/hub/lights-card.tsx`
- Create: `apps/web/src/__tests__/lights-card.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/__tests__/lights-card.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LightsCard } from "@/components/hub/lights-card";
import * as useLightsModule from "@/hooks/use-lights";

vi.mock("@/hooks/use-lights");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseLights = vi.mocked(useLightsModule.useLights);

const turnOnFn = vi.fn();
const turnOffFn = vi.fn();

function setupHook(overrides = {}) {
  mockUseLights.mockReturnValue({
    onCount: 3,
    totalCount: 5,
    isLoading: false,
    isError: false,
    turnOn: turnOnFn,
    turnOff: turnOffFn,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe("LightsCard", () => {
  it("shows on/total count", () => {
    render(<LightsCard />);
    expect(screen.getByText("3 of 5 on")).toBeInTheDocument();
  });

  it("renders All On and All Off buttons", () => {
    render(<LightsCard />);
    expect(screen.getByRole("button", { name: /all on/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all off/i })).toBeInTheDocument();
  });

  it("calls turnOn when All On clicked", () => {
    render(<LightsCard />);
    fireEvent.click(screen.getByRole("button", { name: /all on/i }));
    expect(turnOnFn).toHaveBeenCalledOnce();
  });

  it("calls turnOff when All Off clicked", () => {
    render(<LightsCard />);
    fireEvent.click(screen.getByRole("button", { name: /all off/i }));
    expect(turnOffFn).toHaveBeenCalledOnce();
  });

  it("shows Unavailable and disables buttons on error", () => {
    setupHook({ isError: true });
    render(<LightsCard />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all on/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /all off/i })).toBeDisabled();
  });

  it("shows loading state and disables buttons", () => {
    setupHook({ isLoading: true });
    render(<LightsCard />);
    expect(screen.getByText(/— of —/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all on/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /all off/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/lights-card.test.tsx
```

Expected: FAIL (useLights not used in LightsCard, buttons don't exist)

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/components/hub/lights-card.tsx
import { BentoCard } from "@/components/hub/bento-card";
import { useLights } from "@/hooks/use-lights";

export function LightsCard() {
  const { onCount, totalCount, isLoading, isError, turnOn, turnOff } = useLights();

  const countLabel = isLoading ? "— of —" : isError ? "Unavailable" : `${onCount} of ${totalCount} on`;
  const disabled = isLoading || isError;

  return (
    <BentoCard testId="widget-card-lights" gridArea="lights">
      <div className="flex items-center justify-between h-full">
        <div>
          <div className="text-sm text-muted-foreground mb-3">Lights</div>
          <div className="text-lg font-light text-foreground">{countLabel}</div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); turnOn(); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 text-white/60 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            All On
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); turnOff(); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 text-white/60 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            All Off
          </button>
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/lights-card.test.tsx
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/components/hub/lights-card.tsx apps/web/src/__tests__/lights-card.test.tsx && git commit -m "feat: wire LightsCard to useLights hook with All On/Off buttons"
```

---

## Phase 2b: Sonos Integration (Tasks 8–13, parallelizable after Task 5)

---

### Task 8: Navigation Store Update

**Phase:** Sonos

**Files:**
- Modify: `apps/web/src/stores/navigation-store.ts`
- Modify: `apps/web/src/__tests__/navigation-store.test.ts`

- [ ] **Step 1: Write failing test**

Add these tests to the existing navigation-store test file:

```typescript
// Add to apps/web/src/__tests__/navigation-store.test.ts

it("setView changes view to sonos", () => {
  useNavigationStore.getState().setView("sonos");
  expect(useNavigationStore.getState().view).toBe("sonos");
});

it("setView changes view from sonos back to hub", () => {
  useNavigationStore.getState().setView("sonos");
  useNavigationStore.getState().setView("hub");
  expect(useNavigationStore.getState().view).toBe("hub");
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/navigation-store.test.ts
```

Expected: FAIL (TypeScript error — "sonos" not in view type)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/stores/navigation-store.ts
import { create } from "zustand";

type View = "clock" | "hub" | "sonos";

interface NavigationState {
  view: View;
}

interface NavigationActions {
  setView: (view: View) => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  setView: (view) => set({ view }),
}));
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/navigation-store.test.ts
```

Expected: PASS (all 5 tests including existing 3)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/stores/navigation-store.ts apps/web/src/__tests__/navigation-store.test.ts && git commit -m "feat: add sonos view to navigation store"
```

---

### Task 9: useSonos Hook

**Phase:** Sonos

**Files:**
- Create: `apps/web/src/hooks/use-sonos.ts`
- Create: `apps/web/src/__tests__/use-sonos.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/__tests__/use-sonos.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSonos } from "@/hooks/use-sonos";
import { trpc } from "@/lib/trpc";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    devices: {
      mediaPlayers: {
        useQuery: vi.fn(),
      },
      mediaPlayerCommand: {
        useMutation: vi.fn(),
      },
      setVolume: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const mockMediaPlayersQuery = vi.mocked(trpc.devices.mediaPlayers.useQuery);
const mockCommandMutation = vi.mocked(trpc.devices.mediaPlayerCommand.useMutation);
const mockVolumeMutation = vi.mocked(trpc.devices.setVolume.useMutation);

const commandMutateFn = vi.fn();
const volumeMutateFn = vi.fn();

function makePlayer(overrides = {}) {
  return {
    entityId: "media_player.living_room",
    friendlyName: "Living Room",
    state: "playing" as const,
    attributes: {
      volume: 60,
      shuffle: false,
      repeat: "off" as const,
    },
    ...overrides,
  };
}

function setupMocks({
  queryData = undefined as unknown,
  isLoading = false,
  isError = false,
} = {}) {
  mockMediaPlayersQuery.mockReturnValue({ data: queryData, isLoading, isError } as never);
  mockCommandMutation.mockReturnValue({ mutate: commandMutateFn } as never);
  mockVolumeMutation.mockReturnValue({ mutate: volumeMutateFn } as never);
}

describe("useSonos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty players when loading", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useSonos());
    expect(result.current.players).toEqual([]);
    expect(result.current.activeSpeaker).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns players array on success", () => {
    const players = [makePlayer(), makePlayer({ entityId: "media_player.bedroom", friendlyName: "Bedroom", state: "paused" as const })];
    setupMocks({ queryData: players });
    const { result } = renderHook(() => useSonos());
    expect(result.current.players).toHaveLength(2);
  });

  it("activeSpeaker is first playing speaker", () => {
    const players = [
      makePlayer({ entityId: "media_player.bedroom", friendlyName: "Bedroom", state: "paused" as const }),
      makePlayer({ entityId: "media_player.living_room", friendlyName: "Living Room", state: "playing" as const }),
    ];
    setupMocks({ queryData: players });
    const { result } = renderHook(() => useSonos());
    expect(result.current.activeSpeaker?.entityId).toBe("media_player.living_room");
  });

  it("activeSpeaker falls back to first player when none playing", () => {
    const players = [
      makePlayer({ entityId: "media_player.a", state: "paused" as const }),
      makePlayer({ entityId: "media_player.b", state: "paused" as const }),
    ];
    setupMocks({ queryData: players });
    const { result } = renderHook(() => useSonos());
    expect(result.current.activeSpeaker?.entityId).toBe("media_player.a");
  });

  it("activeSpeaker is null when no players", () => {
    setupMocks({ queryData: [] });
    const { result } = renderHook(() => useSonos());
    expect(result.current.activeSpeaker).toBeNull();
  });

  it("returns isError true when query fails", () => {
    setupMocks({ isError: true });
    const { result } = renderHook(() => useSonos());
    expect(result.current.isError).toBe(true);
  });

  it("returns isError true when data contains error field", () => {
    setupMocks({ queryData: { error: "HA unavailable" } });
    const { result } = renderHook(() => useSonos());
    expect(result.current.isError).toBe(true);
  });

  it("sendCommand calls mutation with correct args", () => {
    setupMocks({ queryData: [] });
    const { result } = renderHook(() => useSonos());
    result.current.sendCommand("media_player.living_room", "play");
    expect(commandMutateFn).toHaveBeenCalledWith({
      entityId: "media_player.living_room",
      command: "play",
    });
  });

  it("setVolume calls mutation with correct args", () => {
    setupMocks({ queryData: [] });
    const { result } = renderHook(() => useSonos());
    result.current.setVolume("media_player.living_room", 75);
    expect(volumeMutateFn).toHaveBeenCalledWith({
      entityId: "media_player.living_room",
      volumeLevel: 75,
    });
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/use-sonos.test.ts
```

Expected: FAIL (hook does not exist)

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/hooks/use-sonos.ts
import { trpc } from "@/lib/trpc";
import type { MediaPlayer, MediaPlayerCommand } from "@repo/api/services/ha-service";

// Re-declare the type locally to avoid cross-package import of service types
interface SonosPlayer {
  entityId: string;
  friendlyName: string;
  state: "playing" | "paused" | "idle" | "off" | "unavailable";
  attributes: {
    mediaTitle?: string;
    mediaArtist?: string;
    mediaAlbumName?: string;
    albumArtUrl?: string;
    volume: number;
    shuffle: boolean;
    repeat: "off" | "one" | "all";
    mediaPosition?: number;
    mediaDuration?: number;
    mediaPositionUpdatedAt?: string;
  };
}

const POLL_INTERVAL_MS = 5_000;

export function useSonos() {
  const mediaPlayers = trpc.devices.mediaPlayers.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const commandMutation = trpc.devices.mediaPlayerCommand.useMutation();
  const volumeMutation = trpc.devices.setVolume.useMutation();

  const data = mediaPlayers.data;
  const hasError = !Array.isArray(data) && data != null && "error" in data;
  const players: SonosPlayer[] = Array.isArray(data) ? (data as SonosPlayer[]) : [];
  const activeSpeaker = players.find((p) => p.state === "playing") ?? players[0] ?? null;

  return {
    players,
    activeSpeaker,
    isLoading: mediaPlayers.isLoading,
    isError: hasError || mediaPlayers.isError,
    sendCommand: (entityId: string, command: string) =>
      commandMutation.mutate({ entityId, command: command as "play" | "pause" | "next" | "previous" | "shuffle" | "repeat" }),
    setVolume: (entityId: string, volumeLevel: number) =>
      volumeMutation.mutate({ entityId, volumeLevel }),
  };
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/use-sonos.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/hooks/use-sonos.ts apps/web/src/__tests__/use-sonos.test.ts && git commit -m "feat: add useSonos hook"
```

---

### Task 10: MusicCard Update

**Phase:** Sonos

**Files:**
- Modify: `apps/web/src/components/hub/music-card.tsx`
- Create: `apps/web/src/__tests__/music-card.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/__tests__/music-card.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MusicCard } from "@/components/hub/music-card";
import * as useSonosModule from "@/hooks/use-sonos";
import * as navigationStore from "@/stores/navigation-store";

vi.mock("@/hooks/use-sonos");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const setViewFn = vi.fn();
vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn((selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
    selector({ view: "hub", setView: setViewFn }),
  ),
}));

const mockUseSonos = vi.mocked(useSonosModule.useSonos);
const sendCommandFn = vi.fn();

function makePlayer(overrides = {}) {
  return {
    entityId: "media_player.living_room",
    friendlyName: "Living Room",
    state: "playing" as const,
    attributes: {
      mediaTitle: "Test Song",
      mediaArtist: "Test Artist",
      volume: 60,
      shuffle: false,
      repeat: "off" as const,
    },
    ...overrides,
  };
}

function setupHook(overrides = {}) {
  const player = makePlayer();
  mockUseSonos.mockReturnValue({
    players: [player],
    activeSpeaker: player,
    isLoading: false,
    isError: false,
    sendCommand: sendCommandFn,
    setVolume: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe("MusicCard", () => {
  it("shows track title and artist from active speaker", () => {
    render(<MusicCard />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("tapping card navigates to sonos view", () => {
    render(<MusicCard />);
    // Click the card itself (not the play button)
    fireEvent.click(screen.getByTestId("widget-card-music"));
    expect(setViewFn).toHaveBeenCalledWith("sonos");
  });

  it("play button calls sendCommand play when paused", () => {
    setupHook({ activeSpeaker: makePlayer({ state: "paused" as const }) });
    render(<MusicCard />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "play");
  });

  it("pause button calls sendCommand pause when playing", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "pause");
  });

  it("shows No speakers when no players", () => {
    setupHook({ players: [], activeSpeaker: null });
    render(<MusicCard />);
    expect(screen.getByText(/no speakers/i)).toBeInTheDocument();
  });

  it("shows Unavailable on error", () => {
    setupHook({ isError: true });
    render(<MusicCard />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/music-card.test.tsx
```

Expected: FAIL (MusicCard uses placeholder data, no useSonos hook, no navigation)

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/components/hub/music-card.tsx
import { BentoCard } from "@/components/hub/bento-card";
import { useSonos } from "@/hooks/use-sonos";
import { useNavigationStore } from "@/stores/navigation-store";
import { Pause, Play } from "lucide-react";

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
  const { activeSpeaker, players, isError, sendCommand } = useSonos();
  const setView = useNavigationStore((s) => s.setView);

  const isPlaying = activeSpeaker?.state === "playing";
  const track = activeSpeaker?.attributes.mediaTitle;
  const artist = activeSpeaker?.attributes.mediaArtist;

  return (
    <BentoCard
      testId="widget-card-music"
      gridArea="music"
      onClick={() => setView("sonos")}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Music</div>
            <EqualizerBars active={isPlaying} />
          </div>
          {isError ? (
            <div className="text-sm text-muted-foreground/50">Unavailable</div>
          ) : players.length === 0 ? (
            <div className="text-sm text-muted-foreground/50">No speakers</div>
          ) : (
            <>
              <div className="text-sm text-foreground truncate">{track ?? "Not playing"}</div>
              {artist && (
                <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">{artist}</div>
              )}
            </>
          )}
        </div>
        {activeSpeaker && !isError && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                sendCommand(activeSpeaker.entityId, isPlaying ? "pause" : "play");
              }}
            >
              {isPlaying ? (
                <Pause size={14} className="text-muted-foreground" />
              ) : (
                <Play size={14} className="text-muted-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/music-card.test.tsx
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/components/hub/music-card.tsx apps/web/src/__tests__/music-card.test.tsx && git commit -m "feat: wire MusicCard to useSonos hook with tap-to-expand"
```

---

### Task 11: Sonos Sub-Components

**Phase:** Sonos

**Files:**
- Create: `apps/web/src/components/sonos/sonos-album-art.tsx`
- Create: `apps/web/src/components/sonos/sonos-controls.tsx`
- Create: `apps/web/src/components/sonos/sonos-progress-bar.tsx`
- Create: `apps/web/src/components/sonos/sonos-speaker-list.tsx`

These components are tested via SonosPanel integration tests in Task 12. Unit testing each sub-component inline here is sufficient.

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/__tests__/sonos-sub-components.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SonosAlbumArt } from "@/components/sonos/sonos-album-art";
import { SonosControls } from "@/components/sonos/sonos-controls";
import { SonosSpeakerList } from "@/components/sonos/sonos-speaker-list";

describe("SonosAlbumArt", () => {
  it("renders img when albumArtUrl provided", () => {
    render(<SonosAlbumArt albumArtUrl="http://example.com/art.jpg" />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders fallback div when no albumArtUrl", () => {
    const { container } = render(<SonosAlbumArt albumArtUrl={undefined} />);
    expect(container.querySelector("[data-testid='album-art-fallback']")).toBeInTheDocument();
  });
});

describe("SonosControls", () => {
  const sendCommand = vi.fn();

  it("renders shuffle, previous, play/pause, next, repeat buttons", () => {
    render(
      <SonosControls
        entityId="media_player.lr"
        isPlaying={false}
        shuffle={false}
        repeat="off"
        sendCommand={sendCommand}
      />,
    );
    expect(screen.getByRole("button", { name: /shuffle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /repeat/i })).toBeInTheDocument();
  });

  it("calls sendCommand play when play clicked", () => {
    render(
      <SonosControls
        entityId="media_player.lr"
        isPlaying={false}
        shuffle={false}
        repeat="off"
        sendCommand={sendCommand}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(sendCommand).toHaveBeenCalledWith("media_player.lr", "play");
  });

  it("shows pause button when playing", () => {
    render(
      <SonosControls
        entityId="media_player.lr"
        isPlaying={true}
        shuffle={false}
        repeat="off"
        sendCommand={sendCommand}
      />,
    );
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
  });
});

describe("SonosSpeakerList", () => {
  it("renders one row per player", () => {
    const players = [
      { entityId: "media_player.a", friendlyName: "Alpha", state: "playing" as const, attributes: { volume: 60, shuffle: false, repeat: "off" as const } },
      { entityId: "media_player.b", friendlyName: "Beta", state: "paused" as const, attributes: { volume: 40, shuffle: false, repeat: "off" as const } },
    ];
    render(<SonosSpeakerList players={players} setVolume={vi.fn()} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("calls setVolume with entityId and value on slider change", () => {
    const setVolume = vi.fn();
    const players = [
      { entityId: "media_player.a", friendlyName: "Alpha", state: "playing" as const, attributes: { volume: 60, shuffle: false, repeat: "off" as const } },
    ];
    render(<SonosSpeakerList players={players} setVolume={setVolume} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
    expect(setVolume).toHaveBeenCalledWith("media_player.a", 75);
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/sonos-sub-components.test.tsx
```

Expected: FAIL (component files do not exist)

- [ ] **Step 3: Write minimal implementation**

**`apps/web/src/components/sonos/sonos-album-art.tsx`:**
```tsx
interface SonosAlbumArtProps {
  albumArtUrl?: string;
}

export function SonosAlbumArt({ albumArtUrl }: SonosAlbumArtProps) {
  if (!albumArtUrl) {
    return (
      <div
        data-testid="album-art-fallback"
        className="w-48 h-48 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900"
      />
    );
  }
  return (
    <img
      src={albumArtUrl}
      alt="Album art"
      className="w-48 h-48 rounded-2xl object-cover"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
```

**`apps/web/src/components/sonos/sonos-controls.tsx`:**
```tsx
import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Pause, Play } from "lucide-react";

interface SonosControlsProps {
  entityId: string;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: "off" | "one" | "all";
  sendCommand: (entityId: string, command: string) => void;
}

export function SonosControls({ entityId, isPlaying, shuffle, repeat, sendCommand }: SonosControlsProps) {
  const activeClass = "text-accent";
  const inactiveClass = "text-white/40";

  return (
    <div className="flex items-center justify-center gap-8">
      <button
        type="button"
        aria-label="Shuffle"
        onClick={() => sendCommand(entityId, "shuffle")}
        className={shuffle ? activeClass : inactiveClass}
      >
        <Shuffle size={18} />
      </button>
      <button
        type="button"
        aria-label="Previous"
        onClick={() => sendCommand(entityId, "previous")}
        className="text-white/80"
      >
        <SkipBack size={22} />
      </button>
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={() => sendCommand(entityId, isPlaying ? "pause" : "play")}
        className="text-white"
      >
        {isPlaying ? <Pause size={28} /> : <Play size={28} />}
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => sendCommand(entityId, "next")}
        className="text-white/80"
      >
        <SkipForward size={22} />
      </button>
      <button
        type="button"
        aria-label="Repeat"
        onClick={() => sendCommand(entityId, "repeat")}
        className={repeat !== "off" ? activeClass : inactiveClass}
      >
        {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
      </button>
    </div>
  );
}
```

**`apps/web/src/components/sonos/sonos-progress-bar.tsx`:**
```tsx
import { useEffect, useRef, useState } from "react";

interface SonosProgressBarProps {
  mediaPosition?: number;
  mediaDuration?: number;
  mediaPositionUpdatedAt?: string;
  isPlaying: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SonosProgressBar({
  mediaPosition,
  mediaDuration,
  mediaPositionUpdatedAt,
  isPlaying,
}: SonosProgressBarProps) {
  const [position, setPosition] = useState(mediaPosition ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mediaPositionUpdatedAt && mediaPosition != null) {
      const updatedAt = new Date(mediaPositionUpdatedAt).getTime();
      const elapsed = (Date.now() - updatedAt) / 1000;
      setPosition(mediaPosition + elapsed);
    } else {
      setPosition(mediaPosition ?? 0);
    }
  }, [mediaPosition, mediaPositionUpdatedAt]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setPosition((p) => p + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const duration = mediaDuration ?? 0;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <div className="w-full">
      <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white/60 rounded-full"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-white/30">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
```

**`apps/web/src/components/sonos/sonos-speaker-list.tsx`:**
```tsx
import { useRef } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

interface Player {
  entityId: string;
  friendlyName: string;
  state: string;
  attributes: { volume: number; shuffle: boolean; repeat: "off" | "one" | "all" };
}

interface SonosSpeakerListProps {
  players: Player[];
  setVolume: (entityId: string, volume: number) => void;
}

function SpeakerRow({ player, setVolume }: { player: Player; setVolume: (entityId: string, volume: number) => void }) {
  const debouncedSetVolume = useDebouncedCallback(
    (v: number) => setVolume(player.entityId, v),
    200,
  );

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-white/70 w-28 truncate">{player.friendlyName}</span>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue={player.attributes.volume}
        onChange={(e) => debouncedSetVolume(Number(e.target.value))}
        className="flex-1 accent-white/60"
      />
      <span className="text-xs text-white/30 w-8 text-right">{player.attributes.volume}%</span>
    </div>
  );
}

export function SonosSpeakerList({ players, setVolume }: SonosSpeakerListProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {players.map((p) => (
        <SpeakerRow key={p.entityId} player={p} setVolume={setVolume} />
      ))}
    </div>
  );
}
```

Note: `useDebouncedCallback` hook is needed. Create it:

**`apps/web/src/hooks/use-debounced-callback.ts`:**
```typescript
import { useCallback, useRef } from "react";

export function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay_MS: number,
): (...args: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay_MS);
    },
    [fn, delay_MS],
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/sonos-sub-components.test.tsx
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/components/sonos/ apps/web/src/hooks/use-debounced-callback.ts apps/web/src/__tests__/sonos-sub-components.test.tsx && git commit -m "feat: add Sonos sub-components (album art, controls, progress bar, speaker list)"
```

---

### Task 12: SonosPanel

**Phase:** Sonos

**Files:**
- Create: `apps/web/src/components/sonos/sonos-panel.tsx`
- Create: `apps/web/src/__tests__/sonos-panel.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/__tests__/sonos-panel.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SonosPanel } from "@/components/sonos/sonos-panel";
import * as useSonosModule from "@/hooks/use-sonos";
import * as navigationStore from "@/stores/navigation-store";

vi.mock("@/hooks/use-sonos");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const setViewFn = vi.fn();
vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn((selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
    selector({ view: "sonos", setView: setViewFn }),
  ),
}));

const mockUseSonos = vi.mocked(useSonosModule.useSonos);
const sendCommandFn = vi.fn();
const setVolumeFn = vi.fn();

function makePlayer(overrides = {}) {
  return {
    entityId: "media_player.living_room",
    friendlyName: "Living Room",
    state: "playing" as const,
    attributes: {
      mediaTitle: "Test Song",
      mediaArtist: "Test Artist",
      albumArtUrl: undefined,
      volume: 60,
      shuffle: false,
      repeat: "off" as const,
      mediaPosition: 30,
      mediaDuration: 180,
      mediaPositionUpdatedAt: undefined,
    },
    ...overrides,
  };
}

function setupHook(overrides = {}) {
  const player = makePlayer();
  mockUseSonos.mockReturnValue({
    players: [player],
    activeSpeaker: player,
    isLoading: false,
    isError: false,
    sendCommand: sendCommandFn,
    setVolume: setVolumeFn,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe("SonosPanel", () => {
  it("renders track title and artist", () => {
    render(<SonosPanel />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("back button calls setView hub", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(setViewFn).toHaveBeenCalledWith("hub");
  });

  it("play/pause button calls sendCommand", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "pause");
  });

  it("next button calls sendCommand next", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "next");
  });

  it("previous button calls sendCommand previous", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "previous");
  });

  it("renders all speakers in speaker list", () => {
    const players = [
      makePlayer(),
      makePlayer({ entityId: "media_player.bedroom", friendlyName: "Bedroom", state: "paused" as const }),
    ];
    setupHook({ players, activeSpeaker: players[0] });
    render(<SonosPanel />);
    expect(screen.getByText("Living Room")).toBeInTheDocument();
    expect(screen.getByText("Bedroom")).toBeInTheDocument();
  });

  it("shows fallback state when no active speaker", () => {
    setupHook({ players: [], activeSpeaker: null });
    render(<SonosPanel />);
    expect(screen.getByText(/no speakers/i)).toBeInTheDocument();
  });

  it("volume slider calls setVolume", () => {
    render(<SonosPanel />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
    expect(setVolumeFn).toHaveBeenCalledWith("media_player.living_room", 75);
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/sonos-panel.test.tsx
```

Expected: FAIL (SonosPanel does not exist)

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/components/sonos/sonos-panel.tsx
import { useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { useSonos } from "@/hooks/use-sonos";
import { useNavigationStore } from "@/stores/navigation-store";
import { useSwipe } from "@/hooks/use-swipe";
import { SonosAlbumArt } from "./sonos-album-art";
import { SonosControls } from "./sonos-controls";
import { SonosProgressBar } from "./sonos-progress-bar";
import { SonosSpeakerList } from "./sonos-speaker-list";

export function SonosPanel() {
  const { activeSpeaker, players, sendCommand, setVolume } = useSonos();
  const setView = useNavigationStore((s) => s.setView);
  const panelRef = useRef<HTMLDivElement>(null);

  useSwipe(panelRef, { onSwipeLeft: () => setView("hub") });

  return (
    <div
      ref={panelRef}
      className="relative h-full bg-background flex flex-col px-8 pt-6 pb-8 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          aria-label="Back"
          onClick={() => setView("hub")}
          className="text-white/60 active:text-white"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-sm text-muted-foreground">Music</span>
        <div className="w-6" />
      </div>

      {!activeSpeaker ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
          No speakers discovered
        </div>
      ) : (
        <>
          {/* Album Art */}
          <div className="flex justify-center mb-8">
            <SonosAlbumArt albumArtUrl={activeSpeaker.attributes.albumArtUrl} />
          </div>

          {/* Track Info */}
          <div className="text-center mb-6">
            <div className="text-xl font-medium text-white truncate">
              {activeSpeaker.attributes.mediaTitle ?? "Unknown"}
            </div>
            {activeSpeaker.attributes.mediaArtist && (
              <div className="text-sm text-white/50 mt-1 truncate">
                {activeSpeaker.attributes.mediaArtist}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <SonosProgressBar
              mediaPosition={activeSpeaker.attributes.mediaPosition}
              mediaDuration={activeSpeaker.attributes.mediaDuration}
              mediaPositionUpdatedAt={activeSpeaker.attributes.mediaPositionUpdatedAt}
              isPlaying={activeSpeaker.state === "playing"}
            />
          </div>

          {/* Controls */}
          <div className="mb-10">
            <SonosControls
              entityId={activeSpeaker.entityId}
              isPlaying={activeSpeaker.state === "playing"}
              shuffle={activeSpeaker.attributes.shuffle}
              repeat={activeSpeaker.attributes.repeat}
              sendCommand={sendCommand}
            />
          </div>

          {/* Speaker List */}
          <div className="border-t border-white/5 pt-6">
            <SonosSpeakerList players={players} setVolume={setVolume} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/sonos-panel.test.tsx
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/components/sonos/sonos-panel.tsx apps/web/src/__tests__/sonos-panel.test.tsx && git commit -m "feat: add SonosPanel full-screen component"
```

---

### Task 13: Route Update (Sonos Layer)

**Phase:** Sonos

**Files:**
- Modify: `apps/web/src/routes/index.tsx`

- [ ] **Step 1: Write failing test**

This is a DOM/routing change. The test verifies the new layer exists and respects view state. No new test file — add to existing route test if any, or write inline:

```typescript
// apps/web/src/__tests__/route-index.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/routes/index"; // We'll need to export it or test via render

// Since the Route uses createFileRoute, we test the HomePage component directly
// We need to mock navigation store
import { useNavigationStore } from "@/stores/navigation-store";

vi.mock("@/stores/navigation-store");
vi.mock("@/components/art-clock/art-clock", () => ({ ArtClock: () => <div data-testid="art-clock" /> }));
vi.mock("@/components/hub/widget-grid", () => ({ WidgetGrid: () => <div data-testid="widget-grid" /> }));
vi.mock("@/components/sonos/sonos-panel", () => ({ SonosPanel: () => <div data-testid="sonos-panel" /> }));

const mockUseNavigationStore = vi.mocked(useNavigationStore);

function setupStore(view: "clock" | "hub" | "sonos") {
  mockUseNavigationStore.mockImplementation((selector: (s: { view: string; setView: () => void }) => unknown) =>
    selector({ view, setView: vi.fn() }) as never,
  );
}

// Import the raw component, not via Route
// We'll do this by testing the exported HomePage function
import { Route } from "@/routes/index";
// Note: test via render of the component function directly

describe("route index — sonos layer", () => {
  it("sonos layer is in DOM", () => {
    setupStore("clock");
    const { container } = render(<Route.options.component />);
    expect(container.querySelector("[data-testid='sonos-layer']")).toBeInTheDocument();
  });

  it("sonos layer has opacity 1 and pointer-events auto when view is sonos", () => {
    setupStore("sonos");
    const { container } = render(<Route.options.component />);
    const layer = container.querySelector("[data-testid='sonos-layer']") as HTMLElement;
    expect(layer.style.opacity).toBe("1");
    expect(layer.style.pointerEvents).toBe("auto");
  });

  it("sonos layer has opacity 0 and pointer-events none when view is hub", () => {
    setupStore("hub");
    const { container } = render(<Route.options.component />);
    const layer = container.querySelector("[data-testid='sonos-layer']") as HTMLElement;
    expect(layer.style.opacity).toBe("0");
    expect(layer.style.pointerEvents).toBe("none");
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/route-index.test.tsx
```

Expected: FAIL (sonos-layer does not exist in route)

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/routes/index.tsx
import { ArtClock } from "@/components/art-clock/art-clock";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { SonosPanel } from "@/components/sonos/sonos-panel";
import { useNavigationStore } from "@/stores/navigation-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const view = useNavigationStore((s) => s.view);
  const setView = useNavigationStore((s) => s.setView);
  const isHub = view === "hub";
  const isSonos = view === "sonos";

  return (
    <div className="relative h-full">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-open hub from clock */}
      <div
        data-testid="clock-layer"
        className="absolute inset-0 transition-opacity duration-100 ease-out"
        style={{
          opacity: isHub || isSonos ? 0 : 1,
          pointerEvents: isHub || isSonos ? "none" : "auto",
        }}
        onClick={() => setView("hub")}
      >
        <ArtClock />
      </div>

      <div
        data-testid="hub-layer"
        className="absolute inset-0 transition-opacity duration-100 ease-out"
        style={{
          opacity: isHub ? 1 : 0,
          pointerEvents: isHub ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>

      <div
        data-testid="sonos-layer"
        className="absolute inset-0 transition-opacity duration-100 ease-out"
        style={{
          opacity: isSonos ? 1 : 0,
          pointerEvents: isSonos ? "auto" : "none",
        }}
      >
        <SonosPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test src/__tests__/route-index.test.tsx
```

Expected: PASS (all tests)

Also run full web test suite:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add apps/web/src/routes/index.tsx apps/web/src/__tests__/route-index.test.tsx && git commit -m "feat: add Sonos layer to route with opacity fade pattern"
```

---

## Phase 3: Final Verification (Task 14, after all tasks complete)

---

### Task 14: Full Test Suite + Type Check + Lint

**Phase:** Final (blocking completion)

This task is NOT parallelizable — all previous tasks must complete first.

- [ ] **Step 1: Run full API test suite**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun test
```

Expected: PASS (all tests, zero failures)

- [ ] **Step 2: Run full web test suite**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun test
```

Expected: PASS (all tests, zero failures)

- [ ] **Step 3: Type check API**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bunx tsc --noEmit
```

Expected: exit 0

- [ ] **Step 4: Type check web**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bunx tsc --noEmit
```

Expected: exit 0

- [ ] **Step 5: Lint API**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/api && bun run lint:fix
```

Expected: exit 0, no unfixable errors

- [ ] **Step 6: Lint web**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos/apps/web && bun run lint:fix
```

Expected: exit 0, no unfixable errors

- [ ] **Step 7: Commit any lint fixes**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git add -A && git commit -m "chore: lint and type check fixes"
```

Only run this step if lint:fix made changes. Skip if working tree is clean.

- [ ] **Step 8: Push branch**

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/ha-lights-sonos && git push
```

---

## Summary

| # | Task | Phase | Parallelizable? |
|---|------|-------|----------------|
| 1 | Env vars | HA Foundation | No — first |
| 2 | HA Types | HA Foundation | After Task 1 |
| 3 | HA REST Client | HA Foundation | After Task 2 |
| 4 | HA Service | HA Foundation | After Task 3 |
| 5 | Devices Router + Server Init | HA Foundation | After Task 4 |
| 6 | useLights hook | Lights | Parallel with Tasks 8–13 |
| 7 | LightsCard update | Lights | After Task 6 |
| 8 | Navigation store update | Sonos | Parallel with Tasks 6–7 |
| 9 | useSonos hook | Sonos | After Task 8 |
| 10 | MusicCard update | Sonos | After Task 9 |
| 11 | Sonos sub-components | Sonos | After Task 9 |
| 12 | SonosPanel | Sonos | After Tasks 10–11 |
| 13 | Route update (Sonos layer) | Sonos | After Task 12 |
| 14 | Full test + type + lint | Final | After all above |

**Files to create:** 19 new files (integration, service, router, hooks, components, tests)

**Files to modify:** 5 existing files (env.ts, server.ts, routers/index.ts, navigation-store.ts, lights-card.tsx, music-card.tsx, routes/index.tsx)
