# Home Page Hub Design Spec

## Overview

Build a widget grid hub accessible by tapping the art clock. The clock is the idle/screensaver state; tapping it reveals a 2-column dashboard of summary widgets. Three mechanisms return the user to the clock: swipe right, tap empty space, and auto-timeout after inactivity. All widgets are placeholder/skeleton only, no real data fetching.

## Assumptions

Decisions made autonomously (not specified in alignment doc):

- **View state management**: A Zustand store (`navigation-store.ts`) holds a `view` field (`"clock" | "hub"`). No TanStack Router navigation, both views live on the same `/` route. This avoids URL changes, back-button issues, and keeps the clock-to-hub transition as a local UI state change.
- **Transition animation**: CSS opacity crossfade, 500ms duration. Clock fades out while hub fades in. Uses CSS `transition` on opacity with `pointer-events: none` on the hidden view to prevent ghost taps.
- **Auto-return timeout**: 45 seconds (midpoint of the 30-60s range). Resets on any touch event within the hub. Implemented via a `useIdleTimeout` hook.
- **Widget card design**: Dark card (`bg-card`) with subtle border (`border-border`), rounded corners (`rounded-xl`), padding `p-6`. Each card has an icon (lucide-react), a title, and a placeholder value or skeleton line. Art aesthetic, minimal, consistent with midnight palette.
- **Grid layout**: CSS Grid, 2 columns, `gap-4`, with `p-6` page padding. On the 4:3 iPad Pro 12.9" (2732x2048 logical 1366x1024), this gives two comfortable columns.
- **Widget list**: 6 placeholder widgets in this order: Clock (shows current time summary), Weather, Lights, Music, Calendar, Notifications. Each shows a static placeholder value (e.g., "72F", "3 on", "Not playing", "No events", "None").
- **Clock widget in hub**: The clock widget is a smaller summary card showing the current time, not the full art clock. Tapping it also returns to the full clock view.
- **Tap-to-return detection**: An `onClick` handler on the hub container. If the click target is the container itself (not a widget card), it triggers return to clock. Uses `e.target === e.currentTarget` check on the grid wrapper's parent.
- **Swipe detection**: Reuses the existing `useSwipe` hook with `onSwipeRight` to return to clock.
- **Hub header**: No header or title bar. The grid starts from the top with padding. Keeps it minimal and art-forward.
- **Touch feedback**: No ripple or press effects on placeholder widgets. They are non-interactive placeholders. Only the clock widget card is tappable (returns to clock).

## Architecture

### Data Flow

```
NavigationStore (Zustand)
  |
  +--> HomePage reads `view` state
  |      |
  |      +--> view === "clock": renders ArtClock (full screen, tap to open hub)
  |      +--> view === "hub": renders WidgetGrid (tap empty/swipe/timeout to close)
  |
  +--> setView("hub") called on clock tap
  +--> setView("clock") called on swipe right, tap empty space, or idle timeout
```

### Components

1. **NavigationStore** (`stores/navigation-store.ts`) - Zustand store for view state
2. **HomePage** (`routes/index.tsx`) - Orchestrates clock/hub views with transitions
3. **WidgetGrid** (`components/hub/widget-grid.tsx`) - 2-column grid of widget cards
4. **WidgetCard** (`components/hub/widget-card.tsx`) - Individual card with icon, title, value
5. **useIdleTimeout** (`hooks/use-idle-timeout.ts`) - Hook that calls a callback after N seconds of no touch, resets on touch

### State Shape

```typescript
interface NavigationState {
  view: "clock" | "hub";
}

interface NavigationActions {
  setView: (view: "clock" | "hub") => void;
}
```

## Implementation Details

### 1. Navigation Store (`stores/navigation-store.ts`)

Minimal Zustand store:

```typescript
import { create } from "zustand";

interface NavigationState {
  view: "clock" | "hub";
}

interface NavigationActions {
  setView: (view: "clock" | "hub") => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  setView: (view) => set({ view }),
}));
```

### 2. useIdleTimeout Hook (`hooks/use-idle-timeout.ts`)

```typescript
function useIdleTimeout(
  callback: () => void,
  timeout_MS: number,
  options?: { enabled?: boolean }
): void
```

- Starts a timer on mount (when enabled)
- Resets timer on any `touchstart` event on `document`
- Calls `callback` when timer expires
- Cleans up on unmount
- Uses `useRef` for the timer ID, `useCallback` for stable callback reference

### 3. HomePage (`routes/index.tsx`)

