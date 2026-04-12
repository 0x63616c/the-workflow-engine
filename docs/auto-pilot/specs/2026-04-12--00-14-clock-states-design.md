# Clock States Design Spec

## Overview

Build a swipe-navigable clock state machine with 9 ambient visual states for the wall-mounted iPad Pro panel. The existing plain art clock becomes State 1 ("home base"). States 2–9 are new full-screen generative visualizations (wireframe globe, constellation map, topographic contours, pendulum, waveform pulse, particle drift, black hole, radar easter egg). Left/right swipe navigates between states with butter-smooth finger-tracking transitions and spring physics. Tap still opens the hub from any state.

---

## Assumptions

Decisions made autonomously (not specified in the alignment doc):

- **State index stored in Zustand**: `clockStateIndex: number` added to `navigation-store.ts`. No separate store. Keeps clock state co-located with the existing view state. Indices are 0-based internally; user-facing state numbers are 1-based (State 1 = index 0, State 9 = index 8).
- **framer-motion version**: 11.x (latest stable). Added as a new dependency to `apps/web/package.json`.
- **@react-three/fiber + @react-three/drei + three**: Added as new dependencies. Three.js for the two 3D states (globe, constellation). Canvas 2D for the remaining 6 generative states.
- **simplex-noise**: Used for topographic contour Perlin/simplex noise field. Lightweight, zero-dependency npm package. ESM-only — implementer must add it to `optimizeDeps.include` in `vite.config.ts` if Vite pre-bundling fails. Fallback: `fast-simplex-noise` (CJS-compatible drop-in).
- **State transition container**: A single `ClockStateCarousel` component in `components/art-clock/` replaces the direct `<ArtClock />` render in `routes/index.tsx`. It holds the framer-motion drag logic and renders the active state component.
- **State indicator dots**: 9 thin dots centered at the bottom of the screen (1px tall thin lines for aesthetic consistency). Active dot is white at full opacity; inactive dots are white at 20% opacity. Hidden when hub is open.
- **Transition mechanics**: framer-motion `useDragControls` + `motion.div` with `drag="x"`. During drag, the active state slides with finger. On release, spring physics settle to previous or next state based on velocity and displacement threshold. The entering state slides in from the appropriate side simultaneously (virtual carousel effect).
- **Displacement threshold**: 80px or velocity > 300px/s to commit a transition. Otherwise spring-snaps back.
- **Spring config**: `stiffness: 400, damping: 40, mass: 1` — snappy but not jarring. Same spring used for snap-back.
- **Canvas 2D states use `requestAnimationFrame` loops**: Started on mount, cancelled on unmount via `useEffect` cleanup.
- **Three.js states use `@react-three/fiber` `useFrame` loop**: Canvas rendered into a `<Canvas>` filling the full viewport.
- **Clock text rendering in visualization states**: Each state component is responsible for rendering its own time text, positioned as described in the alignment doc. All states import `useCurrentTime` from `@/hooks/use-current-time` and `formatTime`/`formatDate` from `@/components/art-clock/art-clock` (which exports these already). No new time logic needed.
- **City timezone data for globe**: Hardcoded in the component. Timezones via `Intl.DateTimeFormat` with `timeZone` option — no timezone library needed.
- **Constellation data**: Hardcoded star coordinates (normalized 0–1 screen space) and line segment pairs for 8 constellations. Not real astronomical coordinates — stylized positions that look good on a 4:3 screen.
- **Tap-to-hub preserved**: The `onClick` handler that triggers `setView("hub")` stays on the clock-layer wrapper in `routes/index.tsx`, so it fires from any clock state.
- **Radar state ordering**: Radar (State 9) is appended at the end of the state array. It is reachable by swiping left from State 8. There is no wrap-around: swiping left on State 9 snaps back; swiping right on State 1 snaps back.
- **No wrap-around**: State machine is linear (1 through 9). Edge states snap back on out-of-bounds swipe.
- **Performance**: All Canvas 2D and Three.js animations target 60fps. Canvas size matches device pixel ratio for crisp rendering on iPad Retina.

---

## Architecture

### State Machine

