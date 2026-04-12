# Timer App Implementation Plan

**Goal:** Add a single countdown timer accessible from the hub widget grid. Full-screen timer panel with SVG ring, presets, custom time input, and done flash. Pure frontend — no API changes.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest + Testing Library, Tailwind v4, TanStack Router.

---

## Overview

11 tasks. Sequential (each task is a complete TDD cycle: failing test → RED → implementation → GREEN → commit).

Tasks 1–3 build the pure state layer. Tasks 4–5 build visual-only components (no unit tests). Tasks 6–8 build the full panel + card (TDD). Tasks 9–10 wire into existing routing + grid. Task 11 runs E2E verification.

---

## Task 1: Navigation Store — Add `"timer"` to `View`

**Files:**
- Modify: `apps/web/src/stores/navigation-store.ts`
- Modify: `apps/web/src/__tests__/navigation-store.test.ts`

### Step 1: Write failing tests

Add two tests to `apps/web/src/__tests__/navigation-store.test.ts` (inside the existing `describe("navigation-store")` block, after the existing sonos tests):

```typescript
it("setView changes view to timer", () => {
  useNavigationStore.getState().setView("timer");
  expect(useNavigationStore.getState().view).toBe("timer");
});

it("setView changes view from timer back to hub", () => {
  useNavigationStore.getState().setView("timer");
  useNavigationStore.getState().setView("hub");
  expect(useNavigationStore.getState().view).toBe("hub");
});
```

### Step 2: Verify RED

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/timer-app
bun run --cwd apps/web test --run src/__tests__/navigation-store.test.ts
```

Expected: 2 new tests fail with TypeScript error `Argument of type '"timer"' is not assignable to parameter of type 'View'`.

### Step 3: Implement

In `apps/web/src/stores/navigation-store.ts`, change line 3:

```typescript
// Before:
type View = "clock" | "hub" | "sonos";

// After:
type View = "clock" | "hub" | "sonos" | "timer";
```

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/navigation-store.test.ts
```

Expected output: `5 passed`.

### Step 5: Commit

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/timer-app
git add apps/web/src/stores/navigation-store.ts apps/web/src/__tests__/navigation-store.test.ts
git commit -m "feat: add timer to navigation store View type"
git push
```

---

## Task 2: Timer Store

**Files:**
- Create: `apps/web/src/stores/timer-store.ts`
- Create: `apps/web/src/__tests__/timer-store.test.ts`

### Step 1: Write failing tests

Create `apps/web/src/__tests__/timer-store.test.ts`:

```typescript
import { useTimerStore } from "@/stores/timer-store";
import { afterEach, describe, expect, it } from "vitest";

describe("timer-store", () => {
  afterEach(() => {
    useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  });

  it("initializes with idle status, 0 duration_MS, 0 remaining_MS", () => {
    const state = useTimerStore.getState();
    expect(state.status).toBe("idle");
    expect(state.duration_MS).toBe(0);
    expect(state.remaining_MS).toBe(0);
  });

  it("start() sets status to running with correct duration_MS and remaining_MS", () => {
    useTimerStore.getState().start(300_000);
    const state = useTimerStore.getState();
    expect(state.status).toBe("running");
    expect(state.duration_MS).toBe(300_000);
    expect(state.remaining_MS).toBe(300_000);
  });

  it("pause() sets status from running to paused", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().status).toBe("paused");
  });

  it("resume() sets status from paused to running", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().pause();
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("reset() resets to initial state", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().reset();
    const state = useTimerStore.getState();
    expect(state.status).toBe("idle");
    expect(state.duration_MS).toBe(0);
    expect(state.remaining_MS).toBe(0);
  });

  it("tick() decrements remaining_MS", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().tick(500);
    expect(useTimerStore.getState().remaining_MS).toBe(59_500);
  });

  it("tick() sets status to done when remaining_MS reaches 0", () => {
    useTimerStore.getState().start(500);
    useTimerStore.getState().tick(500);
    expect(useTimerStore.getState().status).toBe("done");
    expect(useTimerStore.getState().remaining_MS).toBe(0);
  });

  it("tick() clamps remaining_MS to 0 (does not go negative)", () => {
    useTimerStore.getState().start(200);
    useTimerStore.getState().tick(500);
    expect(useTimerStore.getState().remaining_MS).toBe(0);
    expect(useTimerStore.getState().status).toBe("done");
  });

  it("tick() does nothing when status is paused", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().pause();
    useTimerStore.getState().tick(1_000);
    expect(useTimerStore.getState().remaining_MS).toBe(60_000);
  });

  it("tick() does nothing when status is idle", () => {
    useTimerStore.getState().tick(1_000);
    expect(useTimerStore.getState().remaining_MS).toBe(0);
  });

  it("tick() does nothing when status is done", () => {
    useTimerStore.getState().start(500);
    useTimerStore.getState().tick(500);
    useTimerStore.getState().tick(1_000);
    expect(useTimerStore.getState().remaining_MS).toBe(0);
    expect(useTimerStore.getState().status).toBe("done");
  });
});
```

### Step 2: Verify RED

```bash
bun run --cwd apps/web test --run src/__tests__/timer-store.test.ts
```

Expected: all tests fail with `Cannot find module '@/stores/timer-store'`.

### Step 3: Implement

Create `apps/web/src/stores/timer-store.ts`:

```typescript
import { create } from "zustand";

