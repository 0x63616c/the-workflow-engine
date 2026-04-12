# HA + Lights + Sonos Design Spec

## Overview

Three-layer build: Home Assistant REST integration, Philips Hue lights widget with all-on/all-off, and a Sonos expandable music card with now-playing, playback controls, and per-speaker volume.

**Build order:**
1. HA Foundation (unblocks both)
2. Lights and Sonos in parallel (independent once foundation exists)

---

## Assumptions

Decisions made to fill gaps not covered by alignment doc:

- **HA client is a singleton**: Instantiated once in `integrations/homeassistant/index.ts`, exported, used by services. Services layer owns lifecycle.
- **Poll interval**: Frontend polls at 5000ms for state (lights on count, now playing). This is fast enough for a wall panel without hammering HA.
- **Light entity grouping**: The lights widget shows a count of all `light.*` entities that are `on`. No room grouping. Alignment says "all on / all off" which is a global toggle.
- **All-on/all-off targets all lights**: The service calls `light.turn_on` / `light.turn_off` with `entity_id: "all"` - this is the HA convention for targeting all entities of a domain. Assumption: this is acceptable. If user has specific areas, they can extend later.
- **Sonos panel as a new view**: The Sonos expanded card is a new `view` state added to the navigation store. It layers above the hub using the same opacity fade pattern (not a modal). View states become `"clock" | "hub" | "sonos"`.
- **Sonos panel back navigation**: A back button (top-left) or swipe-left returns to hub.
- **Album art**: Fetched from `media_content_id` or `entity_picture` attribute on the media player entity. Rendered as a background or image element in the Sonos panel. If no art, fallback to dark gradient placeholder.
- **Volume control**: Slider per speaker, range 0-100, maps to HA `media_player.volume_set` with `volume_level` 0.0-1.0. Debounced at 200ms to avoid flooding HA.
- **Speaker list order**: Alphabetical by friendly name. No user-defined ordering in v1.
- **Playback controls target the "active" speaker**: The first speaker with `state: "playing"` is the "active" speaker. Prev/next/play/pause/shuffle/repeat target that entity. If none are playing, controls target the first speaker in the list.
- **Shuffle/repeat state**: Read from `shuffle` and `repeat` attributes on the media player entity. Toggle on tap.
- **Progress bar**: Computed client-side from `media_position` and `media_duration` attributes, incremented by a local `setInterval` between polls. If `media_position_updated_at` is available, use it for accuracy.
- **Error display**: If HA returns a non-2xx response or fetch throws, the affected widget shows a muted "Unavailable" state inline (no toast, no modal).
- **HA client `fetch` vs `undici`**: Uses the global `fetch` (Bun native). No external HTTP client dependency.
- **No SQLite persistence**: All state is live from HA. Alignment doc explicitly excludes persistent storage.
- **tRPC input validation**: All mutation inputs validated with Zod inline in the router (no shared Zod schemas for these; they are simple enough).

---

## Architecture

### Data Flow

```
Frontend (React) -- tRPC useQuery (5s refetch) -->  tRPC Router
                                                        |
                                                        v
                                                   Services Layer
                                                        |
                                                        v
                                                 HA Integration Client
                                                        |
                                                   HTTP fetch()
                                                        |
                                                        v
                                           Home Assistant REST API
                                         (HA_URL + Bearer HA_TOKEN)
```

Mutations (turn on/off, play/pause/skip/volume) follow the same path but use tRPC mutations.

### Import Boundaries (enforced by `scripts/check-boundaries.ts`)

```
integrations/homeassistant/  <-- only @repo/shared + own files
       ^
       |
services/ha-service.ts       <-- imports integrations/homeassistant, @repo/shared
       ^
       |
trpc/routers/devices.ts      <-- imports services/ha-service, zod, tRPC init
```

Frontend:
```
hooks/use-lights.ts          <-- trpc
hooks/use-sonos.ts           <-- trpc
components/hub/lights-card   <-- hooks/use-lights
components/hub/music-card    <-- hooks/use-sonos, navigation-store
components/sonos/sonos-panel <-- hooks/use-sonos, navigation-store
```

---

## Implementation Details

### Phase 1: HA Foundation

#### 1.1 Env Vars (`apps/api/src/env.ts`)