```
clockStateIndex: 0..8  (Zustand, in navigation-store)

States:
  0: DefaultClock     (existing ArtClock, renamed/wrapped)
  1: WireframeGlobe   (Three.js)
  2: ConstellationMap (Three.js)
  3: TopographicContours (Canvas 2D)
  4: Pendulum         (Canvas 2D)
  5: WaveformPulse    (Canvas 2D)
  6: ParticleDrift    (Canvas 2D)
  7: BlackHole        (Canvas 2D)
  8: Radar            (Canvas 2D, hidden easter egg)
```

### Data Flow

```
NavigationStore (Zustand)
  ├── view: "clock" | "hub"
  └── clockStateIndex: number

routes/index.tsx (HomePage)
  ├── view === "clock" → <ClockStateCarousel />
  └── view === "hub"  → <WidgetGrid />

ClockStateCarousel
  ├── reads clockStateIndex from store
  ├── handles framer-motion drag
  ├── renders active state component
  ├── renders exiting state component (during transition)
  └── renders StateIndicatorDots

State Components (one per state)
  ├── fill full viewport
  ├── render their own time text
  └── run their own animation loop
```

### Component Tree

```
HomePage
├── clock-layer (div, tap → hub)
│   └── ClockStateCarousel
│       ├── motion.div (drag container)
│       │   ├── [exiting state, sliding out]
│       │   └── [active state, sliding in / settled]
│       └── StateIndicatorDots
└── hub-layer (div)
    └── WidgetGrid
```

---

## Implementation Details

### 1. Navigation Store Extension (`stores/navigation-store.ts`)

Add `clockStateIndex` to the existing store:

```typescript
interface NavigationState {
  view: "clock" | "hub";
  clockStateIndex: number;
}

interface NavigationActions {
  setView: (view: "clock" | "hub") => void;
  setClockStateIndex: (index: number) => void;
}
```

`setClockStateIndex` clamps to `0..CLOCK_STATE_COUNT - 1`.

### 2. ClockStateCarousel (`components/art-clock/clock-state-carousel.tsx`)

The central orchestration component. Responsibilities:
- Reads `clockStateIndex` from Zustand.
- Holds `dragX: MotionValue` from `useMotionValue(0)`.
- Uses framer-motion `motion.div` with `drag="x"`. No `dragConstraints` — drag is free on x-axis and spring-snapped on release.
- **Event bubbling**: The carousel sits inside the `clock-layer` div which has `onClick={() => setView("hub")}`. To prevent drag interactions from bubbling up and opening the hub mid-swipe, the carousel's `motion.div` must call `e.stopPropagation()` in its `onPointerDown` handler. This intercepts the touch before it can reach the `clock-layer` onClick.
- `onDragEnd` handler: reads `dragX.get()` and `info.velocity.x`. If displacement > 80px or velocity > 300px/s, commits to next/prev state by calling `setClockStateIndex`. Otherwise, animates dragX back to 0 via spring.
- During an active transition, renders two state components: the outgoing (sliding away) and the incoming (sliding in from the edge). After spring settles, only the current state is rendered.
- Transition state is local React state (`transitionState: null | { from: number; to: number; dragX: number }`).

**Drag-to-transition logic (pseudocode):**
```
onPointerDown(e):
  e.stopPropagation()  // prevent clock-layer onClick from firing

onDragEnd(_, info):
  dx = dragX.get()
  vx = info.velocity.x
  if (dx < -THRESHOLD_PX || vx < -VELOCITY_THRESHOLD) and canGoNext:
    commitTransition(index + 1)
  else if (dx > THRESHOLD_PX || vx > VELOCITY_THRESHOLD) and canGoPrev:
    commitTransition(index - 1)
  else:
    animate(dragX, 0, SPRING_CONFIG)  // snap back

commitTransition(newIndex):
  // Animate dragX to ±screenWidth (slide the outgoing state off-screen),
  // then update clockStateIndex and reset dragX to 0.
  // The incoming state slides in from the opposite edge simultaneously
  // using useTransform(dragX, ...) for its x position.
  animate(dragX, direction * screenWidth, SPRING_CONFIG)
    .then(() => { setClockStateIndex(newIndex); dragX.set(0) })
```