Orchestrates both views. Both views are always mounted but toggle visibility via opacity and pointer-events. This avoids remounting the clock (which would flash) and keeps the transition smooth.

```typescript
import { ArtClock } from "@/components/art-clock/art-clock";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { useNavigationStore } from "@/stores/navigation-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const view = useNavigationStore((s) => s.view);
  const setView = useNavigationStore((s) => s.setView);

  return (
    <div className="relative h-full">
      {/* Clock layer */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: view === "clock" ? 1 : 0,
          pointerEvents: view === "clock" ? "auto" : "none",
        }}
        onClick={() => setView("hub")}
      >
        <ArtClock />
      </div>

      {/* Hub layer */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: view === "hub" ? 1 : 0,
          pointerEvents: view === "hub" ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>
    </div>
  );
}
```

### 4. WidgetGrid (`components/hub/widget-grid.tsx`)

The grid container with all three return-to-clock mechanisms:

- `useSwipe` with `onSwipeRight` to return to clock
- `useIdleTimeout` with 45s timeout to return to clock
- `onClick` on the outer container (checking `e.target === e.currentTarget`) to return to clock

```typescript
const IDLE_TIMEOUT_MS = 45_000;

const WIDGETS = [
  { id: "clock", icon: Clock, title: "Clock", value: "" },  // value filled dynamically
  { id: "weather", icon: CloudSun, title: "Weather", value: "72\u00b0F" },
  { id: "lights", icon: Lightbulb, title: "Lights", value: "3 on" },
  { id: "music", icon: Music, title: "Music", value: "Not playing" },
  { id: "calendar", icon: Calendar, title: "Calendar", value: "No events" },
  { id: "notifications", icon: Bell, title: "Notifications", value: "None" },
] as const;
```

The grid wrapper div gets the swipe ref and the click handler. The grid itself is a CSS grid with `grid-cols-2 gap-4 p-6`.

When the clock widget card is tapped, it also returns to the full clock view.

### 5. WidgetCard (`components/hub/widget-card.tsx`)

```typescript
interface WidgetCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  onClick?: () => void;
}
```

Layout:
```
+---------------------------+
|  [icon]  Title            |
|                           |
|  Value text               |
+---------------------------+
```

- Container: `bg-card border border-border rounded-xl p-6`
- Icon: 20px, `text-muted-foreground`
- Title: `text-sm font-[300] text-muted-foreground`, inline with icon, `ml-2`
- Value: `text-2xl font-[200] text-foreground mt-3`
- If `onClick` is provided, the card gets `cursor-pointer` and an `onClick` handler

### 6. ArtClock Changes

No changes to the ArtClock component itself. The tap handler is on the parent wrapper in HomePage, not on ArtClock.

## File Structure

### Create

| File | Purpose |
|------|---------|
| `src/stores/navigation-store.ts` | Zustand store for clock/hub view state |
| `src/hooks/use-idle-timeout.ts` | Hook that fires callback after idle period, resets on touch |
| `src/components/hub/widget-grid.tsx` | 2-column grid container with return-to-clock logic |
| `src/components/hub/widget-card.tsx` | Individual widget card component |
| `src/__tests__/navigation-store.test.ts` | Unit tests for navigation store |
| `src/__tests__/use-idle-timeout.test.ts` | Unit tests for idle timeout hook |
| `src/__tests__/widget-grid.test.tsx` | Unit tests for widget grid |
| `src/__tests__/widget-card.test.tsx` | Unit tests for widget card |
| `src/__tests__/home-page-hub.test.tsx` | Integration tests for clock/hub transitions |

### Modify

| File | Change |
|------|--------|
| `src/routes/index.tsx` | Replace simple ArtClock render with dual-layer clock/hub layout |

### No Changes

| File | Reason |
|------|--------|
| `src/components/art-clock/art-clock.tsx` | Clock is unchanged, tap handler lives in parent |
| `src/hooks/use-swipe.ts` | Reused as-is |
| `src/stores/theme-store.ts` | No theme changes |
| `src/styles/globals.css` | No new CSS needed, all styling via Tailwind classes |

## Testing Strategy

### Unit Tests: Navigation Store (`__tests__/navigation-store.test.ts`)

- **Default state**: `view` is `"clock"`
- **setView to hub**: Changes `view` to `"hub"`
- **setView to clock**: Changes `view` back to `"clock"`

### Unit Tests: useIdleTimeout (`__tests__/use-idle-timeout.test.ts`)

