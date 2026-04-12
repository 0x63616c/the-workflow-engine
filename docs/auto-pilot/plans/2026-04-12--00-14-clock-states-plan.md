# Clock States Implementation Plan

**Goal:** Build a swipe-navigable 9-state ambient clock using framer-motion finger-tracking transitions, with each state a full-screen generative visualization.
**Architecture:** A `ClockStateCarousel` replaces `<ArtClock />` in `routes/index.tsx` and orchestrates framer-motion drag transitions between 9 state components; `clockStateIndex` lives in the existing Zustand navigation store; `StateIndicatorDots` provides a persistent position indicator.
**Tech Stack:** React 19, framer-motion 11.x, @react-three/fiber + @react-three/drei + three (States 1–2), Canvas 2D + requestAnimationFrame (States 3–8), simplex-noise (State 3), Vitest + Testing Library, Zustand.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: Write the failing test**

No test for dependency installation — verify by import in later tasks. Skip to Step 3.

- [ ] **Step 2: Install packages**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun add framer-motion @react-three/fiber @react-three/drei three simplex-noise && bun add -d @types/three
```

Expected: No errors, packages appear in `package.json` dependencies.

- [ ] **Step 3: Add simplex-noise to Vite optimizeDeps**

In `apps/web/vite.config.ts`, add `optimizeDeps` to ensure simplex-noise is pre-bundled:

```typescript
export default defineConfig({
  optimizeDeps: {
    include: ["simplex-noise"],
  },
  plugins: [...],
  ...
});
```

- [ ] **Step 4: Verify type-check passes**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run build 2>&1 | head -30
```

Expected: Exits 0, no TypeScript errors from new packages.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/bun.lock apps/web/vite.config.ts
git commit -m "chore: add framer-motion, three.js, simplex-noise deps"
git push
```

---

### Task 2: Extend Navigation Store with `clockStateIndex`

**Files:**
- Modify: `apps/web/src/stores/navigation-store.ts`
- Test: `apps/web/src/__tests__/navigation-store.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/__tests__/navigation-store.test.ts`:

```typescript
import { CLOCK_STATE_COUNT } from "@/stores/navigation-store";