The outgoing state is positioned absolutely at `x: dragX` (it moves with finger), and the incoming state is positioned at `x: dragX + screenWidth` (for left swipe) or `x: dragX - screenWidth` (for right swipe). Both use `useTransform` on `dragX`.

### 3. State Components

All state components share this interface:

```typescript
interface ClockStateProps {
  // No props needed — all state components are self-contained
}
```

Each component:
- Fills full viewport (`absolute inset-0` or `w-full h-full`)
- Renders its own time display
- Manages its own animation loop

#### State 0: DefaultClock

The existing `ArtClock` component, used directly. No changes.

#### State 1: WireframeGlobe (`components/art-clock/states/wireframe-globe.tsx`)

- `@react-three/fiber` `<Canvas>` filling the container.
- `<OrbitControls enabled={false} />` from drei (disables user interaction).
- Wireframe sphere geometry: `<SphereGeometry args={[1.5, 32, 32]}/>` + `<MeshBasicMaterial wireframe color="white" />`.
- Lat/long grid: additional `LineSegments` drawing meridians and parallels at 30° intervals.
- 5 city pins: small white `SphereGeometry` spheres at lat/lng positions converted to 3D. Billboard labels using drei `<Billboard>` + `<Text>` showing `CITY HH:MM AM/PM`.
- Thin lines from pin to label: `<Line>` from drei.
- Rotation: `useFrame((state) => { globeRef.current.rotation.y += ROTATION_SPEED_PER_FRAME })` where `ROTATION_SPEED_PER_FRAME = (2 * Math.PI) / (60 * 60)` (1 revolution per 60 seconds at 60fps).
- Time text: positioned at bottom third via an absolutely-positioned div overlay (not inside Canvas). Shows local time in Geist font-weight-100.
- Camera: orthographic, positioned on z-axis.

**City data (hardcoded):**
```typescript
const CITIES = [
  { name: "LONDON",        lat: 51.5,   lng: -0.1,  tz: "Europe/London"          },
  { name: "SHANGHAI",      lat: 31.2,   lng: 121.5, tz: "Asia/Shanghai"          },
  { name: "BARCELONA",     lat: 41.4,   lng: 2.2,   tz: "Europe/Madrid"          },
  { name: "NEW YORK",      lat: 40.7,   lng: -74.0, tz: "America/New_York"       },
  { name: "LOS ANGELES",   lat: 34.1,   lng: -118.2, tz: "America/Los_Angeles"   },
]
```

#### State 2: ConstellationMap (`components/art-clock/states/constellation-map.tsx`)

- Canvas 2D fullscreen.
- `useEffect` starts `requestAnimationFrame` loop.
- Each frame: clear, draw stars as 1–2px white dots at their positions, draw constellation lines as 0.5px white strokes between connected stars.
- Star positions are pre-computed (normalized 0–1 screen space, hardcoded). 8 constellations, ~5–12 stars each.
- Rotation: apply a slow cumulative `angle` transform to the entire canvas each frame. `ROTATION_SPEED_RAD_PER_MS = 0.00003` (full rotation ~58 hours — visible slow drift).
- Constellation names: `fillText` at centroid of constellation stars, small caps, font-weight 100, 11px, tracking via `letterSpacing`.
- Time text: absolutely positioned div overlay, top or bottom.

**Hardcoded constellations**: Orion, Cassiopeia, Ursa Major (Big Dipper), Ursa Minor, Lyra, Cygnus, Leo, Scorpius.

#### State 3: TopographicContours (`components/art-clock/states/topographic-contours.tsx`)

- Canvas 2D fullscreen.
- Uses `simplex-noise` package to generate a 2D noise field.
- Each frame: advance a `time` offset applied to the noise z-axis (`noise3D(x, y, time)`).
- Marching squares algorithm extracts isolines at regular elevation intervals (every 0.15 units from -1 to 1 → ~13 contour lines).
- Lines drawn at 0.5px stroke width. Opacity maps from `0.2` (near 0 elevation) to `0.8` (near ±1).
- Canvas resolution: `width / 80` × `height / 80` cells for the noise sample grid.
- Time text: absolutely positioned div, centered.