export type TimerStatus = "idle" | "running" | "paused" | "done";

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

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  status: "idle",
  duration_MS: 0,
  remaining_MS: 0,

  start: (duration_MS) => set({ status: "running", duration_MS, remaining_MS: duration_MS }),

  pause: () => {
    if (get().status === "running") set({ status: "paused" });
  },

  resume: () => {
    if (get().status === "paused") set({ status: "running" });
  },

  reset: () => set({ status: "idle", duration_MS: 0, remaining_MS: 0 }),

  tick: (elapsed_MS) => {
    const { status, remaining_MS } = get();
    if (status !== "running") return;
    const next = Math.max(0, remaining_MS - elapsed_MS);
    set({ remaining_MS: next, ...(next === 0 ? { status: "done" } : {}) });
  },
}));
```

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/timer-store.test.ts
```

Expected: `11 passed`.

### Step 5: Commit

```bash
git add apps/web/src/stores/timer-store.ts apps/web/src/__tests__/timer-store.test.ts
git commit -m "feat: add timer store"
git push
```

---

## Task 3: Timer Hook (`use-timer.ts`)

**Files:**
- Create: `apps/web/src/hooks/use-timer.ts`
- Create: `apps/web/src/__tests__/use-timer.test.ts`

### Step 1: Write failing tests

Create `apps/web/src/__tests__/use-timer.test.ts`:

```typescript
import { useTimerStore } from "@/stores/timer-store";
import { useTimer } from "@/hooks/use-timer";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("use-timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  });

  it("interval is started when status is running", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(10_000);
    });

    expect(useTimerStore.getState().status).toBe("running");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(useTimerStore.getState().remaining_MS).toBeLessThan(10_000);
  });

  it("interval is cleared when status changes to paused", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(10_000);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const afterOneTick = useTimerStore.getState().remaining_MS;

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(useTimerStore.getState().remaining_MS).toBe(afterOneTick);
  });

  it("interval is cleared when status changes to done", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(150);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(useTimerStore.getState().status).toBe("done");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(useTimerStore.getState().remaining_MS).toBe(0);
  });

  it("tick fires with elapsed time (uses Date.now() delta, not fixed 100ms)", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(10_000);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 3 ticks at ~100ms each
    expect(useTimerStore.getState().remaining_MS).toBeLessThanOrEqual(9_700);
    expect(useTimerStore.getState().remaining_MS).toBeGreaterThan(9_500);
  });
});
```

### Step 2: Verify RED

```bash
bun run --cwd apps/web test --run src/__tests__/use-timer.test.ts
```

Expected: all tests fail with `Cannot find module '@/hooks/use-timer'`.

### Step 3: Implement

Create `apps/web/src/hooks/use-timer.ts`:

```typescript
import { useTimerStore } from "@/stores/timer-store";
import { useEffect } from "react";

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

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/use-timer.test.ts
```

Expected: `4 passed`.