Add to the Zod schema:

```typescript
HA_URL: z.string().url().default("http://homeassistant.local:8123"),
HA_TOKEN: z.string().min(1),
```

`HA_TOKEN` has no default - it's required. The server will fail at startup if it is not set. This is intentional: HA is a core integration and the app is useless without it.

#### 1.2 HA REST Client (`apps/api/src/integrations/homeassistant/index.ts`)

Implements `Integration` interface.

```typescript
export class HomeAssistantIntegration implements Integration {
  id = "homeassistant";
  name = "Home Assistant";

  // base URL and token loaded from env at init()
  private baseUrl: string;
  private token: string;

  async init(): Promise<void>
  async getState(): Promise<Record<string, unknown>>  // { connected: boolean }
  async execute(command: string, params: Record<string, unknown>): Promise<unknown>

  // Public domain-specific methods used by services
  async getEntities(domain: string): Promise<HaEntity[]>
  async getEntity(entityId: string): Promise<HaEntity>
  async callService(domain: string, service: string, params: Record<string, unknown>): Promise<void>
}
```

**Types** (`apps/api/src/integrations/homeassistant/types.ts`):

```typescript
export interface HaEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_updated: string;
}
```

**API endpoints used:**
- `GET /api/states` - all states
- `GET /api/states/<entity_id>` - single entity state
- `POST /api/services/<domain>/<service>` - call service

**`getEntities(domain)`**: Calls `GET /api/states`, filters by `entity_id.startsWith(domain + ".")`.

**`callService(domain, service, params)`**: Posts to `/api/services/<domain>/<service>` with JSON body `{ ...params }`.

**Error handling**: If fetch throws or status >= 400, throw a typed `HaError` with the status code and message. Services catch this and return graceful error shapes to tRPC.

```typescript
export class HaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HaError";
  }
}
```

**Singleton export:**

```typescript
// apps/api/src/integrations/homeassistant/index.ts
export const ha = new HomeAssistantIntegration();
```

#### 1.3 HA Service (`apps/api/src/services/ha-service.ts`)

Thin business logic layer. Calls `ha` integration, returns typed shapes for tRPC.

```typescript
// Lights
export async function getLightsState(): Promise<LightsState>
export async function turnAllLightsOn(): Promise<void>
export async function turnAllLightsOff(): Promise<void>

// Sonos / media players
export async function getMediaPlayers(): Promise<MediaPlayer[]>
export async function mediaPlayerCommand(entityId: string, command: MediaPlayerCommand): Promise<void>
export async function setVolume(entityId: string, volumeLevel: number): Promise<void>
```

**Types returned by service** (not in shared lib, defined inline in service):

```typescript
interface LightsState {
  onCount: number;
  totalCount: number;
}

interface MediaPlayer {
  entityId: string;
  friendlyName: string;
  state: "playing" | "paused" | "idle" | "off" | "unavailable";
  attributes: {
    mediaTitle?: string;
    mediaArtist?: string;
    mediaAlbumName?: string;
    entityPicture?: string;
    volume: number;        // 0-100, integer
    shuffle: boolean;
    repeat: "off" | "one" | "all";
    mediaPosition?: number;
    mediaDuration?: number;
    mediaPositionUpdatedAt?: string;
  };
}

type MediaPlayerCommand = "play" | "pause" | "next" | "previous" | "shuffle" | "repeat";
```

**`getLightsState()`**: Calls `ha.getEntities("light")`, counts entities with `state === "on"`.

**`turnAllLightsOn/Off()`**: Calls `ha.callService("light", "turn_on"/"turn_off", { entity_id: "all" })`.

**`getMediaPlayers()`**: Calls `ha.getEntities("media_player")`, maps to `MediaPlayer` shape. Extracts attributes from raw HA entity.

**`mediaPlayerCommand()`**: Maps command to HA service:
- `play` -> `media_player.media_play`
- `pause` -> `media_player.media_pause`
- `next` -> `media_player.media_next_track`
- `previous` -> `media_player.media_previous_track`
- `shuffle` -> `media_player.shuffle_set` (toggles current value)
- `repeat` -> `media_player.repeat_set` (cycles: off -> one -> all -> off)

For shuffle/repeat, the service must first `getEntity` to read current value, then call the toggle service.