#### State 4: Pendulum (`components/art-clock/states/pendulum.tsx`)

- Canvas 2D fullscreen.
- Physics: `angle = amplitude * cos(t / PERIOD_S * 2π)` where `PERIOD_S = 4`. `amplitude` itself oscillates on a slow ~3-minute cycle: `amplitude = A_MIN + (A_MAX - A_MIN) * 0.5 * (1 + sin(t / BREATHE_PERIOD_S * 2π))`.
- Each frame: compute current angle, push to a trail buffer of 7 positions (ring buffer).
- Draw: trail positions at opacities `[0.08, 0.12, 0.18, 0.26, 0.36, 0.5, 1.0]` (oldest to newest).
- Line: 1.5px stroke, white. Pivot at `(width/2, 0)`. Bob position: `(pivotX + length * sin(angle), pivotY + length * cos(angle))` where `length = height * 0.85`.
- Time text: positioned at pivot point (top center) as absolutely positioned overlay.

#### State 5: WaveformPulse (`components/art-clock/states/waveform-pulse.tsx`)

- Canvas 2D fullscreen.
- Each frame: draw a horizontal polyline across full width (1px steps).
- Y-offset at each x: sum of 3 sine harmonics at different frequencies/phases, all driven by `time`.
- Amplitude of the primary harmonic oscillates slowly (calm ↔ active cycle, ~20-second period).
- Afterglow: each frame, paint the previous frame semi-transparently by filling with `rgba(0,0,0,0.15)` before drawing the new line. This creates a natural decay trail.
- Line: 1px stroke, white, `rgba(255,255,255,0.9)`.
- Time text: absolutely positioned div, centered above the centerline.

#### State 6: ParticleDrift (`components/art-clock/states/particle-drift.tsx`)

- Canvas 2D fullscreen.
- 300 particles initialized with random positions and velocities.
- Each frame: clear canvas, update particle positions (add velocity × dt), wrap at screen edges.
- Connection: for each pair within `CONNECT_DISTANCE_PX = 120`, draw a line at opacity `1 - dist/CONNECT_DISTANCE_PX` scaled to `[0, 0.3]`.
- Optimization: use spatial bucketing (divide screen into cells, only check particles in nearby cells) to avoid O(n²) distance checks.
- Particle density modulation: every 30 seconds, slowly vary speed multiplier between 0.3 and 1.2 (smooth sine curve).
- Time text: absolutely positioned div, centered, particles render behind it.

#### State 7: BlackHole (`components/art-clock/states/black-hole.tsx`)

- Canvas 2D fullscreen.
- Background grid: horizontal and vertical lines at regular intervals. Lines near the center are displaced toward the center using a `1/r` gravitational lensing formula. Lines that cross the event horizon radius are clipped.
- Accretion disk: 5–8 thin concentric ellipses centered on screen, tilted at ~25° from horizontal. Each frame, rotate disk by `DISK_ROTATION_SPEED_RAD_PER_MS`.
- Streak particles: 15–20 tiny dots constrained to elliptical orbits on the disk plane. Each has a phase offset. Drawn with a motion blur trail (3–5 previous positions at decreasing opacity).
- Event horizon: solid black circle at center (no stroke), radius ~8% of viewport width. Masks anything drawn behind it.
- Time text: absolutely positioned div, above the center.

#### State 8: Radar (`components/art-clock/states/radar.tsx`)

- Canvas 2D fullscreen.
- Background: 4 concentric range rings (equal spacing), 2 crosshair lines through center. Stroke: `rgba(255,255,255,0.15)`.
- Cardinal labels: "N", "E", "S", "W" in Geist Mono 10px at ring edges. `rgba(255,255,255,0.3)`.
- Sweep line: rotates from center continuously. `SWEEP_SPEED_RAD_PER_MS = (2 * Math.PI) / 4000` (1 revolution per 4 seconds).
- Afterglow: the sweep leaves a fading arc drawn as a gradient fill from `rgba(255,255,255,0.12)` at the current sweep angle fading to transparent 90° behind it.
- Blips: pool of 6 phantom blips. When the sweep passes through a blip's angle and radius, it lights up at full brightness then decays over 2 seconds. Blips respawn at random positions.
- Time text: absolutely positioned div, center of screen, Geist Mono font, font-weight 100.