### Step 5: Commit

```bash
git add apps/web/src/hooks/use-timer.ts apps/web/src/__tests__/use-timer.test.ts
git commit -m "feat: add use-timer hook with setInterval drift correction"
git push
```

---

## Task 4: Timer Ring (visual component, no unit tests)

**Files:**
- Create: `apps/web/src/components/timer/timer-ring.tsx`

No unit tests for this component. Verified by E2E.

### Step 1: Implement

Create directory `apps/web/src/components/timer/` and file `apps/web/src/components/timer/timer-ring.tsx`:

```typescript
import type { TimerStatus } from "@/stores/timer-store";

interface TimerRingProps {
  remaining_MS: number;
  duration_MS: number;
  status: TimerStatus;
  className?: string;
}

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatRingCountdown(remaining_MS: number, status: TimerStatus): string {
  if (status === "idle") return "--:--";
  if (status === "done") return "0:00";
  const totalSeconds = Math.ceil(remaining_MS / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getRingColor(status: TimerStatus): string {
  if (status === "done") return "rgb(239 68 68)";
  if (status === "paused") return "rgba(255,255,255,0.4)";
  return "white";
}

export function TimerRing({ remaining_MS, duration_MS, status, className = "w-64 h-64" }: TimerRingProps) {
  const progress = duration_MS > 0 ? remaining_MS / duration_MS : 1;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const ringColor = getRingColor(status);
  const displayText = formatRingCountdown(remaining_MS, status);

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Background track */}
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90, 100, 100)"
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.2s ease" }}
        />
      </svg>
      {/* Countdown digits centered over ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-4xl font-[200] tabular-nums text-white"
          style={{ color: status === "done" ? "rgb(239 68 68)" : "white" }}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
}
```

### Step 2: Commit

```bash
git add apps/web/src/components/timer/timer-ring.tsx
git commit -m "feat: add TimerRing SVG component"
git push
```

---

## Task 5: Timer Flash (visual component, no unit tests)

**Files:**
- Create: `apps/web/src/components/timer/timer-flash.tsx`
- Modify: `apps/web/src/styles/globals.css` (add `@keyframes timer-flash`)

No unit tests. Verified by E2E.

### Step 1: Add keyframe to globals.css

In `apps/web/src/styles/globals.css`, add after the existing `@keyframes scaleIn` block:

```css
@keyframes timer-flash {
  0% {
    background-color: rgba(255, 255, 255, 0.8);
  }
  100% {
    background-color: rgba(220, 38, 38, 0.6);
  }
}
```

### Step 2: Implement

Create `apps/web/src/components/timer/timer-flash.tsx`:

```typescript
interface TimerFlashProps {
  active: boolean;
}

export function TimerFlash({ active }: TimerFlashProps) {
  if (!active) return null;

  return (
    <div
      className="absolute inset-0 animate-[timer-flash_0.5s_ease-in-out_infinite_alternate]"
      style={{ pointerEvents: "none" }}
    />
  );
}
```

### Step 3: Commit

```bash
git add apps/web/src/components/timer/timer-flash.tsx apps/web/src/styles/globals.css
git commit -m "feat: add TimerFlash overlay component and keyframe animation"
git push
```

---

## Task 6: Timer Controls

**Files:**
- Create: `apps/web/src/components/timer/timer-controls.tsx`

Tests for TimerControls are written as part of Task 7 (timer-panel.test.tsx covers controls via integration). No separate unit test file needed — the panel test covers all control states.

### Step 1: Implement

Create `apps/web/src/components/timer/timer-controls.tsx`:

```typescript
import type { TimerStatus } from "@/stores/timer-store";

interface TimerControlsProps {
  status: TimerStatus;
  remaining_MS: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  startDisabled: boolean;
}

export function TimerControls({
  status,
  onStart,
  onPause,
  onResume,
  onReset,
  startDisabled,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      {status === "idle" && (
        <button
          type="button"
          aria-label="Start timer"
          disabled={startDisabled}
          onClick={onStart}
          className="px-8 py-3 rounded-full bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          Start
        </button>
      )}

      {status === "running" && (
        <>
          <button
            type="button"
            aria-label="Pause timer"
            onClick={onPause}
            className="px-8 py-3 rounded-full bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            Pause
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            onClick={onReset}
            className="px-6 py-3 rounded-full text-white/40 text-sm active:scale-95 transition-transform"
          >
            Reset
          </button>
        </>
      )}

      {status === "paused" && (
        <>
          <button
            type="button"
            aria-label="Resume timer"
            onClick={onResume}
            className="px-8 py-3 rounded-full bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            Resume
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            onClick={onReset}
            className="px-6 py-3 rounded-full text-white/40 text-sm active:scale-95 transition-transform"
          >
            Reset
          </button>
        </>
      )}

      {status === "done" && (
        <button
          type="button"
          aria-label="Reset timer"
          onClick={onReset}
          className="px-8 py-3 rounded-full bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          Reset
        </button>
      )}
    </div>
  );
}
```

### Step 2: Commit

```bash
git add apps/web/src/components/timer/timer-controls.tsx
git commit -m "feat: add TimerControls component"
git push
```

---

## Task 7: Timer Panel

**Files:**
- Create: `apps/web/src/components/timer/timer-panel.tsx`
- Create: `apps/web/src/__tests__/timer-panel.test.tsx`

### Step 1: Write failing tests

Create `apps/web/src/__tests__/timer-panel.test.tsx`:

```typescript
import { TimerPanel } from "@/components/timer/timer-panel";
import { useNavigationStore } from "@/stores/navigation-store";
import { useTimerStore } from "@/stores/timer-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setViewFn = vi.fn();

vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn(
    (selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
      selector({ view: "timer", setView: setViewFn }),
  ),
}));

vi.mock("@/hooks/use-swipe", () => ({
  useSwipe: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

afterEach(() => {
  cleanup();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

describe("TimerPanel", () => {
  it("renders back button", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("back button calls setView('hub')", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(setViewFn).toHaveBeenCalledWith("hub");
  });

  it("renders preset buttons 1m, 5m, 10m, 15m", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: "1m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15m" })).toBeInTheDocument();
  });

  it("clicking 1m preset starts timer with 60000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "1m" }));
    expect(useTimerStore.getState().duration_MS).toBe(60_000);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("clicking 5m preset starts timer with 300000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "5m" }));
    expect(useTimerStore.getState().duration_MS).toBe(300_000);
  });

  it("clicking 10m preset starts timer with 600000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "10m" }));
    expect(useTimerStore.getState().duration_MS).toBe(600_000);
  });

  it("clicking 15m preset starts timer with 900000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "15m" }));
    expect(useTimerStore.getState().duration_MS).toBe(900_000);
  });

  it("start button is disabled when minutes and seconds are both 0", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /start timer/i })).toBeDisabled();
  });

  it("start button is enabled after entering non-zero seconds", () => {
    render(<TimerPanel />);
    const [, secondsInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(secondsInput, { target: { value: "30" } });
    expect(screen.getByRole("button", { name: /start timer/i })).not.toBeDisabled();
  });

  it("start button starts timer with custom time (1m30s = 90000ms)", () => {
    render(<TimerPanel />);
    const [minutesInput, secondsInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(minutesInput, { target: { value: "1" } });
    fireEvent.change(secondsInput, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));
    expect(useTimerStore.getState().duration_MS).toBe(90_000);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("pause button shown when running, calls pause", () => {
    useTimerStore.setState({ status: "running", duration_MS: 60_000, remaining_MS: 60_000 });
    render(<TimerPanel />);
    const pauseBtn = screen.getByRole("button", { name: /pause timer/i });
    expect(pauseBtn).toBeInTheDocument();
    fireEvent.click(pauseBtn);
    expect(useTimerStore.getState().status).toBe("paused");
  });

  it("resume button shown when paused, calls resume", () => {
    useTimerStore.setState({ status: "paused", duration_MS: 60_000, remaining_MS: 30_000 });
    render(<TimerPanel />);
    const resumeBtn = screen.getByRole("button", { name: /resume timer/i });
    expect(resumeBtn).toBeInTheDocument();
    fireEvent.click(resumeBtn);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("reset button shown when running, calls reset", () => {
    useTimerStore.setState({ status: "running", duration_MS: 60_000, remaining_MS: 60_000 });
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: /reset timer/i }));
    expect(useTimerStore.getState().status).toBe("idle");
  });

  it("flash overlay shown when status is done", () => {
    useTimerStore.setState({ status: "done", duration_MS: 5_000, remaining_MS: 0 });
    render(<TimerPanel />);
    expect(document.querySelector(".animate-\\[timer-flash")).toBeTruthy();
  });

  it("flash overlay not shown when status is running", () => {
    useTimerStore.setState({ status: "running", duration_MS: 60_000, remaining_MS: 60_000 });
    render(<TimerPanel />);
    expect(document.querySelector(".animate-\\[timer-flash")).toBeFalsy();
  });
});
```