**`setVolume()`**: Calls `ha.callService("media_player", "volume_set", { entity_id: entityId, volume_level: volumeLevel / 100 })`.

#### 1.4 tRPC Devices Router (`apps/api/src/trpc/routers/devices.ts`)

```typescript
export const devicesRouter = router({
  // Lights
  lights: publicProcedure.query(async () => {
    // returns LightsState | { error: string }
  }),
  lightsOn: publicProcedure.mutation(async () => {
    // calls ha-service.turnAllLightsOn
  }),
  lightsOff: publicProcedure.mutation(async () => {
    // calls ha-service.turnAllLightsOff
  }),

  // Media players (Sonos)
  mediaPlayers: publicProcedure.query(async () => {
    // returns MediaPlayer[] | { error: string }
  }),
  mediaPlayerCommand: publicProcedure
    .input(z.object({
      entityId: z.string(),
      command: z.enum(["play", "pause", "next", "previous", "shuffle", "repeat"]),
    }))
    .mutation(async ({ input }) => {
      // calls ha-service.mediaPlayerCommand
    }),
  setVolume: publicProcedure
    .input(z.object({
      entityId: z.string(),
      volumeLevel: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      // calls ha-service.setVolume
    }),
});
```

Register in `apps/api/src/trpc/routers/index.ts`:

```typescript
export const appRouter = router({
  health: healthRouter,
  devices: devicesRouter,
});
```

**Error handling in router**: Each procedure wraps service call in try/catch. On `HaError`, returns `{ error: "HA unavailable" }` instead of throwing. On unknown error, rethrows (tRPC handles as 500).

#### 1.5 HA init in server (`apps/api/src/server.ts`)

Add `ha.init()` call before `Bun.serve`:

```typescript
import { ha } from "./integrations/homeassistant";

await ha.init();
// then Bun.serve(...)
```

---

### Phase 2a: Lights Widget

#### 2.1 Frontend Hook (`apps/web/src/hooks/use-lights.ts`)

```typescript
const POLL_INTERVAL_MS = 5_000;

export function useLights() {
  const lights = trpc.devices.lights.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const lightsOnMutation = trpc.devices.lightsOn.useMutation();
  const lightsOffMutation = trpc.devices.lightsOff.useMutation();

  return {
    onCount: lights.data?.onCount ?? 0,
    totalCount: lights.data?.totalCount ?? 0,
    isLoading: lights.isLoading,
    isError: !!lights.data?.error || lights.isError,
    turnOn: lightsOnMutation.mutate,
    turnOff: lightsOffMutation.mutate,
  };
}
```

#### 2.2 Updated LightsCard (`apps/web/src/components/hub/lights-card.tsx`)

Replace placeholder data with `useLights()` hook.

**Layout:**
```
+------------------------------------------+
|  Lights            [All On]  [All Off]   |
|  3 of 5 on                               |
+------------------------------------------+
```

- "All On" and "All Off" are small buttons (dark outlined style, touch-friendly). They call `turnOn()` / `turnOff()`.
- After mutation fires, optimistically wait for next poll to reflect new state (no optimistic update needed - HA responds fast enough).
- If `isError`: show "Unavailable" instead of count and disable buttons.
- If `isLoading` (initial): show "— of —" count, buttons disabled.
- Dots row removed (alignment says just on/off toggle + count, not per-room indicators).

**Button style**: `rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 text-white/60 active:bg-white/10`. Two buttons side by side.

---

### Phase 2b: Sonos Integration

#### 2.3 Frontend Hook (`apps/web/src/hooks/use-sonos.ts`)

```typescript
const POLL_INTERVAL_MS = 5_000;

export function useSonos() {
  const mediaPlayers = trpc.devices.mediaPlayers.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const commandMutation = trpc.devices.mediaPlayerCommand.useMutation();
  const volumeMutation = trpc.devices.setVolume.useMutation();

  const players = mediaPlayers.data ?? [];
  const activeSpeaker = players.find(p => p.state === "playing") ?? players[0] ?? null;

  return {
    players,
    activeSpeaker,
    isLoading: mediaPlayers.isLoading,
    isError: !!mediaPlayers.data?.error || mediaPlayers.isError,
    sendCommand: (entityId: string, command: MediaPlayerCommand) =>
      commandMutation.mutate({ entityId, command }),
    setVolume: (entityId: string, volumeLevel: number) =>
      volumeMutation.mutate({ entityId, volumeLevel }),
  };
}
```

