# Timer App — Design Spec

**Date:** 2026-04-12
**Status:** Approved for implementation

---

## Overview

Single countdown timer accessible from the hub widget grid. Tap the timer widget card to open a full-screen timer panel (same opacity-fade pattern as Sonos). Pure client-side: Zustand store + `setInterval`. No backend changes.

---

## Files to Create

```
apps/web/src/stores/timer-store.ts
apps/web/src/hooks/use-timer.ts
apps/web/src/components/hub/timer-card.tsx
apps/web/src/components/timer/timer-panel.tsx
apps/web/src/components/timer/timer-ring.tsx
apps/web/src/components/timer/timer-controls.tsx
apps/web/src/components/timer/timer-flash.tsx
apps/web/src/__tests__/timer-store.test.ts
apps/web/src/__tests__/use-timer.test.ts
apps/web/src/__tests__/timer-card.test.tsx
apps/web/src/__tests__/timer-panel.test.tsx
```

## Files to Modify

```
apps/web/src/stores/navigation-store.ts   # add "timer" to View type
apps/web/src/routes/index.tsx             # add timer layer
apps/web/src/components/hub/widget-grid.tsx  # add TimerCard + grid area
```

---

## 1. Navigation Store Changes

**File:** `apps/web/src/stores/navigation-store.ts`

Change:
```ts
type View = "clock" | "hub" | "sonos";
```
To:
```ts
type View = "clock" | "hub" | "sonos" | "timer";
```

No other changes to this file.

---

## 2. Timer Store

**File:** `apps/web/src/stores/timer-store.ts`

```ts
type TimerStatus = "idle" | "running" | "paused" | "done";

interface TimerState {
  status: TimerStatus;
  duration_MS: number;
  remaining_MS: number;
}

interface TimerActions {
  start: (duration_MS: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (elapsed_MS: number) => void;
}
```

**Initial state:**
```ts
{ status: "idle", duration_MS: 0, remaining_MS: 0 }
```

**Action logic (pure reducers in `set`):**

- `start(duration_MS)` — sets `status: "running"`, `duration_MS`, `remaining_MS: duration_MS`
- `pause()` — if `status === "running"`, sets `status: "paused"`
- `resume()` — if `status === "paused"`, sets `status: "running"`
- `reset()` — resets to initial state `{ status: "idle", duration_MS: 0, remaining_MS: 0 }`
- `tick(elapsed_MS)` — only runs when `status === "running"`:
  - `remaining_MS = Math.max(0, remaining_MS - elapsed_MS)`
  - if `remaining_MS === 0`, set `status: "done"`

No `setInterval` in the store. The store is pure state. The interval lives in `use-timer.ts`.

---

## 3. Timer Hook

**File:** `apps/web/src/hooks/use-timer.ts`

Drives the store's `tick` action via `setInterval`. Only the interval management lives here.

```ts
const TICK_INTERVAL_MS = 100;

export function useTimer() {
  const status = useTimerStore((s) => s.status);
  const tick = useTimerStore((s) => s.tick);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const remaining_MS = useTimerStore((s) => s.remaining_MS);
  const duration_MS = useTimerStore((s) => s.duration_MS);

  useEffect(() => {
    if (status !== "running") return;

    const lastTick = { time: Date.now() };
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed_MS = now - lastTick.time;
      lastTick.time = now;
      tick(elapsed_MS);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, tick]);

  return { status, remaining_MS, duration_MS, start, pause, resume, reset };
}
```

The `lastTick` pattern uses real wall-clock elapsed time instead of assuming the interval fires exactly every 100ms. This avoids drift.

---

## 4. Widget Grid Changes

**File:** `apps/web/src/components/hub/widget-grid.tsx`

Replace the `ThemeToggleCard` grid area slot with the `TimerCard`. The current `gridTemplateAreas` uses named areas. Add `"timer"` area by replacing `"theme"` in the bottom-right cell.

Updated grid areas:
```
"weather weather clock"
"wifi    lights  lights"
"calendar music  timer"
```