describe("clockStateIndex", () => {
  afterEach(() => {
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  it("initializes clockStateIndex to 0", () => {
    expect(useNavigationStore.getState().clockStateIndex).toBe(0);
  });

  it("setClockStateIndex sets index to 3", () => {
    useNavigationStore.getState().setClockStateIndex(3);
    expect(useNavigationStore.getState().clockStateIndex).toBe(3);
  });

  it("setClockStateIndex clamps below 0 to 0", () => {
    useNavigationStore.getState().setClockStateIndex(-1);
    expect(useNavigationStore.getState().clockStateIndex).toBe(0);
  });

  it("setClockStateIndex clamps above 8 to 8", () => {
    useNavigationStore.getState().setClockStateIndex(9);
    expect(useNavigationStore.getState().clockStateIndex).toBe(8);
  });

  it("setClockStateIndex clamps NaN to 0", () => {
    useNavigationStore.getState().setClockStateIndex(Number.NaN);
    expect(useNavigationStore.getState().clockStateIndex).toBe(0);
  });

  it("changing clockStateIndex does not affect view", () => {
    useNavigationStore.getState().setClockStateIndex(5);
    expect(useNavigationStore.getState().view).toBe("clock");
  });

  it("changing view does not affect clockStateIndex", () => {
    useNavigationStore.getState().setClockStateIndex(3);
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().clockStateIndex).toBe(3);
  });

  it("CLOCK_STATE_COUNT is 9", () => {
    expect(CLOCK_STATE_COUNT).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- navigation-store
```

Expected: FAIL — `clockStateIndex` and `setClockStateIndex` not found.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/stores/navigation-store.ts`:

```typescript
import { create } from "zustand";

export const CLOCK_STATE_COUNT = 9;

interface NavigationState {
  view: "clock" | "hub";
  clockStateIndex: number;
}

interface NavigationActions {
  setView: (view: "clock" | "hub") => void;
  setClockStateIndex: (index: number) => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  clockStateIndex: 0,
  setView: (view) => set({ view }),
  setClockStateIndex: (index) =>
    set({ clockStateIndex: Math.max(0, Math.min(CLOCK_STATE_COUNT - 1, Math.round(isNaN(index) ? 0 : index))) }),
}));
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- navigation-store
```

Expected: PASS — all 8 new tests pass plus all 3 existing tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/stores/navigation-store.ts apps/web/src/__tests__/navigation-store.test.ts
git commit -m "feat: add clockStateIndex to navigation store"
git push
```

---

### Task 3: StateIndicatorDots Component

**Files:**
- Create: `apps/web/src/components/art-clock/state-indicator-dots.tsx`
- Test: `apps/web/src/__tests__/state-indicator-dots.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/state-indicator-dots.test.tsx`:

```typescript
import { StateIndicatorDots } from "@/components/art-clock/state-indicator-dots";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("StateIndicatorDots", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders count dot elements", () => {
    render(<StateIndicatorDots count={9} activeIndex={0} />);
    const dots = screen.getAllByTestId(/^state-dot-/);
    expect(dots).toHaveLength(9);
  });

  it("active dot has opacity-100 style", () => {
    render(<StateIndicatorDots count={9} activeIndex={3} />);
    const activeDot = screen.getByTestId("state-dot-3");
    expect(activeDot).toHaveStyle({ opacity: "1" });
  });

  it("inactive dots have opacity 0.2", () => {
    render(<StateIndicatorDots count={9} activeIndex={0} />);
    const inactiveDot = screen.getByTestId("state-dot-1");
    expect(inactiveDot).toHaveStyle({ opacity: "0.2" });
  });

  it("only the active dot has full opacity", () => {
    render(<StateIndicatorDots count={9} activeIndex={4} />);
    const allDots = screen.getAllByTestId(/^state-dot-/);
    const fullOpacityDots = allDots.filter((d) => d.getAttribute("style")?.includes("opacity: 1"));
    expect(fullOpacityDots).toHaveLength(1);
  });

  it("8 inactive dots have reduced opacity when activeIndex is 4", () => {
    render(<StateIndicatorDots count={9} activeIndex={4} />);
    const allDots = screen.getAllByTestId(/^state-dot-/);
    const reducedDots = allDots.filter((d) => d.getAttribute("style")?.includes("opacity: 0.2"));
    expect(reducedDots).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- state-indicator-dots
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/components/art-clock/state-indicator-dots.tsx`:

```typescript
interface StateIndicatorDotsProps {
  count: number;
  activeIndex: number;
}

export function StateIndicatorDots({ count, activeIndex }: StateIndicatorDotsProps) {
  return (
    <div
      className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5"
      style={{ pointerEvents: "none" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-testid={`state-dot-${i}`}
          className="h-px w-3 bg-white"
          style={{ opacity: i === activeIndex ? 1 : 0.2 }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- state-indicator-dots
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/state-indicator-dots.tsx apps/web/src/__tests__/state-indicator-dots.test.tsx
git commit -m "feat: add StateIndicatorDots component"
git push
```

---

### Task 4: ClockStateCarousel Component

**Files:**
- Create: `apps/web/src/components/art-clock/clock-state-carousel.tsx`
- Test: `apps/web/src/__tests__/clock-state-carousel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/clock-state-carousel.test.tsx`:

```typescript
import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all state components so they render identifiable divs without canvas/WebGL
vi.mock("@/components/art-clock/art-clock", () => ({
  ArtClock: () => <div data-testid="state-default-clock" />,
}));
vi.mock("@/components/art-clock/states/wireframe-globe", () => ({
  WireframeGlobe: () => <div data-testid="state-wireframe-globe" />,
}));
vi.mock("@/components/art-clock/states/constellation-map", () => ({
  ConstellationMap: () => <div data-testid="state-constellation-map" />,
}));
vi.mock("@/components/art-clock/states/topographic-contours", () => ({
  TopographicContours: () => <div data-testid="state-topographic-contours" />,
}));
vi.mock("@/components/art-clock/states/pendulum", () => ({
  Pendulum: () => <div data-testid="state-pendulum" />,
}));
vi.mock("@/components/art-clock/states/waveform-pulse", () => ({
  WaveformPulse: () => <div data-testid="state-waveform-pulse" />,
}));
vi.mock("@/components/art-clock/states/particle-drift", () => ({
  ParticleDrift: () => <div data-testid="state-particle-drift" />,
}));
vi.mock("@/components/art-clock/states/black-hole", () => ({
  BlackHole: () => <div data-testid="state-black-hole" />,
}));
vi.mock("@/components/art-clock/states/radar", () => ({
  Radar: () => <div data-testid="state-radar" />,
}));

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onPointerDown, onDragEnd, ...props }: React.ComponentPropsWithRef<"div"> & { onDragEnd?: unknown }) => (
      <div {...props} onPointerDown={onPointerDown as React.PointerEventHandler}>
        {children}
      </div>
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: (_mv: unknown, _input: unknown, output: number[]) => ({ get: () => output[0] }),
  animate: vi.fn(),
}));

describe("ClockStateCarousel", () => {
  beforeEach(() => {
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  afterEach(() => {
    cleanup();
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  it("renders state-default-clock when clockStateIndex is 0", () => {
    render(<ClockStateCarousel />);
    expect(screen.getByTestId("state-default-clock")).toBeInTheDocument();
  });

  it("renders state-wireframe-globe when clockStateIndex is 1", () => {
    useNavigationStore.setState({ clockStateIndex: 1 });
    render(<ClockStateCarousel />);
    expect(screen.getByTestId("state-wireframe-globe")).toBeInTheDocument();
  });

  it("renders state-radar when clockStateIndex is 8", () => {
    useNavigationStore.setState({ clockStateIndex: 8 });
    render(<ClockStateCarousel />);
    expect(screen.getByTestId("state-radar")).toBeInTheDocument();
  });

  it("renders StateIndicatorDots with matching activeIndex", () => {
    useNavigationStore.setState({ clockStateIndex: 5 });
    render(<ClockStateCarousel />);
    const activeDot = screen.getByTestId("state-dot-5");
    expect(activeDot).toHaveStyle({ opacity: "1" });
  });

  it("renders 9 indicator dots", () => {
    render(<ClockStateCarousel />);
    const dots = screen.getAllByTestId(/^state-dot-/);
    expect(dots).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- clock-state-carousel
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/components/art-clock/clock-state-carousel.tsx`:

```typescript
import { ArtClock } from "@/components/art-clock/art-clock";
import { StateIndicatorDots } from "@/components/art-clock/state-indicator-dots";
import { BlackHole } from "@/components/art-clock/states/black-hole";
import { ConstellationMap } from "@/components/art-clock/states/constellation-map";
import { Pendulum } from "@/components/art-clock/states/pendulum";
import { ParticleDrift } from "@/components/art-clock/states/particle-drift";
import { Radar } from "@/components/art-clock/states/radar";
import { TopographicContours } from "@/components/art-clock/states/topographic-contours";
import { WaveformPulse } from "@/components/art-clock/states/waveform-pulse";
import { WireframeGlobe } from "@/components/art-clock/states/wireframe-globe";
import { CLOCK_STATE_COUNT, useNavigationStore } from "@/stores/navigation-store";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useState } from "react";

const DRAG_THRESHOLD_PX = 80;
const VELOCITY_THRESHOLD_PX_S = 300;
const SPRING_CONFIG = { stiffness: 400, damping: 40, mass: 1 } as const;

type StateComponent = React.ComponentType;

const CLOCK_STATES: StateComponent[] = [
  ArtClock,
  WireframeGlobe,
  ConstellationMap,
  TopographicContours,
  Pendulum,
  WaveformPulse,
  ParticleDrift,
  BlackHole,
  Radar,
];

interface TransitionState {
  from: number;
  to: number;
  direction: 1 | -1;
}

export function ClockStateCarousel() {
  const clockStateIndex = useNavigationStore((s) => s.clockStateIndex);
  const setClockStateIndex = useNavigationStore((s) => s.setClockStateIndex);
  const dragX = useMotionValue(0);
  const [transition, setTransition] = useState<TransitionState | null>(null);

  const screenWidth = window.innerWidth;

  const outgoingX = useTransform(dragX, (v) => v);
  const incomingX = useTransform(dragX, (v) =>
    transition ? v + transition.direction * screenWidth : screenWidth
  );

  const commitTransition = useCallback(
    (newIndex: number, direction: 1 | -1) => {
      setTransition({ from: clockStateIndex, to: newIndex, direction });
      animate(dragX, -direction * screenWidth, {
        ...SPRING_CONFIG,
        onComplete: () => {
          setClockStateIndex(newIndex);
          dragX.set(0);
          setTransition(null);
        },
      });
    },
    [clockStateIndex, setClockStateIndex, dragX, screenWidth]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { velocity: { x: number }; offset: { x: number } }) => {
      const dx = info.offset.x;
      const vx = info.velocity.x;
      const canGoNext = clockStateIndex < CLOCK_STATE_COUNT - 1;
      const canGoPrev = clockStateIndex > 0;

      if ((dx < -DRAG_THRESHOLD_PX || vx < -VELOCITY_THRESHOLD_PX_S) && canGoNext) {
        commitTransition(clockStateIndex + 1, 1);
      } else if ((dx > DRAG_THRESHOLD_PX || vx > VELOCITY_THRESHOLD_PX_S) && canGoPrev) {
        commitTransition(clockStateIndex - 1, -1);
      } else {
        animate(dragX, 0, SPRING_CONFIG);
      }
    },
    [clockStateIndex, commitTransition, dragX]
  );

  const ActiveState = CLOCK_STATES[clockStateIndex] ?? CLOCK_STATES[0];
  const ExitingState = transition ? CLOCK_STATES[transition.from] ?? CLOCK_STATES[0] : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        drag="x"
        dragMomentum={false}
        onPointerDown={(e) => e.stopPropagation()}
        onDragEnd={handleDragEnd}
        style={{ x: 0 }}
      >
        {ExitingState && (
          <motion.div className="absolute inset-0" style={{ x: outgoingX }}>
            <ExitingState />
          </motion.div>
        )}
        <motion.div
          className="absolute inset-0"
          style={{ x: transition ? incomingX : 0 }}
        >
          <ActiveState />
        </motion.div>
      </motion.div>

      <StateIndicatorDots count={CLOCK_STATE_COUNT} activeIndex={clockStateIndex} />
    </div>
  );
}
```

Note: the state component files don't exist yet — they'll be stub-created in Task 5 so the import resolves. For the test, all are mocked.

- [ ] **Step 4: Create stub state files so TypeScript resolves imports**

For each state, create a minimal stub (will be replaced in Tasks 6–13):

```bash
mkdir -p /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web/src/components/art-clock/states
```

Create each stub with a single exported component:

`apps/web/src/components/art-clock/states/wireframe-globe.tsx`:
```typescript
export function WireframeGlobe() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/constellation-map.tsx`:
```typescript
export function ConstellationMap() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/topographic-contours.tsx`:
```typescript
export function TopographicContours() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/pendulum.tsx`:
```typescript
export function Pendulum() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/waveform-pulse.tsx`:
```typescript
export function WaveformPulse() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/particle-drift.tsx`:
```typescript
export function ParticleDrift() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/black-hole.tsx`:
```typescript
export function BlackHole() {
  return <div className="absolute inset-0 bg-black" />;
}
```

`apps/web/src/components/art-clock/states/radar.tsx`:
```typescript
export function Radar() {
  return <div className="absolute inset-0 bg-black" />;
}
```

- [ ] **Step 5: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- clock-state-carousel
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/art-clock/clock-state-carousel.tsx apps/web/src/components/art-clock/states/ apps/web/src/__tests__/clock-state-carousel.test.tsx
git commit -m "feat: add ClockStateCarousel with stub state components"
git push
```

---

### Task 5: Wire ClockStateCarousel into HomePage

**Files:**
- Modify: `apps/web/src/routes/index.tsx`
- Test: `apps/web/src/__tests__/home-page.test.tsx` (update existing)

- [ ] **Step 1: Write the failing test**

Update `apps/web/src/__tests__/home-page.test.tsx` — mock `ClockStateCarousel` so the test remains deterministic. Replace `<ArtClock />` import assertion with a `ClockStateCarousel` presence check:

```typescript
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/art-clock/clock-state-carousel", () => ({
  ClockStateCarousel: () => <div data-testid="clock-state-carousel" />,
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  it("renders ClockStateCarousel in clock-layer", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByTestId("clock-state-carousel")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- home-page.test
```

Expected: FAIL — `clock-state-carousel` test id not found (still renders `ArtClock`).

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/routes/index.tsx`:

```typescript
import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { useNavigationStore } from "@/stores/navigation-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const view = useNavigationStore((s) => s.view);
  const setView = useNavigationStore((s) => s.setView);
  const isHub = view === "hub";

  return (
    <div className="relative h-full">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-open hub from clock */}
      <div
        data-testid="clock-layer"
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{
          opacity: isHub ? 0 : 1,
          pointerEvents: isHub ? "none" : "auto",
        }}
        onClick={() => setView("hub")}
      >
        <ClockStateCarousel />
      </div>

      <div
        data-testid="hub-layer"
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{
          opacity: isHub ? 1 : 0,
          pointerEvents: isHub ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update home-page-hub.test.tsx to work with new structure**

The existing hub tests assert on the clock layer and hub layer behavior. They mock `ArtClock` implicitly via `ClockStateCarousel`. Add a `vi.mock` at the top of `home-page-hub.test.tsx`:

```typescript
vi.mock("@/components/art-clock/clock-state-carousel", () => ({
  ClockStateCarousel: () => <div data-testid="clock-state-carousel" />,
}));
```

Also update `useNavigationStore.setState` calls to include `clockStateIndex: 0`.

- [ ] **Step 5: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test
```

Expected: PASS — all tests pass including pre-existing hub integration tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/index.tsx apps/web/src/__tests__/home-page.test.tsx apps/web/src/__tests__/home-page-hub.test.tsx
git commit -m "feat: wire ClockStateCarousel into HomePage"
git push
```

---

### Task 6: State 1 — WireframeGlobe (Three.js)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/wireframe-globe.tsx`
- Test: `apps/web/src/__tests__/states/wireframe-globe.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/wireframe-globe.test.tsx`:

```typescript
import { WireframeGlobe } from "@/components/art-clock/states/wireframe-globe";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock @react-three/fiber and @react-three/drei — no WebGL in jsdom
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <canvas data-testid="three-canvas">{children}</canvas>
  ),
  useFrame: vi.fn(),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Billboard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Line: () => null,
}));

describe("WireframeGlobe", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without throwing", () => {
    expect(() => render(<WireframeGlobe />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<WireframeGlobe />);
    expect(screen.getByTestId("three-canvas")).toBeInTheDocument();
  });

  it("renders time overlay div", () => {
    render(<WireframeGlobe />);
    expect(screen.getByTestId("globe-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- wireframe-globe
```

Expected: FAIL — stub renders a div, no canvas or time overlay.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/wireframe-globe.tsx`:

```typescript
import { formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const ROTATION_SPEED_PER_FRAME = (2 * Math.PI) / (60 * 60);
const GLOBE_RADIUS = 1.5;
const GRID_SEGMENTS = 32;

const CITIES = [
  { name: "LONDON",      lat: 51.5,  lng: -0.1,   tz: "Europe/London"        },
  { name: "SHANGHAI",    lat: 31.2,  lng: 121.5,  tz: "Asia/Shanghai"        },
  { name: "BARCELONA",   lat: 41.4,  lng: 2.2,    tz: "Europe/Madrid"        },
  { name: "NEW YORK",    lat: 40.7,  lng: -74.0,  tz: "America/New_York"     },
  { name: "LOS ANGELES", lat: 34.1,  lng: -118.2, tz: "America/Los_Angeles"  },
] as const;

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function cityTime(tz: string): string {
  try {
    const now = new Date();
    const { hours, minutes, period } = formatTime(
      new Date(now.toLocaleString("en-US", { timeZone: tz }))
    );
    return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch {
    return formatTime(new Date())
      .hours.concat(":00");
  }
}

function Globe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED_PER_FRAME;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, GRID_SEGMENTS, GRID_SEGMENTS]} />
        <meshBasicMaterial wireframe color="white" />
      </mesh>

      {CITIES.map((city) => {
        const pos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS);
        const labelPos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS + 0.35);
        return (
          <group key={city.name}>
            <mesh position={pos}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="white" />
            </mesh>
            <Billboard position={labelPos}>
              <Text
                fontSize={0.09}
                color="white"
                anchorX="center"
                anchorY="middle"
                font="/fonts/GeistVF.woff"
              >
                {`${city.name}  ${cityTime(city.tz)}`}
              </Text>
            </Billboard>
            <Line points={[pos.toArray(), labelPos.toArray()]} color="white" lineWidth={0.5} />
          </group>
        );
      })}
    </group>
  );
}

export function WireframeGlobe() {
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);

  return (
    <div className="absolute inset-0 bg-black">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 120 }}
        style={{ height: "66%", width: "100%" }}
      >
        <OrbitControls enabled={false} />
        <Globe />
      </Canvas>

      <div
        data-testid="globe-time-overlay"
        className="absolute bottom-16 left-0 right-0 flex items-baseline justify-center gap-1 text-white"
        style={{ fontWeight: 100 }}
      >
        <span className="text-8xl">{hours}</span>
        <span className="text-8xl">:</span>
        <span className="text-8xl">{minutes}</span>
        <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>
          {period}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- wireframe-globe
```

Expected: PASS — 3 smoke tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/wireframe-globe.tsx apps/web/src/__tests__/states/wireframe-globe.test.tsx
git commit -m "feat: implement WireframeGlobe state (Three.js)"
git push
```

---

### Task 7: State 2 — ConstellationMap (Canvas 2D)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/constellation-map.tsx`
- Test: `apps/web/src/__tests__/states/constellation-map.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/constellation-map.test.tsx`:

```typescript
import { ConstellationMap } from "@/components/art-clock/states/constellation-map";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ConstellationMap", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<ConstellationMap />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<ConstellationMap />);
    expect(screen.getByTestId("constellation-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<ConstellationMap />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<ConstellationMap />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<ConstellationMap />);
    expect(screen.getByTestId("constellation-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- constellation-map
```

Expected: FAIL — stub has no canvas, no time overlay, no rAF calls.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/constellation-map.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const ROTATION_SPEED_RAD_PER_MS = 0.00003;

interface Star {
  x: number;
  y: number;
}

interface Constellation {
  name: string;
  stars: Star[];
  lines: [number, number][];
}

const CONSTELLATIONS: Constellation[] = [
  {
    name: "ORION",
    stars: [
      { x: 0.35, y: 0.3 }, { x: 0.38, y: 0.35 }, { x: 0.41, y: 0.4 },
      { x: 0.32, y: 0.45 }, { x: 0.44, y: 0.45 }, { x: 0.36, y: 0.52 },
      { x: 0.40, y: 0.52 },
    ],
    lines: [[0,1],[1,2],[2,3],[2,4],[3,5],[4,6],[5,6]],
  },
  {
    name: "CASSIOPEIA",
    stars: [
      { x: 0.6, y: 0.12 }, { x: 0.65, y: 0.17 }, { x: 0.70, y: 0.13 },
      { x: 0.75, y: 0.18 }, { x: 0.80, y: 0.13 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    name: "URSA MAJOR",
    stars: [
      { x: 0.15, y: 0.22 }, { x: 0.19, y: 0.20 }, { x: 0.23, y: 0.19 },
      { x: 0.27, y: 0.21 }, { x: 0.28, y: 0.25 }, { x: 0.24, y: 0.27 },
      { x: 0.20, y: 0.28 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]],
  },
  {
    name: "URSA MINOR",
    stars: [
      { x: 0.5, y: 0.05 }, { x: 0.52, y: 0.08 }, { x: 0.54, y: 0.12 },
      { x: 0.53, y: 0.16 }, { x: 0.56, y: 0.18 }, { x: 0.59, y: 0.16 },
      { x: 0.57, y: 0.12 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]],
  },
  {
    name: "LYRA",
    stars: [
      { x: 0.72, y: 0.30 }, { x: 0.74, y: 0.35 }, { x: 0.76, y: 0.33 },
      { x: 0.78, y: 0.35 }, { x: 0.76, y: 0.38 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,1]],
  },
  {
    name: "CYGNUS",
    stars: [
      { x: 0.83, y: 0.25 }, { x: 0.88, y: 0.30 }, { x: 0.93, y: 0.35 },
      { x: 0.86, y: 0.28 }, { x: 0.90, y: 0.28 },
    ],
    lines: [[0,1],[1,2],[3,4]],
  },
  {
    name: "LEO",
    stars: [
      { x: 0.12, y: 0.55 }, { x: 0.16, y: 0.52 }, { x: 0.20, y: 0.50 },
      { x: 0.24, y: 0.52 }, { x: 0.22, y: 0.58 }, { x: 0.16, y: 0.60 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]],
  },
  {
    name: "SCORPIUS",
    stars: [
      { x: 0.65, y: 0.62 }, { x: 0.68, y: 0.65 }, { x: 0.70, y: 0.70 },
      { x: 0.67, y: 0.75 }, { x: 0.63, y: 0.78 }, { x: 0.60, y: 0.82 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5]],
  },
];

export function ConstellationMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const elapsed = Date.now() - startTimeRef.current;
      const angle = elapsed * ROTATION_SPEED_RAD_PER_MS;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.translate(-w / 2, -h / 2);

      for (const c of CONSTELLATIONS) {
        // draw lines
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 0.5;
        for (const [a, b] of c.lines) {
          const sa = c.stars[a];
          const sb = c.stars[b];
          ctx.beginPath();
          ctx.moveTo(sa.x * w, sa.y * h);
          ctx.lineTo(sb.x * w, sb.y * h);
          ctx.stroke();
        }

        // draw stars
        for (const star of c.stars) {
          ctx.beginPath();
          ctx.arc(star.x * w, star.y * h, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "white";
          ctx.fill();
        }

        // draw constellation name at centroid
        const cx = c.stars.reduce((s, st) => s + st.x, 0) / c.stars.length;
        const cy = c.stars.reduce((s, st) => s + st.y, 0) / c.stars.length;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "100 11px 'Geist', sans-serif";
        ctx.textAlign = "center";
        ctx.letterSpacing = "0.15em";
        ctx.fillText(c.name, cx * w, cy * h - 12);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="constellation-canvas" className="absolute inset-0" />
      <div
        data-testid="constellation-time-overlay"
        className="absolute bottom-16 left-0 right-0 flex flex-col items-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div className="mt-2 text-sm tracking-widest" style={{ fontWeight: 300 }}>{dateStr}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- constellation-map
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/constellation-map.tsx apps/web/src/__tests__/states/constellation-map.test.tsx
git commit -m "feat: implement ConstellationMap state (Canvas 2D)"
git push
```

---

### Task 8: State 3 — TopographicContours (Canvas 2D + simplex-noise)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/topographic-contours.tsx`
- Test: `apps/web/src/__tests__/states/topographic-contours.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/topographic-contours.test.tsx`:

```typescript
import { TopographicContours } from "@/components/art-clock/states/topographic-contours";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("simplex-noise", () => ({
  createNoise3D: () => () => 0,
}));

describe("TopographicContours", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<TopographicContours />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<TopographicContours />);
    expect(screen.getByTestId("contours-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<TopographicContours />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<TopographicContours />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<TopographicContours />);
    expect(screen.getByTestId("contours-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- topographic-contours
```

Expected: FAIL — stub has no canvas, no rAF, no time overlay.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/topographic-contours.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { createNoise3D } from "simplex-noise";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const NOISE_TIME_SPEED = 0.0002;
const GRID_CELL_SIZE = 80;
const CONTOUR_LEVELS = [-0.9, -0.75, -0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

// Marching squares edge table: for each of 16 cell configurations, list line segments as pairs of edge indices
// Edges: 0=top, 1=right, 2=bottom, 3=left
const MARCHING_EDGES: [number, number][][] = [
  [], [[0,3]], [[0,1]], [[1,3]], [[1,2]], [[0,3],[1,2]], [[0,2]], [[2,3]],
  [[2,3]], [[0,2]], [[0,1],[2,3]], [[1,2]], [[1,3]], [[0,1]], [[0,3]], [],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function TopographicContours() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise3D = createNoise3D();

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const t = elapsed * NOISE_TIME_SPEED;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / GRID_CELL_SIZE) + 1;
      const rows = Math.ceil(h / GRID_CELL_SIZE) + 1;

      // Sample noise grid
      const grid: number[][] = [];
      for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
          grid[row][col] = noise3D(col * 0.12, row * 0.12, t);
        }
      }

      for (const level of CONTOUR_LEVELS) {
        const opacity = 0.2 + 0.6 * Math.abs(level);
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 0.5;

        for (let row = 0; row < rows - 1; row++) {
          for (let col = 0; col < cols - 1; col++) {
            const tl = grid[row][col];
            const tr = grid[row][col + 1];
            const br = grid[row + 1][col + 1];
            const bl = grid[row + 1][col];

            const x0 = col * GRID_CELL_SIZE;
            const y0 = row * GRID_CELL_SIZE;
            const x1 = x0 + GRID_CELL_SIZE;
            const y1 = y0 + GRID_CELL_SIZE;

            const config =
              (tl > level ? 8 : 0) |
              (tr > level ? 4 : 0) |
              (br > level ? 2 : 0) |
              (bl > level ? 1 : 0);

            const edgePoints: [number, number][] = [
              [lerp(x0, x1, (level - tl) / (tr - tl || 1e-9)), y0], // top
              [x1, lerp(y0, y1, (level - tr) / (br - tr || 1e-9))], // right
              [lerp(x0, x1, (level - bl) / (br - bl || 1e-9)), y1], // bottom
              [x0, lerp(y0, y1, (level - tl) / (bl - tl || 1e-9))], // left
            ];

            for (const [ea, eb] of MARCHING_EDGES[config]) {
              ctx.beginPath();
              ctx.moveTo(edgePoints[ea][0], edgePoints[ea][1]);
              ctx.lineTo(edgePoints[eb][0], edgePoints[eb][1]);
              ctx.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="contours-canvas" className="absolute inset-0" />
      <div
        data-testid="contours-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div className="mt-2 text-sm tracking-widest" style={{ fontWeight: 300 }}>{dateStr}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- topographic-contours
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/topographic-contours.tsx apps/web/src/__tests__/states/topographic-contours.test.tsx
git commit -m "feat: implement TopographicContours state (Canvas 2D + simplex-noise)"
git push
```

---

### Task 9: State 4 — Pendulum (Canvas 2D)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/pendulum.tsx`
- Test: `apps/web/src/__tests__/states/pendulum.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/pendulum.test.tsx`:

```typescript
import { Pendulum } from "@/components/art-clock/states/pendulum";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Pendulum", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<Pendulum />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<Pendulum />);
    expect(screen.getByTestId("pendulum-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<Pendulum />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<Pendulum />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<Pendulum />);
    expect(screen.getByTestId("pendulum-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- pendulum.test
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/pendulum.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PERIOD_S = 4;
const BREATHE_PERIOD_S = 180;
const A_MIN = 0.15;
const A_MAX = 0.45;
const TRAIL_LENGTH = 7;
const TRAIL_OPACITIES = [0.08, 0.12, 0.18, 0.26, 0.36, 0.5, 1.0];

export function Pendulum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const amplitude =
        A_MIN + (A_MAX - A_MIN) * 0.5 * (1 + Math.sin((elapsed / BREATHE_PERIOD_S) * 2 * Math.PI));
      const angle = amplitude * Math.cos((elapsed / PERIOD_S) * 2 * Math.PI);

      const pivotX = w / 2;
      const length = h * 0.85;
      const bobX = pivotX + length * Math.sin(angle);
      const bobY = length * Math.cos(angle);

      // push to trail
      trailRef.current.push({ x: bobX, y: bobY });
      if (trailRef.current.length > TRAIL_LENGTH) {
        trailRef.current.shift();
      }

      // draw trail entries oldest to newest
      for (let i = 0; i < trailRef.current.length; i++) {
        const pos = trailRef.current[i];
        const opacity = TRAIL_OPACITIES[i + (TRAIL_LENGTH - trailRef.current.length)];
        ctx.beginPath();
        ctx.moveTo(pivotX, 0);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="pendulum-canvas" className="absolute inset-0" />
      <div
        data-testid="pendulum-time-overlay"
        className="absolute top-6 left-0 right-0 flex flex-col items-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-6xl">{hours}</span>
          <span className="text-6xl">:</span>
          <span className="text-6xl">{minutes}</span>
          <span className="ml-2 text-3xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div className="mt-1 text-sm tracking-widest" style={{ fontWeight: 300 }}>{dateStr}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- pendulum.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/pendulum.tsx apps/web/src/__tests__/states/pendulum.test.tsx
git commit -m "feat: implement Pendulum state (Canvas 2D)"
git push
```

---

### Task 10: State 5 — WaveformPulse (Canvas 2D)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/waveform-pulse.tsx`
- Test: `apps/web/src/__tests__/states/waveform-pulse.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/waveform-pulse.test.tsx`:

```typescript
import { WaveformPulse } from "@/components/art-clock/states/waveform-pulse";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("WaveformPulse", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<WaveformPulse />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<WaveformPulse />);
    expect(screen.getByTestId("waveform-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<WaveformPulse />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<WaveformPulse />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<WaveformPulse />);
    expect(screen.getByTestId("waveform-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- waveform-pulse
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/waveform-pulse.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const CALM_ACTIVE_PERIOD_S = 20;

export function WaveformPulse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Afterglow: fill with semi-transparent black instead of clear
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, w, h);

      const amplitude =
        0.04 * h * (0.5 + 0.5 * Math.sin((elapsed / CALM_ACTIVE_PERIOD_S) * 2 * Math.PI));

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;

      for (let x = 0; x <= w; x++) {
        const y =
          h / 2 +
          amplitude * Math.sin((x / w) * 2 * Math.PI * 2 + elapsed * 1.2) +
          amplitude * 0.5 * Math.sin((x / w) * 2 * Math.PI * 3.7 + elapsed * 2.1) +
          amplitude * 0.25 * Math.sin((x / w) * 2 * Math.PI * 6.3 + elapsed * 3.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="waveform-canvas" className="absolute inset-0" />
      <div
        data-testid="waveform-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1 mb-20" style={{ fontWeight: 100 }}>
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div className="text-sm tracking-widest" style={{ fontWeight: 300 }}>{dateStr}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- waveform-pulse
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/waveform-pulse.tsx apps/web/src/__tests__/states/waveform-pulse.test.tsx
git commit -m "feat: implement WaveformPulse state (Canvas 2D)"
git push
```

---

### Task 11: State 6 — ParticleDrift (Canvas 2D)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/particle-drift.tsx`
- Test: `apps/web/src/__tests__/states/particle-drift.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/particle-drift.test.tsx`:

```typescript
import { ParticleDrift } from "@/components/art-clock/states/particle-drift";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ParticleDrift", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<ParticleDrift />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<ParticleDrift />);
    expect(screen.getByTestId("particle-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<ParticleDrift />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<ParticleDrift />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<ParticleDrift />);
    expect(screen.getByTestId("particle-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- particle-drift
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/particle-drift.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PARTICLE_COUNT = 300;
const CONNECT_DISTANCE_PX = 120;
const SPEED_CYCLE_S = 30;
const CELL_SIZE = CONNECT_DISTANCE_PX;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function initParticles(w: number, h: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
  }));
}

export function ParticleDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      particlesRef.current = initParticles(window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const speedMul =
        0.3 + 0.9 * 0.5 * (1 + Math.sin((elapsed / SPEED_CYCLE_S) * 2 * Math.PI));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Update positions
      for (const p of particlesRef.current) {
        p.x += p.vx * speedMul;
        p.y += p.vy * speedMul;
        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;
      }

      // Spatial bucketing for connection check
      const cols = Math.ceil(w / CELL_SIZE);
      const rows = Math.ceil(h / CELL_SIZE);
      const cells: Map<string, Particle[]> = new Map();

      for (const p of particlesRef.current) {
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);
        const key = `${cx},${cy}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)!.push(p);
      }

      for (const p of particlesRef.current) {
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbors = cells.get(`${cx + dx},${cy + dy}`);
            if (!neighbors) continue;
            for (const q of neighbors) {
              if (q === p) continue;
              const dist = Math.hypot(p.x - q.x, p.y - q.y);
              if (dist < CONNECT_DISTANCE_PX) {
                const opacity = (1 - dist / CONNECT_DISTANCE_PX) * 0.3;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
              }
            }
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="particle-canvas" className="absolute inset-0" />
      <div
        data-testid="particle-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div className="mt-2 text-sm tracking-widest" style={{ fontWeight: 300 }}>{dateStr}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- particle-drift
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/particle-drift.tsx apps/web/src/__tests__/states/particle-drift.test.tsx
git commit -m "feat: implement ParticleDrift state (Canvas 2D)"
git push
```

---

### Task 12: State 7 — BlackHole (Canvas 2D)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/black-hole.tsx`
- Test: `apps/web/src/__tests__/states/black-hole.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/black-hole.test.tsx`:

```typescript
import { BlackHole } from "@/components/art-clock/states/black-hole";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("BlackHole", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<BlackHole />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<BlackHole />);
    expect(screen.getByTestId("blackhole-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<BlackHole />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<BlackHole />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<BlackHole />);
    expect(screen.getByTestId("blackhole-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- black-hole
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/black-hole.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const GRID_SPACING = 60;
const DISK_ROTATION_SPEED_RAD_PER_MS = 0.0005;
const STREAK_COUNT = 18;

interface Streak {
  phase: number;
  speed: number;
  rx: number;
  ry: number;
  trail: { x: number; y: number }[];
}

export function BlackHole() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const streaksRef = useRef<Streak[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const eventRadius = w * 0.08;

      streaksRef.current = Array.from({ length: STREAK_COUNT }, (_, i) => ({
        phase: (i / STREAK_COUNT) * 2 * Math.PI,
        speed: 0.0008 + Math.random() * 0.0004,
        rx: eventRadius * (2.5 + Math.random() * 1.5),
        ry: eventRadius * (0.8 + Math.random() * 0.4),
        trail: [],
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const diskAngle = elapsed * DISK_ROTATION_SPEED_RAD_PER_MS;
      const eventRadius = w * 0.08;
      const cx = w / 2;
      const cy = h / 2;
      const lensStrength = eventRadius * eventRadius * 3;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Background grid with gravitational lensing
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 0.5;

      const gridCountH = Math.ceil(h / GRID_SPACING) + 1;
      const gridCountW = Math.ceil(w / GRID_SPACING) + 1;

      for (let i = 0; i < gridCountH; i++) {
        const y = i * GRID_SPACING;
        ctx.beginPath();
        let started = false;
        for (let x = 0; x <= w; x += 3) {
          const dx = x - cx;
          const dy = y - cy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < eventRadius) {
            started = false;
            continue;
          }
          const warp = lensStrength / (distSq + lensStrength);
          const wx = x - dx * warp;
          const wy = y - dy * warp;
          if (!started) {
            ctx.moveTo(wx, wy);
            started = true;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      }

      for (let i = 0; i < gridCountW; i++) {
        const x = i * GRID_SPACING;
        ctx.beginPath();
        let started = false;
        for (let y = 0; y <= h; y += 3) {
          const dx = x - cx;
          const dy = y - cy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < eventRadius) {
            started = false;
            continue;
          }
          const warp = lensStrength / (distSq + lensStrength);
          const wx = x - dx * warp;
          const wy = y - dy * warp;
          if (!started) {
            ctx.moveTo(wx, wy);
            started = true;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      }

      // Accretion disk rings
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(diskAngle);
      for (let ring = 0; ring < 6; ring++) {
        const rx = eventRadius * (1.6 + ring * 0.4);
        const ry = rx * 0.28;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, -0.43, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255,255,255,${0.15 - ring * 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // Streak particles
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(diskAngle);
      for (const streak of streaksRef.current) {
        streak.phase += streak.speed;
        const sx = streak.rx * Math.cos(streak.phase);
        const sy = streak.ry * Math.sin(streak.phase);
        streak.trail.push({ x: sx, y: sy });
        if (streak.trail.length > 5) streak.trail.shift();

        for (let t = 0; t < streak.trail.length; t++) {
          const pt = streak.trail[t];
          const opacity = ((t + 1) / streak.trail.length) * 0.6;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${opacity})`;
          ctx.fill();
        }
      }
      ctx.restore();

      // Event horizon (solid black circle — masks everything behind it)
      ctx.beginPath();
      ctx.arc(cx, cy, eventRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "black";
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="blackhole-canvas" className="absolute inset-0" />
      <div
        data-testid="blackhole-time-overlay"
        className="absolute top-1/3 left-0 right-0 flex flex-col items-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div className="mt-2 text-sm tracking-widest" style={{ fontWeight: 300 }}>{dateStr}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- black-hole
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/black-hole.tsx apps/web/src/__tests__/states/black-hole.test.tsx
git commit -m "feat: implement BlackHole state (Canvas 2D)"
git push
```

---

### Task 13: State 8 — Radar (Canvas 2D)

**Files:**
- Modify: `apps/web/src/components/art-clock/states/radar.tsx`
- Test: `apps/web/src/__tests__/states/radar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/states/radar.test.tsx`:

```typescript
import { Radar } from "@/components/art-clock/states/radar";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Radar", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<Radar />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<Radar />);
    expect(screen.getByTestId("radar-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<Radar />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<Radar />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<Radar />);
    expect(screen.getByTestId("radar-time-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- radar.test
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/components/art-clock/states/radar.tsx`:

```typescript
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const SWEEP_SPEED_RAD_PER_MS = (2 * Math.PI) / 4000;
const BLIP_COUNT = 6;
const BLIP_DECAY_MS = 2000;

interface Blip {
  angle: number;
  radius: number;
  spawnedAt: number;
}

function randomBlip(maxRadius: number): Blip {
  return {
    angle: Math.random() * 2 * Math.PI,
    radius: maxRadius * (0.2 + Math.random() * 0.75),
    spawnedAt: -1,
  };
}

export function Radar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const blipsRef = useRef<Blip[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.42;
      blipsRef.current = Array.from({ length: BLIP_COUNT }, () => randomBlip(maxR));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const sweepAngle = (elapsed * SWEEP_SPEED_RAD_PER_MS - Math.PI / 2) % (2 * Math.PI);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.42;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Range rings
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (ring / 4) * maxR, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Cardinal labels
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "100 10px 'GeistMono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", cx, cy - maxR - 6);
      ctx.fillText("S", cx, cy + maxR + 14);
      ctx.textAlign = "left";
      ctx.fillText("E", cx + maxR + 6, cy + 4);
      ctx.textAlign = "right";
      ctx.fillText("W", cx - maxR - 6, cy + 4);

      // Afterglow arc (90 degrees behind sweep)
      const trailAngle = Math.PI / 2;
      const gradient = ctx.createConicalGradient
        ? null // not available in jsdom/canvas 2D spec
        : null;

      // Fallback: draw faded arc manually as multiple thin arcs
      for (let step = 0; step < 30; step++) {
        const fraction = step / 30;
        const arcStart = sweepAngle - trailAngle * fraction;
        const opacity = (1 - fraction) * 0.12;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 0.01, arcStart - 0.05, arcStart + 0.05);
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = maxR;
        ctx.stroke();
      }

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(sweepAngle), cy + maxR * Math.sin(sweepAngle));
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Blips
      for (const blip of blipsRef.current) {
        // Check if sweep just crossed this blip's angle
        const blipAngle = blip.angle - Math.PI / 2;
        const diff = ((sweepAngle - blipAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        if (diff < 0.06 && blip.spawnedAt < 0) {
          blip.spawnedAt = elapsed;
        }
        // Respawn after decay
        if (blip.spawnedAt > 0 && elapsed - blip.spawnedAt > BLIP_DECAY_MS) {
          const fresh = randomBlip(maxR);
          blip.angle = fresh.angle;
          blip.radius = fresh.radius;
          blip.spawnedAt = -1;
        }

        if (blip.spawnedAt > 0) {
          const age = elapsed - blip.spawnedAt;
          const opacity = Math.max(0, 1 - age / BLIP_DECAY_MS);
          const bx = cx + blip.radius * Math.cos(blip.angle - Math.PI / 2);
          const by = cy + blip.radius * Math.sin(blip.angle - Math.PI / 2);
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(255,255,255,${opacity})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="radar-canvas" className="absolute inset-0" />
      <div
        data-testid="radar-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex items-baseline gap-1"
          style={{ fontFamily: "'GeistMono', monospace", fontWeight: 100 }}
        >
          <span className="text-6xl">{hours}</span>
          <span className="text-6xl">:</span>
          <span className="text-6xl">{minutes}</span>
          <span className="ml-2 text-3xl" style={{ fontWeight: 200 }}>{period}</span>
        </div>
        <div
          className="mt-2 text-xs tracking-widest"
          style={{ fontFamily: "'GeistMono', monospace", fontWeight: 300 }}
        >
          {dateStr}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test -- radar.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/art-clock/states/radar.tsx apps/web/src/__tests__/states/radar.test.tsx
git commit -m "feat: implement Radar state (Canvas 2D, easter egg)"
git push
```

---

### Task 14: Full Test Suite Pass + Lint

**Files:** No new files. Verify everything compiles and all tests pass.

- [ ] **Step 1: Run full test suite**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run test
```

Expected: PASS — all tests pass, zero failures.

- [ ] **Step 2: Run lint**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run lint:fix
```

Expected: Exits 0, no unfixable errors.

- [ ] **Step 3: Run type check**

Run:
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run build 2>&1 | head -50
```

Expected: Exits 0, no TypeScript errors.

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes and type check cleanup"
git push
```

---

### Task 15: E2E Visual Verification

**Prerequisites:** Dev server running on port 4200, `agent-browser` in PATH.

- [ ] **Step 1: Start dev server**

Run (in background):
```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/apps/web && bun run dev &
```

Wait for: `Local: http://localhost:4200/` in output.

- [ ] **Step 2: Screenshot State 0 (Default Clock)**

Run:
```bash
mkdir -p /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/docs/screenshots
agent-browser screenshot http://localhost:4200 --output /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/auto-pilot+world-clock-globe/docs/screenshots/state-0-default-clock.png
```

Verify: Art clock visible, true black background, 9 dots at bottom, first dot full opacity.

- [ ] **Step 3: Navigate through all states via swipe and screenshot each**

For each state 1–8, simulate a left swipe via agent-browser mouse drag, then screenshot:

```bash
agent-browser open http://localhost:4200
# State 1: swipe left
agent-browser mouse move 1000 512
agent-browser mouse down
agent-browser mouse move 200 512
agent-browser mouse up
agent-browser screenshot --output docs/screenshots/state-1-wireframe-globe.png
# ...repeat for states 2–8
```

Commit screenshots after all states verified.

- [ ] **Step 4: Verify edge behavior — no wrap on State 0 right swipe**

```bash
# At State 0, swipe right
agent-browser mouse move 200 512
agent-browser mouse down
agent-browser mouse move 1000 512
agent-browser mouse up
agent-browser screenshot --output docs/screenshots/state-0-snap-back.png
```

Verify: Still on State 0, dot 1 still full opacity.

- [ ] **Step 5: Verify tap-to-hub from any state**

```bash
agent-browser mouse move 683 512
agent-browser mouse down
agent-browser mouse up
agent-browser screenshot --output docs/screenshots/hub-from-state-0.png
```

Verify: Hub overlay visible, state indicator dots hidden.

- [ ] **Step 6: Verify hub dismiss preserves state index**

Navigate to State 5, open hub, dismiss hub via swipe right, screenshot.

Verify: Returns to State 5 (WaveformPulse), not State 0.

- [ ] **Step 7: Commit screenshots**

```bash
git add docs/screenshots/
git commit -m "docs: add clock states E2E screenshots"
git push
```

---

## Self-Review

**Spec coverage:**
- State machine (0–8): Tasks 2, 4 (carousel), 6–13 (state components)
- framer-motion drag + spring: Task 4
- StateIndicatorDots: Task 3
- Navigation store extension: Task 2
- HomePage wiring: Task 5
- Dependencies: Task 1
- E2E: Task 15

**Placeholder scan:** None found. All steps have complete code.

**Type consistency:** All components export named functions matching import names in `clock-state-carousel.tsx`:
- `WireframeGlobe`, `ConstellationMap`, `TopographicContours`, `Pendulum`, `WaveformPulse`, `ParticleDrift`, `BlackHole`, `Radar`

**TDD compliance:** Every task (3–13) starts with a failing test step before implementation. Task 1 (deps) has no testable output until later tasks compile. Task 2 (store) starts with failing tests. Task 5 (wiring) updates existing tests first.