### 4. StateIndicatorDots (`components/art-clock/state-indicator-dots.tsx`)

```typescript
interface StateIndicatorDotsProps {
  count: number;       // 9
  activeIndex: number;
  onDotPress?: (index: number) => void; // optional, not wired in MVP
}
```

- Renders 9 thin horizontal dashes (12px wide, 1px tall), spaced 6px apart, centered at bottom of screen (24px from bottom).
- Active: `opacity-100`. Inactive: `opacity-20`. All white.
- No tap interaction in MVP.

### 5. Updated HomePage (`routes/index.tsx`)

Replace direct `<ArtClock />` render with `<ClockStateCarousel />`. No other changes to the hub logic.

---

## File Structure

### New Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/art-clock/clock-state-carousel.tsx` | Carousel orchestrator: framer-motion drag, state transitions, mounts active state component |
| `apps/web/src/components/art-clock/state-indicator-dots.tsx` | 9-dot progress indicator at bottom of screen |
| `apps/web/src/components/art-clock/states/wireframe-globe.tsx` | State 1: Three.js wireframe earth with city pins |
| `apps/web/src/components/art-clock/states/constellation-map.tsx` | State 2: Canvas 2D rotating star field with constellation lines |
| `apps/web/src/components/art-clock/states/topographic-contours.tsx` | State 3: Canvas 2D simplex noise contour lines |
| `apps/web/src/components/art-clock/states/pendulum.tsx` | State 4: Canvas 2D pendulum with opacity trail |
| `apps/web/src/components/art-clock/states/waveform-pulse.tsx` | State 5: Canvas 2D sine wave with afterglow trail |
| `apps/web/src/components/art-clock/states/particle-drift.tsx` | State 6: Canvas 2D Plexus particle field |
| `apps/web/src/components/art-clock/states/black-hole.tsx` | State 7: Canvas 2D gravitational lensing grid + accretion disk |
| `apps/web/src/components/art-clock/states/radar.tsx` | State 8: Canvas 2D rotating radar sweep with blips |
| `apps/web/src/__tests__/clock-state-carousel.test.tsx` | Unit tests for carousel state machine and swipe logic |
| `apps/web/src/__tests__/state-indicator-dots.test.tsx` | Unit tests for indicator dots rendering |

### Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/stores/navigation-store.ts` | Add `clockStateIndex: number` state and `setClockStateIndex` action |
| `apps/web/src/routes/index.tsx` | Replace `<ArtClock />` with `<ClockStateCarousel />` |
| `apps/web/package.json` | Add `framer-motion`, `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`, `simplex-noise` |

### No Changes Needed

| File | Reason |
|------|--------|
| `apps/web/src/components/art-clock/art-clock.tsx` | Used directly as State 0, no changes |
| `apps/web/src/hooks/use-swipe.ts` | Not used for state machine transitions (framer-motion replaces it here). Hub swipe-right behavior is separate and unchanged |
| `apps/web/src/components/hub/widget-grid.tsx` | No changes; hub swipe-right still uses `useSwipe` |
| `apps/web/src/styles/globals.css` | No new CSS; all styling via Tailwind + inline styles |

---

## Testing Strategy

### Unit Tests: Navigation Store (`stores/navigation-store.ts`)

Add to existing store tests or create `__tests__/navigation-store.test.ts`:

- `clockStateIndex` defaults to `0`
- `setClockStateIndex(3)` sets index to `3`
- `setClockStateIndex` clamps below 0 to 0
- `setClockStateIndex` clamps above 8 to 8
- `view` and `clockStateIndex` are independent (changing one doesn't affect the other)

### Unit Tests: ClockStateCarousel (`__tests__/clock-state-carousel.test.tsx`)

Mock all state components (`vi.mock`) to return a `<div data-testid="state-{name}" />`.

- Renders `state-default-clock` when `clockStateIndex === 0`
- Renders `state-wireframe-globe` when `clockStateIndex === 1`
- Renders `state-radar` when `clockStateIndex === 8`
- Renders `StateIndicatorDots` with `activeIndex` matching the store
- `onDragEnd` with `deltaX < -80` and `index < 8` calls `setClockStateIndex(index + 1)`
- `onDragEnd` with `deltaX > 80` and `index > 0` calls `setClockStateIndex(index - 1)`
- `onDragEnd` with `deltaX > 80` and `index === 0` does NOT call `setClockStateIndex` (no wrap)
- `onDragEnd` with `deltaX < -80` and `index === 8` does NOT call `setClockStateIndex` (no wrap)
- `onDragEnd` with small delta snaps back (verifiable via `animate` mock)

Use `vi.useFakeTimers()` and mock `framer-motion` `animate` function where needed.

### Unit Tests: StateIndicatorDots (`__tests__/state-indicator-dots.test.tsx`)

- Renders `count` dot elements
- Active dot (matching `activeIndex`) has full opacity class/style
- All other dots have reduced opacity
- Correct count of full vs reduced opacity dots

### Visual/Integration Tests

Since Canvas 2D and Three.js rendering cannot be meaningfully tested in jsdom, each canvas state has a mount/unmount smoke test:

- Component renders without throwing
- Canvas element is present in the DOM
- Animation frame is requested on mount (via `vi.spyOn(window, 'requestAnimationFrame')`)
- Animation frame is cancelled on unmount (via `vi.spyOn(window, 'cancelAnimationFrame')`)

Three.js tests mock `@react-three/fiber` to avoid WebGL in jsdom.

---

## E2E Verification Plan

### Prerequisites

- Working directory: `apps/web` within the worktree
- No backend needed (pure frontend)
- `agent-browser` available in PATH

### Step 1: Install Dependencies

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web
bun add framer-motion @react-three/fiber @react-three/drei three simplex-noise
bun add -d @types/three
```

Verify: no install errors.

### Step 2: Run Unit Tests

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web
bun run test
```

**PASS**: All tests pass, zero failures.
**FAIL**: Any test failure.

### Step 3: Type Check

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web
bun run build 2>&1 | head -50
```

**PASS**: Exits 0.
**FAIL**: TypeScript errors printed.

### Step 4: Lint

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web
bun run lint:fix
```

**PASS**: Exits 0.
**FAIL**: Biome errors that could not be auto-fixed.

### Step 5: Start Dev Server

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe
bun run dev --filter=@repo/web
```

Wait for port 4200 to be ready.

### Step 6: Visual Verification — State 0 (Default Clock)

```bash
agent-browser screenshot http://localhost:4200
```

**PASS**:
- Art clock centered on true black background
- Time and date visible
- 9 state indicator dots visible at bottom center
- Active dot (first) fully opaque; remaining 8 at ~20% opacity

**FAIL**: Clock not visible, background not black, dots missing.

### Step 7: Visual Verification — Swipe to State 1 (Wireframe Globe)

Use agent-browser `mouse` actions to simulate a left swipe (drag from right to left across the viewport). The viewport is 1366x1024 at default scale.

```bash
agent-browser open http://localhost:4200
agent-browser mouse move 1000 512
agent-browser mouse down
agent-browser mouse move 300 512
agent-browser mouse up
agent-browser screenshot docs/screenshots/state-1-wireframe-globe.png
```

**PASS**:
- Wireframe sphere visible (white lat/long grid lines on black)
- 5 city labels with time values visible
- Time text in bottom third
- State indicator shows second dot active

**FAIL**: White screen, error overlay, no globe, still showing default clock.

### Step 8: Visual Verification — Navigate All States

Repeat the mouse drag sequence from Step 7 to navigate left through states 2–8 one at a time, taking a screenshot after each. Save screenshots to `docs/screenshots/state-N-*.png`.

State 2 (Constellation Map): Star dots and connecting lines visible. Constellation names in small caps.
State 3 (Topographic Contours): Flowing white contour lines at varying opacities.
State 4 (Pendulum): Thin vertical line with opacity fan trail from top pivot.
State 5 (Waveform Pulse): Horizontal sine wave with afterglow centered on screen.
State 6 (Particle Drift): Scattered dots with connecting lines between nearby particles.
State 7 (Black Hole): Warped grid lines converging on center, elliptical accretion disk rings.
State 8 (Radar): Concentric rings, crosshairs, rotating sweep line with fade trail.

**PASS for each**: Visualization is visible and clearly matches the description. No blank canvas, no JS error overlays.
**FAIL**: Blank canvas, missing elements, or error overlay.

### Step 9: Visual Verification — Edge Behavior

Attempt to swipe left from State 8 (Radar):

**PASS**: Snaps back to State 8. No transition occurs. Indicator stays on dot 9.
**FAIL**: Wraps around to State 0, or no snap-back.

Attempt to swipe right from State 0 (Default Clock):

**PASS**: Snaps back to State 0. No transition occurs.
**FAIL**: Wraps around to State 8.

### Step 10: Visual Verification — Tap-to-Hub

From any clock state, click/tap the center of the screen. Use a short single click (not a drag) so it registers as a tap, not a swipe. The viewport center at default 1366x1024 is approximately (683, 512).

```bash
agent-browser open http://localhost:4200
agent-browser mouse move 683 512
agent-browser mouse down
agent-browser mouse up
agent-browser screenshot docs/screenshots/hub-open.png
```

**PASS**: Hub overlay appears (widget grid visible). State indicator dots not visible when hub is open.
**FAIL**: Hub does not appear, or state indicator still visible over hub.

Note: if the mouse down/up approach does not register as a click, use `agent-browser eval "document.querySelector('[data-testid=clock-layer]').click()"` as an alternative.

### Step 11: Visual Verification — Hub-to-Clock Return Preserves State

Navigate to State 5 (WaveformPulse) via 4 left-swipe gestures. Open the hub via tap. Dismiss the hub via a right swipe gesture (the existing `useSwipe` hook in `WidgetGrid` calls `setView("clock")` on swipe-right):

```bash
# Open hub (tap)
agent-browser mouse move 683 512
agent-browser mouse down
agent-browser mouse up
# Dismiss hub (swipe right)
agent-browser mouse move 300 512
agent-browser mouse down
agent-browser mouse move 1000 512
agent-browser mouse up
agent-browser screenshot docs/screenshots/hub-dismissed-state5.png
```

**PASS**: Returns to State 5 (waveform pulse), not State 0. `clockStateIndex` not reset when hub opens/closes.
**FAIL**: Returns to State 0 after hub dismissal, or hub does not dismiss.

### Step 12: Visual Verification — Transition Smoothness

Initiate a slow drag left, hold at ~40px (under threshold), release:

**PASS**: Snaps back to current state with visible spring animation.
**FAIL**: Snaps abruptly or commits the transition.

Initiate a fast flick left:

**PASS**: Transitions to next state with spring settle.
**FAIL**: Stays on current state despite velocity.

---

## Error Handling

### ClockStateCarousel

- Out-of-bounds `clockStateIndex` from store: `CLOCK_STATES` array access would return `undefined`. Guard: `const StateComponent = CLOCK_STATES[clockStateIndex] ?? CLOCK_STATES[0]`.
- framer-motion drag `onDragEnd` receives zero velocity: handled by displacement threshold alone.

### Canvas State Components

- `canvas.getContext("2d")` returns null (SSR or unsupported): guard with `if (!ctx) return;` in `useEffect`. No error thrown, canvas is blank.
- `cancelAnimationFrame` in cleanup: always safe to call, even if frame was already executed.

### Three.js State Components

- WebGL context creation failure (unlikely on iPad): `@react-three/fiber` handles this gracefully, renders nothing. No crash.
- City timezone string invalid in `Intl.DateTimeFormat`: wrapped in try/catch, falls back to UTC.

### State Indicator Dots

- Purely presentational. No error states possible.

### Navigation Store

- `setClockStateIndex` with NaN or non-integer: clamp logic (`Math.max(0, Math.min(8, Math.round(index)))`) prevents invalid state.