### Step 2: Verify RED

```bash
bun run --cwd apps/web test --run src/__tests__/timer-panel.test.tsx
```

Expected: all tests fail with `Cannot find module '@/components/timer/timer-panel'`.

### Step 3: Implement

Create `apps/web/src/components/timer/timer-panel.tsx`:

```typescript
import { TimerControls } from "@/components/timer/timer-controls";
import { TimerFlash } from "@/components/timer/timer-flash";
import { TimerRing } from "@/components/timer/timer-ring";
import { useTimer } from "@/hooks/use-timer";
import { useSwipe } from "@/hooks/use-swipe";
import { useNavigationStore } from "@/stores/navigation-store";
import { ChevronLeft } from "lucide-react";
import { useRef, useState } from "react";

const PRESETS = [
  { label: "1m", minutes: 1 },
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
  { label: "15m", minutes: 15 },
];

export function TimerPanel() {
  const setView = useNavigationStore((s) => s.setView);
  const { status, remaining_MS, duration_MS, start, pause, resume, reset } = useTimer();
  const panelRef = useRef<HTMLDivElement>(null);

  const [localMinutes, setLocalMinutes] = useState(0);
  const [localSeconds, setLocalSeconds] = useState(0);

  useSwipe(panelRef, { onSwipeLeft: () => setView("hub") });

  const showCustomInput = status === "idle" || status === "done";
  const startDisabled = localMinutes === 0 && localSeconds === 0;

  function handleStart() {
    start((localMinutes * 60 + localSeconds) * 1_000);
  }

  function handlePreset(minutes: number) {
    start(minutes * 60_000);
  }

  return (
    <div
      ref={panelRef}
      className="relative h-full bg-background flex flex-col px-8 pt-6 pb-8"
    >
      <TimerFlash active={status === "done"} />

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
        <span className="text-sm text-muted-foreground">Timer</span>
        <div className="w-6" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <TimerRing
          remaining_MS={remaining_MS}
          duration_MS={duration_MS}
          status={status}
          className="w-72 h-72"
        />

        {/* Presets */}
        <div className="flex gap-3">
          {PRESETS.map(({ label, minutes }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => handlePreset(minutes)}
              className="px-5 py-2 rounded-full bg-white/10 text-white text-sm active:scale-95 transition-transform"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom time input */}
        {showCustomInput && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={localMinutes}
              onChange={(e) => setLocalMinutes(Math.min(99, Math.max(0, Number(e.target.value))))}
              className="w-16 bg-transparent text-white text-3xl font-[200] text-center tabular-nums border-b border-white/20 focus:outline-none focus:border-white/60"
            />
            <span className="text-white/60 text-3xl font-[200]">:</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={localSeconds}
              onChange={(e) => setLocalSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
              className="w-16 bg-transparent text-white text-3xl font-[200] text-center tabular-nums border-b border-white/20 focus:outline-none focus:border-white/60"
            />
          </div>
        )}

        <TimerControls
          status={status}
          remaining_MS={remaining_MS}
          onStart={handleStart}
          onPause={pause}
          onResume={resume}
          onReset={reset}
          startDisabled={startDisabled}
        />
      </div>
    </div>
  );
}
```

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/timer-panel.test.tsx
```

Expected: `16 passed`.

### Step 5: Commit

```bash
git add apps/web/src/components/timer/timer-panel.tsx apps/web/src/__tests__/timer-panel.test.tsx
git commit -m "feat: add TimerPanel component (TDD)"
git push
```

---

## Task 8: Timer Card

**Files:**
- Create: `apps/web/src/components/hub/timer-card.tsx`
- Create: `apps/web/src/__tests__/timer-card.test.tsx`

### Step 1: Write failing tests

Create `apps/web/src/__tests__/timer-card.test.tsx`:

```typescript
import { TimerCard } from "@/components/hub/timer-card";
import { useNavigationStore } from "@/stores/navigation-store";
import { useTimerStore } from "@/stores/timer-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setViewFn = vi.fn();

vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn(
    (selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
      selector({ view: "hub", setView: setViewFn }),
  ),
}));

vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

afterEach(() => {
  cleanup();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

describe("TimerCard", () => {
  it('renders "No timer" when status is idle', () => {
    render(<TimerCard />);
    expect(screen.getByText("No timer")).toBeInTheDocument();
  });

  it("renders formatted countdown when status is running", () => {
    useTimerStore.setState({ status: "running", duration_MS: 65_000, remaining_MS: 65_000 });
    render(<TimerCard />);
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  it('renders "Done!" when status is done', () => {
    useTimerStore.setState({ status: "done", duration_MS: 5_000, remaining_MS: 0 });
    render(<TimerCard />);
    expect(screen.getByText("Done!")).toBeInTheDocument();
  });

  it('clicking card calls setView("timer")', () => {
    render(<TimerCard />);
    fireEvent.click(screen.getByTestId("widget-card-timer"));
    expect(setViewFn).toHaveBeenCalledWith("timer");
  });

  it('has data-testid="widget-card-timer"', () => {
    render(<TimerCard />);
    expect(screen.getByTestId("widget-card-timer")).toBeInTheDocument();
  });
});

describe("formatCountdown", () => {
  it("formats 5000ms as '0:05'", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(5_000)).toBe("0:05");
  });

  it("formats 65000ms as '1:05'", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(65_000)).toBe("1:05");
  });

  it("formats 600000ms as '10:00'", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(600_000)).toBe("10:00");
  });

  it("formats 1ms as '0:01' (ceil avoids showing 0:00 while running)", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(1)).toBe("0:01");
  });
});
```

### Step 2: Verify RED

```bash
bun run --cwd apps/web test --run src/__tests__/timer-card.test.tsx
```

Expected: all tests fail with `Cannot find module '@/components/hub/timer-card'`.

### Step 3: Implement

Create `apps/web/src/components/hub/timer-card.tsx`:

```typescript
import { BentoCard } from "@/components/hub/bento-card";
import { useNavigationStore } from "@/stores/navigation-store";
import { useTimerStore } from "@/stores/timer-store";

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerCard() {
  const status = useTimerStore((s) => s.status);
  const remaining_MS = useTimerStore((s) => s.remaining_MS);
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

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/timer-card.test.tsx
```

Expected: `9 passed`.

### Step 5: Commit

```bash
git add apps/web/src/components/hub/timer-card.tsx apps/web/src/__tests__/timer-card.test.tsx
git commit -m "feat: add TimerCard hub widget (TDD)"
git push
```

---

## Task 9: Wire TimerCard into Widget Grid

**Files:**
- Modify: `apps/web/src/components/hub/widget-grid.tsx`
- Modify: `apps/web/src/__tests__/widget-grid.test.tsx`

### Step 1: Update widget-grid test

In `apps/web/src/__tests__/widget-grid.test.tsx`, inside `describe("WidgetGrid")`:

1. Replace the test `"renders all 7 widget cards"`:

```typescript
it("renders all 7 widget cards (timer replaces theme)", () => {
  render(<WidgetGrid />);

  expect(screen.getByTestId("widget-card-weather")).toBeInTheDocument();
  expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
  expect(screen.getByTestId("widget-card-wifi")).toBeInTheDocument();
  expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
  expect(screen.getByTestId("widget-card-calendar")).toBeInTheDocument();
  expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
  expect(screen.getByTestId("widget-card-timer")).toBeInTheDocument();
});
```

2. Remove (or update) the line `expect(screen.getByTestId("widget-card-theme")).toBeInTheDocument();` — theme card is no longer in the grid.

### Step 2: Verify RED

```bash
bun run --cwd apps/web test --run src/__tests__/widget-grid.test.tsx
```

Expected: `widget-card-timer` not found (still renders `widget-card-theme`), `widget-card-theme` test removed so that one passes but timer test fails.

### Step 3: Implement

In `apps/web/src/components/hub/widget-grid.tsx`:

1. Add import (replace `ThemeToggleCard` import with `TimerCard`):
```typescript
// Remove:
import { ThemeToggleCard } from "@/components/hub/theme-toggle-card";
// Add:
import { TimerCard } from "@/components/hub/timer-card";
```

2. Update `gridTemplateAreas` from:
```
"calendar music  theme"
```
To:
```
"calendar music  timer"
```

3. Replace `<ThemeToggleCard />` with `<TimerCard />` in JSX.

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/widget-grid.test.tsx
```

Expected: `5 passed` (all existing tests pass, timer card found, theme card assertion removed).

### Step 5: Commit

```bash
git add apps/web/src/components/hub/widget-grid.tsx apps/web/src/__tests__/widget-grid.test.tsx
git commit -m "feat: replace ThemeToggleCard with TimerCard in widget grid"
git push
```

---

## Task 10: Add Timer Layer to Route Index

**Files:**
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/__tests__/route-index.test.tsx`

### Step 1: Update route-index test

In `apps/web/src/__tests__/route-index.test.tsx`:

1. Update the `View` type union at line 16:
```typescript
type View = "clock" | "hub" | "sonos" | "timer";
```

2. Add mock for `TimerPanel` inside the existing `vi.mock` block at top:
```typescript
vi.mock("@/components/timer/timer-panel", () => ({
  TimerPanel: () => <div data-testid="timer-panel" />,
}));
```

3. Add a new `describe` block after the existing `"route index — sonos layer"` block:

```typescript
describe("route index — timer layer", () => {
  it("timer layer is in DOM", async () => {
    setupStore("clock");
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    const { container } = render(<HomePage />);
    expect(container.querySelector("[data-testid='timer-layer']")).toBeInTheDocument();
  });

  it("timer layer has opacity 1 and pointer-events auto when view is timer", async () => {
    setupStore("timer");
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    const { container } = render(<HomePage />);
    const layer = container.querySelector("[data-testid='timer-layer']") as HTMLElement;
    expect(layer.style.opacity).toBe("1");
    expect(layer.style.pointerEvents).toBe("auto");
  });

  it("timer layer has opacity 0 and pointer-events none when view is hub", async () => {
    setupStore("hub");
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    const { container } = render(<HomePage />);
    const layer = container.querySelector("[data-testid='timer-layer']") as HTMLElement;
    expect(layer.style.opacity).toBe("0");
    expect(layer.style.pointerEvents).toBe("none");
  });
});
```

Note: The `route-index.test.tsx` uses module-level `vi.mock` + dynamic `import("@/routes/index")`. Because of module caching across tests in the same file, Vitest may return a cached module. If tests in the new describe block see stale state, add `vi.resetModules()` in a `beforeEach` inside the new describe (matching the pattern that the existing sonos describe does NOT reset modules — check if sonos tests pass correctly, if so no reset needed).

### Step 2: Verify RED

```bash
bun run --cwd apps/web test --run src/__tests__/route-index.test.tsx
```

Expected: 3 new timer layer tests fail — `timer-layer` testid not found.

### Step 3: Implement

In `apps/web/src/routes/index.tsx`:

1. Add import:
```typescript
import { TimerPanel } from "@/components/timer/timer-panel";
```

2. Add `isTimer` constant after `isSonos`:
```typescript
const isTimer = view === "timer";
```

3. Update clock layer opacity to also hide when `isTimer`:
```typescript
opacity: isHub || isSonos || isTimer ? 0 : 1,
pointerEvents: isHub || isSonos || isTimer ? "none" : "auto",
```

4. Add timer layer div after the sonos layer div:
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

### Step 4: Verify GREEN

```bash
bun run --cwd apps/web test --run src/__tests__/route-index.test.tsx
```

Expected: all existing sonos tests + 3 new timer tests pass.

### Step 5: Run full test suite

```bash
bun run --cwd apps/web test --run
```

Expected: all tests pass. If any pre-existing test fails, investigate before proceeding.

### Step 6: Commit

```bash
git add apps/web/src/routes/index.tsx apps/web/src/__tests__/route-index.test.tsx
git commit -m "feat: add timer layer to route index"
git push
```

---

## Task 11: E2E Browser Verification

**Prerequisites:** Dev server running.

```bash
cd /Users/calum/code/github.com/0x63616c/the-workflow-engine/.claude/worktrees/timer-app/apps/web
bun run dev
```

Server starts on `http://localhost:4200`.

### Verification Steps (agent-browser)

Run using `agent-browser`. Screenshot each step to `docs/screenshots/timer-YYYY-MM-DD--<step>.png` (replace date with actual date).

1. Navigate to `http://localhost:4200` — verify clock view renders
2. Click clock face — verify hub opens
3. Verify `widget-card-timer` present, shows "No timer"
4. Click timer card — verify timer panel opens with `--:--` in ring
5. Verify Start button is disabled (both inputs at 0)
6. Change seconds input to `5` — verify Start button becomes enabled
7. Click Start — verify ring shows `0:05`, countdown begins
8. Wait for countdown — verify ring decrements to `0:04`, `0:03`
9. Click Pause — verify ring dims (lower opacity stroke)
10. Click Resume — verify countdown resumes
11. Click Reset — verify ring back to `--:--`, Start disabled again
12. Click `5m` preset — verify ring shows `5:00`, running
13. Click Reset
14. Change minutes to `0`, seconds to `3`, click Start — wait 4 seconds
15. Verify `Done!` shows on ring, flash overlay pulses white/red
16. Click Back button — verify hub shows, timer card shows `Done!`
17. Click timer card again — verify panel opens, flash still active
18. Click Reset — verify flash stops, ring shows `--:--`
19. Swipe left on panel — verify returns to hub

---

## Self-Review

### Spec Coverage Check

| Spec Item | Task Covered |
|-----------|-------------|
| Navigation store `"timer"` view | Task 1 |
| Timer store (all actions + tick logic) | Task 2 |
| Hook with `setInterval` + drift correction | Task 3 |
| SVG ring + countdown digits | Task 4 |
| Flash animation keyframe + overlay | Task 5 |
| Controls (all 4 status states) | Task 6 |
| Timer panel (layout, presets, custom input, swipe) | Task 7 |
| Timer card (`formatCountdown`, states, click) | Task 8 |
| Widget grid swap (theme → timer, CSS grid area) | Task 9 |
| Route index timer layer + clock layer update | Task 10 |
| E2E 19-step verification | Task 11 |

### Placeholder Scan

None. All code is complete.

### Type Consistency

- `TimerStatus` exported from `timer-store.ts`, imported in `timer-ring.tsx`, `timer-controls.tsx`, `timer-panel.tsx`.
- `formatCountdown` exported from `timer-card.tsx` (re-used by ring via its own internal `formatRingCountdown` — ring formats slightly differently: uses `Math.ceil` and shows `--:--` / `0:00` for idle/done). Both functions use `Math.ceil`.
- `View` type updated in `navigation-store.ts`. `route-index.test.tsx` mirrors it.

### TDD Compliance

- Tasks 1, 2, 3, 7, 8, 9, 10: failing test written before implementation.
- Tasks 4, 5, 6: visual-only components or sub-components tested via integration (panel test covers controls). E2E covers ring and flash.

### Spec Deviations (intentional)

- `timer-ring.tsx` has its own internal `formatRingCountdown` rather than importing `formatCountdown` from `timer-card.tsx` — avoids circular import. Ring display logic is slightly different (shows `--:--` for idle, `0:00` for done). Both use `Math.ceil`.
- `TimerControls` `remaining_MS` prop included in interface for potential future use (not used in current render logic — controls only key off `status`). Could be removed if YAGNI is strictly applied; included because spec lists it.