- **Calls callback after timeout**: Mount with 1000ms, advance timers by 1000ms, callback fires
- **Does not call before timeout**: Advance by 999ms, callback not called
- **Resets on touch**: Advance by 500ms, fire touchstart on document, advance by 999ms, not called, advance by 1ms more, called
- **Does not fire when disabled**: Mount with `enabled: false`, advance past timeout, callback not called
- **Cleans up on unmount**: Mount, unmount, advance past timeout, callback not called

Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.

### Unit Tests: WidgetCard (`__tests__/widget-card.test.tsx`)

- **Renders icon, title, and value**: Pass props, verify text content
- **Calls onClick when clicked**: Pass onClick mock, click card, verify called
- **No cursor-pointer without onClick**: Render without onClick, verify no cursor-pointer class

### Unit Tests: WidgetGrid (`__tests__/widget-grid.test.tsx`)

- **Renders all 6 widget cards**: Check for all widget titles
- **Renders placeholder values**: Check for "72F", "3 on", etc.

### Integration Tests: HomePage Hub (`__tests__/home-page-hub.test.tsx`)

- **Initially shows clock**: Clock layer has opacity 1, hub layer has opacity 0
- **Tap clock opens hub**: Click on clock layer, verify hub layer opacity becomes 1
- **Tap empty space in hub returns to clock**: Click hub container (not a card), verify clock layer opacity becomes 1
- **Auto-return after timeout**: Open hub, advance timers by 45000ms, verify clock layer restored
- **Clock widget tap returns to clock**: Open hub, click clock widget card, verify clock layer restored

These tests use the Zustand store directly to verify state changes, and render the full HomePage to test the integration.

## E2E Verification Plan

### Prerequisites
- Working directory: `apps/web`
- No backend needed (pure frontend)

### Steps

1. **Run unit tests**
   ```bash
   cd apps/web && bun run test
   ```
   All tests must pass. Zero failures.

2. **Run type check**
   ```bash
   cd apps/web && bunx tsc --noEmit
   ```
   Must exit 0.

3. **Run lint**
   ```bash
   cd apps/web && bun run lint:fix
   ```
   Must exit 0.

4. **Start dev server**
   ```bash
   cd apps/web && bun run dev
   ```
   Wait for "ready" message on port 4200.

5. **Visual verification: clock state**
   Open `http://localhost:4200` using agent-browser.

   **Verify**:
   - Art clock displays centered, full screen, same as before
   - True black background
   - Time and date visible

6. **Visual verification: tap to open hub**
   Tap/click anywhere on the clock.

   **Verify**:
   - Clock fades out, hub fades in (smooth transition)
   - 2-column grid of 6 widget cards visible
   - Cards have dark backgrounds with subtle borders
   - Each card shows icon, title, and placeholder value
   - Background is true black (between cards)

7. **Visual verification: return to clock**
   - Tap empty space between cards -> clock should fade back in
   - Open hub again, swipe right -> clock should fade back in
   - Open hub again, wait 45+ seconds -> clock should auto-return

8. **Visual verification: clock widget**
   Open hub, tap the Clock widget card.

   **Verify**: Returns to full art clock view.

### PASS Criteria
- All unit tests pass
- Type check passes
- Lint passes
- Clock renders identically to current state when in clock view
- Tapping clock opens hub with smooth fade transition
- Hub shows 2-column grid of 6 cards with correct placeholder content
- All three return-to-clock mechanisms work (swipe right, tap empty, auto-timeout)
- Clock widget in hub shows current time and returns to clock on tap
- Dark art aesthetic maintained throughout

### FAIL Criteria
- Any test failure
- Type errors
- Clock view changed or broken
- Hub does not appear on tap
- Grid layout broken (not 2 columns, cards overlapping)
- Any return-to-clock mechanism not working
- Bright or non-black backgrounds
- Visible jank or flash during transitions

## Error Handling

- **Navigation store**: `setView` only accepts `"clock" | "hub"` via TypeScript. No runtime validation needed.
- **useIdleTimeout**: Cleans up timer on unmount. If `document` event listener fails (not expected in browser SPA), timeout still fires on initial schedule.
- **WidgetGrid**: If `useSwipe` ref is null (not expected), swipe detection is disabled gracefully (existing hook handles this).
- **WidgetCard**: Pure presentational component. No error states. If icon prop is invalid, React renders nothing for that slot.
- **Transition**: Both layers always mounted. If Zustand store somehow has an unexpected value, both layers would be hidden (opacity 0), which is acceptable as a no-data state. The store type system prevents this.