#### 2.4 Navigation Store Update (`apps/web/src/stores/navigation-store.ts`)

Add `"sonos"` to view type:

```typescript
type View = "clock" | "hub" | "sonos";

interface NavigationState {
  view: View;
}
```

No other changes. The existing `setView` handles the new state.

#### 2.5 Updated MusicCard (`apps/web/src/components/hub/music-card.tsx`)

Replace placeholder with `useSonos()`. Tapping the card calls `setView("sonos")`.

**Layout (collapsed, in hub):**
```
+----------------------------------+
|  Music             [=====]       |
|  Song title                      |
|  Artist                          |
|                          [Play]  |
+----------------------------------+
```

- `[=====]` is the equalizer bars animation (keep existing, driven by `activeSpeaker?.state === "playing"`)
- `[Play]` is a `Play` or `Pause` icon button, calls `sendCommand(activeSpeaker.entityId, "play"/"pause")`
- Card itself is clickable (opens Sonos panel) via `onClick={() => setView("sonos")}`
- If no speakers: show "No speakers" and hide play button
- If `isError`: show "Unavailable"

#### 2.6 Sonos Panel (`apps/web/src/components/sonos/sonos-panel.tsx`)

New full-screen panel, same opacity fade pattern as clock/hub.

**Layout:**
```
+----------------------------------------------+
| [<]                               Music       |
|                                               |
|  [Album Art - large square, centered]         |
|                                               |
|  Song Title (large, white)                    |
|  Artist (smaller, muted)                      |
|                                               |
|  [progress bar]                               |
|  0:32                              3:45       |
|                                               |
|  [<<]  [|<]  [||]  [>|]  [>>]                |
|  shuf  prev pause next  repeat                |
|                                               |
|  --- Speakers ---                             |
|  Living Room  [========    ] 60%             |
|  Bedroom      [=====       ] 40%             |
+----------------------------------------------+
```

**Components breakdown:**