`ThemeToggleCard` is removed from the grid. It has no persistent function currently (it's a placeholder). Decision: timer card takes the bottom-right slot. The theme toggle is removed entirely from the grid for v1.

Import and render `<TimerCard />` in place of `<ThemeToggleCard />`.

---

## 5. Timer Card

**File:** `apps/web/src/components/hub/timer-card.tsx`

Uses `BentoCard` (same as all other hub cards). Reads from `useTimerStore` directly (no hook needed for display-only).

```tsx
export function TimerCard() {
  const { status, remaining_MS } = useTimerStore((s) => ({
    status: s.status,
    remaining_MS: s.remaining_MS,
  }));
  const setView = useNavigationStore((s) => s.setView);

  const value = (() => {
    if (status === "idle") return "No timer";
    if (status === "done") return "Done!";
    return formatCountdown(remaining_MS);
  })();

  return (
    <BentoCard testId="widget-card-timer" gridArea="timer" onClick={() => setView("timer")}>
      <div className="flex flex-col justify-between h-full">
        <div className="text-sm text-muted-foreground">Timer</div>
        <div className="text-2xl font-[200] text-foreground tabular-nums">{value}</div>
      </div>
    </BentoCard>
  );
}
```

**`formatCountdown(ms: number): string`** — exported utility function in `timer-card.tsx` or a shared `timer-utils.ts`:
- Converts milliseconds to `"MM:SS"` display format
- `Math.ceil` seconds to avoid showing `0:00` while still running
- Examples: `5000 → "0:05"`, `65000 → "1:05"`, `600000 → "10:00"`

---

## 6. Routes Index Changes

**File:** `apps/web/src/routes/index.tsx`

Add `"timer"` view alongside `"sonos"`. Follows identical layer pattern:

```tsx
const isTimer = view === "timer";
```

Add a fourth layer div:
```tsx
<div
  data-testid="timer-layer"
  className="absolute inset-0 transition-opacity duration-100 ease-out"
  style={{
    opacity: isTimer ? 1 : 0,
    pointerEvents: isTimer ? "auto" : "none",
  }}
>
  <TimerPanel />
</div>
```

Update existing clock, hub, sonos layer conditions to also hide when `isTimer`:

Clock layer: `opacity: isHub || isSonos || isTimer ? 0 : 1`
Hub layer: `opacity: isHub && !isTimer ? 1 : 0` — wait, hub layer is only `isHub`. Timer is navigated to from inside the hub. When `view === "timer"`, hub is hidden. This is handled naturally: setting view to "timer" hides the hub layer since `isHub` is false.

Clock layer: hide when `isHub || isSonos || isTimer`
Hub layer: show only when `isHub` (already exclusive since setView("timer") makes isHub false)
Sonos layer: show only when `isSonos`
Timer layer: show only when `isTimer`

---

## 7. Timer Panel

**File:** `apps/web/src/components/timer/timer-panel.tsx`

Full-screen panel, same structural pattern as `SonosPanel`.

```
Layout (flex column, h-full, bg-background, px-8 pt-6 pb-8):
  Header row (back button left, "Timer" label center, empty div right)
  Body (flex-1, flex col, items-center, justify-center, gap-12):
    TimerRing (progress ring + countdown digits)
    Preset buttons row
    Custom time input row
    TimerControls (start/pause/reset buttons)
  TimerFlash (conditional overlay)
```

**Header:** Same pattern as `SonosPanel`. Back button uses `ChevronLeft`, `aria-label="Back"`, calls `setView("hub")`.

**Swipe:** `useSwipe(panelRef, { onSwipeLeft: () => setView("hub") })` — same as Sonos.

**Custom time input:**
- Two number inputs: minutes (0-99) and seconds (0-59)
- Colon separator between them
- Display only when `status === "idle"` or `status === "done"` (when no timer running)
- Controlled state: `localMinutes` and `localSeconds` in component state (not store)
- Both inputs have `inputMode="numeric"` for iPad numeric keyboard
- On change, validate and clamp values (minutes 0-99, seconds 0-59)
- Size: large text inputs styled to match the art aesthetic (transparent background, white text, centered, ~3rem font)

**Preset buttons:**
- Four buttons: `1m`, `5m`, `10m`, `15m`
- Always visible (not just when idle) — tapping a preset while running resets and starts with new duration
- Each preset calls `start(minutes * 60_000)` directly via `useTimer().start`
- Displayed as a horizontal row of pill buttons

---

## 8. Timer Ring

**File:** `apps/web/src/components/timer/timer-ring.tsx`

SVG-based circular progress ring around the countdown digits.

```
Props:
  remaining_MS: number
  duration_MS: number
  status: TimerStatus
```

**SVG implementation:**
- `viewBox="0 0 200 200"` — 200x200 coordinate space
- Background circle: `r=90`, `cx=100`, `cy=100`, stroke `rgba(255,255,255,0.08)`, strokeWidth=8, fill=none
- Progress circle: same geometry, stroke white or accent color, `strokeDasharray`, `strokeDashoffset` drives progress
- `circumference = 2 * Math.PI * 90 ≈ 565.49`
- `progress = duration_MS > 0 ? remaining_MS / duration_MS : 1`
- `strokeDashoffset = circumference * (1 - progress)`
- Progress arc rotated -90deg (starts at top): `transform="rotate(-90, 100, 100)"`
- Transition: `transition: stroke-dashoffset 0.1s linear` (matches tick interval)

**Countdown digits centered inside ring:**
- `<foreignObject>` or absolutely positioned div
- Large digits: `~4rem` font, `font-[200]`, `tabular-nums`, white
- Format: `"MM:SS"` — always two digit seconds, variable minutes (no leading zero on minutes)
- When `status === "idle"`: show `"--:--"`
- When `status === "done"`: show `"0:00"`
- When `status === "running"` or `"paused"`: show formatted remaining time

**Ring color:**
- `status === "done"`: red accent (`rgb(239 68 68)` = `text-red-500`)
- `status === "paused"`: dimmed white (`rgba(255,255,255,0.4)`)
- `status === "running"` or `"idle"`: white

**Sizing:** Ring component is square, sized via `className` prop from parent. Default: `w-64 h-64` (256px). Passed as `<TimerRing className="w-72 h-72" .../>` from panel.

---

## 9. Timer Controls

**File:** `apps/web/src/components/timer/timer-controls.tsx`

```
Props:
  status: TimerStatus
  remaining_MS: number
  onStart: (duration_MS: number) => void  -- passes localMinutes/localSeconds from panel
  onPause: () => void
  onResume: () => void
  onReset: () => void
```

Wait — the start action needs the current duration from the custom time inputs (which live in panel state). So controls receive `onStart` as a callback.

**Button layout (horizontal row, centered, gap-6):**

| Status   | Buttons shown                        |
|----------|--------------------------------------|
| `idle`   | Start (primary)                      |
| `running`| Pause, Reset                         |
| `paused` | Resume, Reset                        |
| `done`   | Reset                                |

**Start button:** Large, primary style. Calls `onStart()` — panel passes `() => start((localMinutes * 60 + localSeconds) * 1000)`. If both are 0, Start is disabled.

**Pause/Resume:** Secondary style, same size.

**Reset:** Ghost/muted style.

**Aria labels:** `"Start timer"`, `"Pause timer"`, `"Resume timer"`, `"Reset timer"`.

---

## 10. Timer Flash

**File:** `apps/web/src/components/timer/timer-flash.tsx`

Full-screen overlay rendered inside `TimerPanel` when `status === "done"`.

```
Props:
  active: boolean
```

**Implementation:**
- `position: absolute, inset-0` — covers the full panel
- When `active`: renders a pulsing overlay
- Animation: alternating between `rgba(255, 255, 255, 0.8)` and `rgba(220, 38, 38, 0.6)` (white flash → red pulse)
- CSS keyframes via Tailwind custom animation or inline style `@keyframes`
- Animation: 0.5s ease-in-out, infinite alternate
- `pointer-events: none` — does not block touches to controls underneath
- When not active: renders nothing (`return null`)

**Tailwind keyframe approach:**
Define in `tailwind.config.ts` (or `@theme` in Tailwind v4 CSS):
```css
@keyframes timer-flash {
  0% { background-color: rgba(255, 255, 255, 0.8); }
  100% { background-color: rgba(220, 38, 38, 0.6); }
}
```

Animation class: `animate-[timer-flash_0.5s_ease-in-out_infinite_alternate]`

---

## 11. Route Index — Timer Layer Integration

The flash does not block navigation. Tapping anywhere dismisses to hub via the back button or swipe — user must manually dismiss. No auto-dismiss.

---

## 12. Test Plan (TDD Order)

All tests use Vitest + Testing Library. Write each test file before the corresponding implementation.

### `timer-store.test.ts`

```
describe("timer-store")
  initializes with idle status, 0 duration_MS, 0 remaining_MS
  start() sets status to running with correct duration_MS and remaining_MS
  pause() sets status from running to paused
  resume() sets status from paused to running
  reset() resets to initial state
  tick() decrements remaining_MS
  tick() sets status to done when remaining_MS reaches 0
  tick() does nothing when status is paused
  tick() does nothing when status is idle
  tick() does nothing when status is done
```

### `use-timer.test.ts`

```
describe("use-timer")
  interval is started when status is running
  interval is cleared when status changes to paused
  interval is cleared when status changes to done
  interval fires tick with elapsed time
```
Use `vi.useFakeTimers()`.

### `timer-card.test.tsx`

```
describe("TimerCard")
  renders "No timer" when status is idle
  renders formatted countdown when status is running
  renders "Done!" when status is done
  clicking card calls setView("timer")
  has data-testid="widget-card-timer"
```
Mock `useTimerStore`, mock `useNavigationStore`.

### `timer-panel.test.tsx`

```
describe("TimerPanel")
  renders back button
  back button calls setView("hub")
  renders preset buttons 1m, 5m, 10m, 15m
  clicking 1m preset starts timer with 60000ms
  clicking 5m preset starts timer with 300000ms
  start button is disabled when minutes and seconds are both 0
  start button starts timer with custom time
  pause button shown when running, calls pause
  resume button shown when paused, calls resume
  reset button shown when running, calls reset
  flash overlay shown when status is done
  flash overlay not shown when status is running
```
Mock `useTimerStore`, `useNavigationStore`. Use `renderHook` or render with store setState for status transitions.

### `route-index.test.tsx` (extend existing)

Add to existing test file:
```
  timer layer is in DOM
  timer layer has opacity 1 and pointer-events auto when view is timer
  timer layer has opacity 0 and pointer-events none when view is hub
```

### `navigation-store.test.ts` (extend existing)

Add:
```
  setView changes view to timer
  setView changes view from timer back to hub
```

### `widget-grid.test.tsx` (extend existing)

Change expectation from 7 widget cards to 7 (timer replaces theme). Update:
```
  renders widget-card-timer (replaces widget-card-theme)
```

---

## 13. Implementation Order

1. `navigation-store.ts` — add `"timer"` to `View` type. Update tests.
2. `timer-store.ts` + `timer-store.test.ts` — TDD, pure store.
3. `use-timer.ts` + `use-timer.test.ts` — TDD, interval hook.
4. `timer-ring.tsx` — no tests (pure visual/SVG component, verified by E2E).
5. `timer-flash.tsx` — no tests (animation-only component, verified by E2E).
6. `timer-controls.tsx` + tests inside `timer-panel.test.tsx`.
7. `timer-panel.tsx` + `timer-panel.test.tsx` — TDD.
8. `timer-card.tsx` + `timer-card.test.tsx` — TDD.
9. `widget-grid.tsx` — swap ThemeToggleCard for TimerCard. Update `widget-grid.test.tsx`.
10. `routes/index.tsx` — add timer layer. Extend `route-index.test.tsx`.
11. E2E browser verification.

---

## 14. E2E Verification Plan

Using `agent-browser` after dev server is running (`bun run dev` in `apps/web`).

1. Navigate to `http://localhost:4200`
2. Tap/click clock face → hub opens
3. Verify `widget-card-timer` present, shows "No timer"
4. Click timer card → timer panel opens
5. Verify ring shows `--:--`, controls show Start button (disabled)
6. Type `0` minutes, `5` seconds → Start enabled
7. Click Start → timer counts down, ring animates
8. Verify countdown shows `0:05`, decrements to `0:04`, `0:03`...
9. Click a preset (e.g. 5m) → timer resets to `5:00`, running
10. Click Pause → status shows paused, ring dims
11. Click Resume → counting resumes
12. Click Reset → back to `--:--`, start enabled
13. Set 3 seconds, start, wait → `Done!` shows on card, flash overlay appears in panel
14. Click Back → returns to hub, card shows `Done!`
15. Open timer panel again → flash still showing, Reset clears it
16. Swipe left on panel → returns to hub

Screenshot each step to `docs/screenshots/timer-YYYY-MM-DD--<step>.png`.

---

## Assumptions

- **ThemeToggleCard removed from grid** — takes the bottom-right slot for timer. ThemeToggleCard file is kept (not deleted) but not rendered in the grid. The theme store remains intact.
- **Custom time input defaults to 0:00** — user must enter something before Start is active.
- **Preset while running** — calls `start()` directly, which resets and starts immediately. No confirmation dialog.
- **Back button while timer runs** — timer keeps running in background (store persists). Widget card shows live countdown.
- **Flash auto-dismisses** — it does not. User must tap Reset to clear the done state.
- **formatCountdown** lives in `timer-card.tsx` as an exported function (re-used by TimerRing). If it grows, extract to `timer-utils.ts` later.
- **No `useSwipe` for right swipe** — timer panel only swipes left to go back (same as Sonos).
- **Tailwind v4** — uses CSS `@keyframes` in the global CSS file (`apps/web/src/index.css` or equivalent) for `timer-flash` animation, not `tailwind.config.ts`.
- **`foreignObject` not used in SVG** — countdown digits are absolutely positioned over the SVG using a wrapper div with `relative` + `absolute` child.

## Risks

- **`setInterval` drift** — mitigated by using `Date.now()` delta in the hook rather than assuming 100ms per tick.
- **Timer running in background tabs** — not a concern for a wall-mounted iPad that stays on one page.
- **Flash animation on LCD** — iPad Pro 12.9" 4th gen (2020) is LCD, not OLED. Full white flash is safe and visible. Note: alignment doc says "OLED iPad Pro" but the memory doc says LCD. Using white flash is correct for LCD. Red pulse adds color contrast.
- **Grid area `"timer"` CSS** — must add `gridArea: "timer"` style to `BentoCard` call and update `gridTemplateAreas` string in widget-grid.tsx. Existing pattern already supports `gridArea` prop on `BentoCard`.