- **`SonosAlbumArt`** - renders `<img src={entityPicture} />` with fallback dark gradient. Proxied through API? No - HA URL is internal, iPad on Tailscale can reach it directly. Render `entityPicture` as-is (it's a relative HA path like `/api/media_player_proxy/...`). Prepend `HA_URL` on the frontend? No - the frontend doesn't know `HA_URL`. Instead: the service returns the full URL by prepending HA_URL. Actually simpler: add an `albumArtUrl` field to `MediaPlayer.attributes` where the service prepends `ha.baseUrl` to the relative path.

- **`SonosProgressBar`** - computed from `mediaPosition`, `mediaDuration`, `mediaPositionUpdatedAt`. A local `useRef` interval increments position every second between polls. On next poll, position resets to server value. No scrubbing in v1.

- **`SonosControls`** - play/pause/next/previous/shuffle/repeat buttons. Active state for shuffle (icon tinted accent) and repeat (icon tinted accent if not "off"). Calls `sendCommand(activeSpeaker.entityId, command)`.

- **`SonosSpeakerList`** - maps `players` array, renders each as a row with friendly name + volume slider. Slider is `<input type="range" min="0" max="100" />`. `onChange` debounced 200ms calls `setVolume(player.entityId, value)`.

**Back navigation**: Back button `<` top-left calls `setView("hub")`. Swipe left (new handler in this panel) also calls `setView("hub")`.

#### 2.7 Route Update (`apps/web/src/routes/index.tsx`)

Add Sonos layer following the same opacity fade pattern:

```tsx
<div
  data-testid="sonos-layer"
  className="absolute inset-0 transition-opacity duration-100 ease-out"
  style={{
    opacity: view === "sonos" ? 1 : 0,
    pointerEvents: view === "sonos" ? "auto" : "none",
  }}
>
  <SonosPanel />
</div>
```

#### 2.8 WidgetGrid idle timeout

When view is `"sonos"`, the hub idle timeout should be disabled (only active when view is `"hub"`). The existing `enabled: view === "hub"` check already handles this if the store view is `"sonos"`.

---

## File Structure

### Create

| File | Purpose |
|------|---------|
| `apps/api/src/integrations/homeassistant/index.ts` | HA REST client, `HomeAssistantIntegration` class + singleton `ha` export |
| `apps/api/src/integrations/homeassistant/types.ts` | `HaEntity`, `HaError` types |
| `apps/api/src/services/ha-service.ts` | Business logic: lights state, media player state, commands |
| `apps/api/src/trpc/routers/devices.ts` | tRPC router: lights + media player queries/mutations |
| `apps/web/src/hooks/use-lights.ts` | React hook wrapping tRPC devices.lights |
| `apps/web/src/hooks/use-sonos.ts` | React hook wrapping tRPC devices.mediaPlayers |
| `apps/web/src/components/sonos/sonos-panel.tsx` | Full-screen Sonos expanded view |
| `apps/web/src/components/sonos/sonos-album-art.tsx` | Album art with fallback |
| `apps/web/src/components/sonos/sonos-controls.tsx` | Playback control buttons |
| `apps/web/src/components/sonos/sonos-progress-bar.tsx` | Progress bar with client-side interpolation |
| `apps/web/src/components/sonos/sonos-speaker-list.tsx` | Per-speaker volume sliders |
| `apps/api/src/__tests__/integrations/homeassistant.test.ts` | Unit tests for HA client |
| `apps/api/src/__tests__/services/ha-service.test.ts` | Unit tests for HA service |
| `apps/api/src/__tests__/routers/devices.test.ts` | Integration tests for devices router |
| `apps/web/src/__tests__/use-lights.test.ts` | Unit tests for useLights hook |
| `apps/web/src/__tests__/use-sonos.test.ts` | Unit tests for useSonos hook |
| `apps/web/src/__tests__/lights-card.test.tsx` | Unit tests for LightsCard |
| `apps/web/src/__tests__/music-card.test.tsx` | Unit tests for MusicCard |
| `apps/web/src/__tests__/sonos-panel.test.tsx` | Unit tests for SonosPanel |

### Modify

| File | Change |
|------|--------|
| `apps/api/src/env.ts` | Add `HA_URL`, `HA_TOKEN` env vars |
| `apps/api/src/server.ts` | Add `await ha.init()` before `Bun.serve` |
| `apps/api/src/trpc/routers/index.ts` | Register `devicesRouter` |
| `apps/web/src/stores/navigation-store.ts` | Add `"sonos"` to view type |
| `apps/web/src/components/hub/lights-card.tsx` | Replace placeholder with real data + buttons |
| `apps/web/src/components/hub/music-card.tsx` | Replace placeholder, add tap-to-expand |
| `apps/web/src/routes/index.tsx` | Add Sonos layer |

---

## Testing Strategy

### API: HA Integration Client (`integrations/homeassistant.test.ts`)

Mock `fetch` globally with `vi.fn()`.

- **`init()` sets baseUrl and token**: After init, private fields reflect env values.
- **`getEntities("light")` filters by domain**: Mock `/api/states` response with mixed entities, verify only `light.*` returned.
- **`callService()` posts correct URL and body**: Verify fetch called with correct URL, method POST, Authorization header, JSON body.
- **`getEntities()` throws `HaError` on non-2xx**: Mock fetch returning 401, verify `HaError` thrown with `status: 401`.
- **`getEntities()` throws `HaError` on network error**: Mock fetch throwing, verify error propagates.

### API: HA Service (`ha-service.test.ts`)

Mock the `ha` singleton (replace methods with `vi.fn()`).

- **`getLightsState()` counts on entities**: Mock `getEntities("light")` returning 5 entities (3 on, 2 off). Verify `{ onCount: 3, totalCount: 5 }`.
- **`turnAllLightsOn()` calls correct service**: Verify `callService("light", "turn_on", { entity_id: "all" })`.
- **`turnAllLightsOff()` calls correct service**: Verify `callService("light", "turn_off", { entity_id: "all" })`.
- **`getMediaPlayers()` maps attributes correctly**: Mock 2 media_player entities, verify shape matches `MediaPlayer` interface (volume scaled 0-100, shuffle boolean, etc.).
- **`mediaPlayerCommand("play")` calls correct HA service**: Verify `callService("media_player", "media_play", { entity_id: "..." })`.
- **`setVolume()` scales to 0.0-1.0**: Input 60, verify `volume_level: 0.6` in callService params.

### API: Devices Router (`devices.test.ts`)

Use real tRPC test client with mocked HA service.

- **`devices.lights` returns state on success**: Mock service returning `{ onCount: 3, totalCount: 5 }`, verify router returns same.
- **`devices.lights` returns error on HaError**: Mock service throwing `HaError`, verify router returns `{ error: "HA unavailable" }` (not a 500).
- **`devices.lightsOn` calls service**: Verify `turnAllLightsOn` called.
- **`devices.lightsOff` calls service**: Verify `turnAllLightsOff` called.
- **`devices.mediaPlayers` returns array**: Mock service returning 2 players, verify array of 2.
- **`devices.mediaPlayerCommand` validates input**: Invalid command string should fail Zod validation.
- **`devices.setVolume` validates range**: Volume 101 should fail Zod validation.

### Web: useLights Hook (`use-lights.test.ts`)

Use `renderHook` with mocked tRPC provider.

- **Returns loading state initially**: `isLoading: true`, counts are 0.
- **Returns parsed counts when query succeeds**: Mock query response, verify `onCount` and `totalCount`.
- **`turnOn` calls mutation**: Verify `lightsOn.mutate` called.
- **Returns isError on error response**: Mock `{ error: "HA unavailable" }`, verify `isError: true`.

### Web: useSonos Hook (`use-sonos.test.ts`)

- **Returns empty players when query loading**: `players: []`, `activeSpeaker: null`.
- **`activeSpeaker` is first playing speaker**: Mock 2 players (one paused, one playing), verify activeSpeaker is playing one.
- **`activeSpeaker` falls back to first player**: Mock 2 players both paused, verify activeSpeaker is first.
- **`sendCommand` calls mutation with correct args**: Verify `mediaPlayerCommand.mutate({ entityId, command })`.
- **`setVolume` calls mutation with correct args**: Verify `setVolume.mutate({ entityId, volumeLevel })`.

### Web: LightsCard (`lights-card.test.tsx`)

- **Shows on count**: Mock useLights returning `{ onCount: 3, totalCount: 5 }`, verify "3 of 5 on" text.
- **All On button calls turnOn**: Click "All On", verify `turnOn` called.
- **All Off button calls turnOff**: Click "All Off", verify `turnOff` called.
- **Shows unavailable on error**: Mock `isError: true`, verify "Unavailable" shown.
- **Buttons disabled during loading**: Mock `isLoading: true`, verify buttons have `disabled`.

### Web: MusicCard (`music-card.test.tsx`)

- **Shows track and artist from active speaker**: Mock activeSpeaker with mediaTitle, verify text rendered.
- **Tapping card navigates to sonos view**: Click card, verify `setView("sonos")` called.
- **Play button calls play command**: Mock state "paused", click play, verify `sendCommand(entityId, "play")`.
- **Pause icon shown when playing**: Mock state "playing", verify Pause icon rendered.
- **Shows "No speakers" when no players**: Mock empty players, verify text.

### Web: SonosPanel (`sonos-panel.test.tsx`)

- **Renders track info from activeSpeaker**: Track title and artist visible.
- **Back button calls setView("hub")**: Click `<`, verify navigation.
- **Play/pause button calls command**: Click play button, verify sendCommand.
- **Next/previous buttons call commands**: Verify each.
- **Volume slider calls setVolume on change**: Fire change event with value 75, verify `setVolume(entityId, 75)`.
- **Renders all speakers in list**: Mock 3 players, verify 3 speaker rows.
- **Shows fallback when no active speaker**: Verify graceful empty state.

---

## E2E Verification Plan

### Prerequisites

```bash
# Ensure HA_URL and HA_TOKEN are set
export HA_URL=http://homeassistant.local:8123
export HA_TOKEN=<your-token>

# Start services
cd /path/to/worktree
tilt up
# or manually:
cd apps/api && bun run dev &
cd apps/web && bun run dev &
```

### Step 1: Run All Tests

```bash
cd apps/api && bun run test
cd apps/web && bun run test
```

All tests must pass. Zero failures.

### Step 2: Type Check

```bash
cd apps/api && bunx tsc --noEmit
cd apps/web && bunx tsc --noEmit
```

Both must exit 0.

### Step 3: Lint

```bash
cd apps/api && bun run lint:fix
cd apps/web && bun run lint:fix
```

Both must exit 0.

### Step 4: API Smoke Test (with real HA)

```bash
# Verify lights query
curl -s http://localhost:4201/trpc/devices.lights | jq .

# Expected:
# { "result": { "data": { "onCount": N, "totalCount": M } } }
# or { "result": { "data": { "error": "HA unavailable" } } } if HA not reachable

# Verify media players query
curl -s http://localhost:4201/trpc/devices.mediaPlayers | jq .

# Expected: array of player objects with entityId, state, attributes
```

### Step 5: Visual - Hub with Real Lights Data

Open `http://localhost:4200` using agent-browser.

Tap clock to open hub.

**Verify:**
- LightsCard shows real on/off count (e.g. "2 of 6 on")
- "All On" and "All Off" buttons visible
- MusicCard shows current track title and artist (or "Not playing")
- No placeholder hardcoded data visible

### Step 6: Visual - Lights Toggle

In hub, tap "All On".

**Verify:**
- Lights count updates on next poll (within 5 seconds)
- If lights are already all on, tap "All Off" and verify count drops to 0

### Step 7: Visual - Open Sonos Panel

In hub, tap the Music card.

**Verify:**
- Sonos panel fades in (smooth opacity transition)
- Album art displayed (or dark gradient if no art)
- Track title and artist visible
- Progress bar shows playback position
- Playback controls (shuffle, prev, pause/play, next, repeat) visible
- Speaker list visible with volume sliders
- Art aesthetic maintained (dark, minimal)

### Step 8: Visual - Playback Controls

Tap play/pause.

**Verify:**
- State updates on next poll (button icon switches)

Tap next track.

**Verify:**
- Now playing info updates within 5 seconds

### Step 9: Visual - Volume Control

Move a volume slider for one speaker.

**Verify:**
- Slider moves smoothly
- Volume changes on the speaker within 2 seconds (near-real-time HA response)

### Step 10: Visual - Back Navigation

In Sonos panel, tap the back `<` button.

**Verify:**
- Returns to hub with fade transition
- Hub state (idle timeout) resumes

### PASS Criteria

- All unit tests pass
- Type check and lint clean
- Real light count shown in LightsCard
- All On / All Off successfully toggle lights in HA
- Music card shows real now-playing data
- Sonos panel opens from music card tap
- All playback controls functional
- Volume slider works per speaker
- Back navigation works
- Art aesthetic maintained throughout

### FAIL Criteria

- Any test failure
- Type errors or lint errors
- Placeholder data visible in production
- HA commands return errors in normal conditions
- Sonos panel broken layout on iPad 12.9" form factor
- Import boundary violations flagged by `check-boundaries`
- Any bright backgrounds or non-dark-theme elements

---

## Error Handling

### API Layer

- **HA unreachable**: `HaError` thrown in integration. Services catch, return `{ error: "HA unavailable" }`. tRPC procedures return this as data (not thrown), so frontend receives it as a data payload rather than a tRPC error.
- **HA 401 Unauthorized**: `HaError(401)`. Service returns `{ error: "HA auth failed" }`.
- **HA 404 entity not found**: `HaError(404)`. Rare case - entity was removed from HA. Service returns graceful null/empty.
- **Unknown errors**: Re-thrown, become tRPC 500. Frontend query enters `isError: true`.

### Frontend Layer

- **Query `isError`**: Show "Unavailable" in card, disable action buttons.
- **Query `isLoading`**: Show `—` counts and disabled buttons (initial load only, sub-1s in practice).
- **Mutation errors**: Mutations fail silently at the card level. The next poll will reflect current actual state. No toast. This is a deliberate YAGNI choice - error toasts add complexity and are rarely needed for momentary toggle failures on a wall panel.
- **Missing album art**: `onError` on `<img>` element hides the image and shows dark gradient placeholder.
- **Empty speakers list**: "No speakers discovered" message in both music card and Sonos panel.
- **No active speaker**: Playback controls still render but target the first speaker in the list (or are disabled if list is empty).
