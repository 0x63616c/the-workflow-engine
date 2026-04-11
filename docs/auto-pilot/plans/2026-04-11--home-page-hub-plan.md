# Home Page Hub Implementation Plan

**Goal:** Build a widget grid hub accessible by tapping the art clock, with three return-to-clock mechanisms (swipe right, tap empty space, auto-timeout after 45s).
**Architecture:** Zustand store holds `view: "clock" | "hub"` state. Both views are always mounted on the `/` route with CSS opacity crossfade transitions. WidgetGrid contains 6 placeholder widget cards in a 2-column CSS grid.
**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, lucide-react, Vitest + Testing Library

---

### Task 1: Navigation Store

**Files:**
- Create: `apps/web/src/stores/navigation-store.ts`
- Test: `apps/web/src/__tests__/navigation-store.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/__tests__/navigation-store.test.ts
import { useNavigationStore } from "@/stores/navigation-store";
import { afterEach, describe, expect, it } from "vitest";

describe("navigation-store", () => {
  afterEach(() => {
    useNavigationStore.setState({ view: "clock" });
  });

  it("initializes with clock view", () => {
    const state = useNavigationStore.getState();
    expect(state.view).toBe("clock");
  });

  it("setView changes view to hub", () => {
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().view).toBe("hub");
  });

  it("setView changes view back to clock", () => {
    useNavigationStore.getState().setView("hub");
    useNavigationStore.getState().setView("clock");
    expect(useNavigationStore.getState().view).toBe("clock");
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**
Run: `cd apps/web && bun run test -- navigation-store`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation**

```ts
// apps/web/src/stores/navigation-store.ts
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

- [ ] **Step 4: Run test to verify PASSES**
Run: `cd apps/web && bun run test -- navigation-store`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**
```bash
cd apps/web && git add src/stores/navigation-store.ts src/__tests__/navigation-store.test.ts && git commit -m "feat: add navigation store for clock/hub view state" && git push
```

---

### Task 2: useIdleTimeout Hook

**Files:**
- Create: `apps/web/src/hooks/use-idle-timeout.ts`
- Test: `apps/web/src/__tests__/use-idle-timeout.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/__tests__/use-idle-timeout.test.ts
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls callback after timeout", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000));

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not call callback before timeout", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000));

    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
  });

  it("resets timer on touchstart", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000));

    vi.advanceTimersByTime(500);
    document.dispatchEvent(new Event("touchstart"));
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000, { enabled: false }));

    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(callback, 1000));

    unmount();
    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**
Run: `cd apps/web && bun run test -- use-idle-timeout`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation**

```ts
// apps/web/src/hooks/use-idle-timeout.ts
import { useCallback, useEffect, useRef } from "react";

interface IdleTimeoutOptions {
  enabled?: boolean;
}

export function useIdleTimeout(
  callback: () => void,
  timeout_MS: number,
  options: IdleTimeoutOptions = {},
): void {
  const { enabled = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, timeout_MS);
  }, [timeout_MS]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handleTouch = () => {
      resetTimer();
    };

    document.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      document.removeEventListener("touchstart", handleTouch);
    };
  }, [enabled, resetTimer]);
}
```

- [ ] **Step 4: Run test to verify PASSES**
Run: `cd apps/web && bun run test -- use-idle-timeout`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**
```bash
cd apps/web && git add src/hooks/use-idle-timeout.ts src/__tests__/use-idle-timeout.test.ts && git commit -m "feat: add useIdleTimeout hook" && git push
```

---

### Task 3: WidgetCard Component

**Files:**
- Create: `apps/web/src/components/hub/widget-card.tsx`
- Test: `apps/web/src/__tests__/widget-card.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/web/src/__tests__/widget-card.test.tsx
import { WidgetCard } from "@/components/hub/widget-card";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Clock } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("WidgetCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title and value", () => {
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" />);

    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" onClick={onClick} />);

    fireEvent.click(screen.getByTestId("widget-card-test"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stops propagation on click", () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <WidgetCard id="test" icon={Clock} title="Test" value="123" />
      </div>,
    );

    fireEvent.click(screen.getByTestId("widget-card-test"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("has cursor-pointer when onClick is provided", () => {
    const onClick = vi.fn();
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" onClick={onClick} />);

    expect(screen.getByTestId("widget-card-test").className).toContain("cursor-pointer");
  });

  it("does not have cursor-pointer without onClick", () => {
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" />);

    expect(screen.getByTestId("widget-card-test").className).not.toContain("cursor-pointer");
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**
Run: `cd apps/web && bun run test -- widget-card`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation**

```tsx
// apps/web/src/components/hub/widget-card.tsx
import type { LucideIcon } from "lucide-react";

interface WidgetCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  value: string;
  onClick?: () => void;
}

export function WidgetCard({ id, icon: Icon, title, value, onClick }: WidgetCardProps) {
  return (
    <div
      data-testid={`widget-card-${id}`}
      className={`rounded-xl border border-border bg-card p-6 ${onClick ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex items-center">
        <Icon size={20} className="text-muted-foreground" />
        <span className="ml-2 text-sm font-[300] text-muted-foreground">{title}</span>
      </div>
      <div className="mt-3 text-2xl font-[200] text-foreground">{value}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**
Run: `cd apps/web && bun run test -- widget-card`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**
```bash
cd apps/web && git add src/components/hub/widget-card.tsx src/__tests__/widget-card.test.tsx && git commit -m "feat: add WidgetCard component" && git push
```

---

### Task 4: WidgetGrid Component

**Files:**
- Create: `apps/web/src/components/hub/widget-grid.tsx`
- Test: `apps/web/src/__tests__/widget-grid.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/web/src/__tests__/widget-grid.test.tsx
import { WidgetGrid } from "@/components/hub/widget-grid";
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("WidgetGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useNavigationStore.setState({ view: "hub" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useNavigationStore.setState({ view: "clock" });
  });

  it("renders all 6 widget cards", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-weather")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-notifications")).toBeInTheDocument();
  });

  it("renders placeholder values", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("72\u00b0F")).toBeInTheDocument();
    expect(screen.getByText("3 on")).toBeInTheDocument();
    expect(screen.getByText("Not playing")).toBeInTheDocument();
    expect(screen.getByText("No events")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("renders clock widget with current time", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("2:23 PM")).toBeInTheDocument();
  });

  it("has hub-container and widget-grid test IDs", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("hub-container")).toBeInTheDocument();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**
Run: `cd apps/web && bun run test -- widget-grid`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation**

Note: `CLOCK_UPDATE_INTERVAL_MS` is not exported from `art-clock.tsx`. It is a local `const`. The spec says to import `useCurrentTime` and `formatTime` from the art-clock module. `useCurrentTime` comes from `@/hooks/use-current-time` and `formatTime` is exported from `@/components/art-clock/art-clock`. Define a local `CLOCK_UPDATE_INTERVAL_MS` in the widget-grid since the art-clock's is not exported.

```tsx
// apps/web/src/components/hub/widget-grid.tsx
import { useRef } from "react";
import { Bell, Calendar, Clock, CloudSun, Lightbulb, Music } from "lucide-react";
import { formatTime } from "@/components/art-clock/art-clock";
import { WidgetCard } from "@/components/hub/widget-card";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useSwipe } from "@/hooks/use-swipe";
import { useNavigationStore } from "@/stores/navigation-store";
import type { LucideIcon } from "lucide-react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const IDLE_TIMEOUT_MS = 45_000;

interface PlaceholderWidget {
  id: string;
  icon: LucideIcon;
  title: string;
  value?: string;
}

const PLACEHOLDER_WIDGETS: PlaceholderWidget[] = [
  { id: "clock", icon: Clock, title: "Clock" },
  { id: "weather", icon: CloudSun, title: "Weather", value: "72\u00b0F" },
  { id: "lights", icon: Lightbulb, title: "Lights", value: "3 on" },
  { id: "music", icon: Music, title: "Music", value: "Not playing" },
  { id: "calendar", icon: Calendar, title: "Calendar", value: "No events" },
  { id: "notifications", icon: Bell, title: "Notifications", value: "None" },
];

export function WidgetGrid() {
  const setView = useNavigationStore((s) => s.setView);
  const view = useNavigationStore((s) => s.view);
  const swipeRef = useRef<HTMLDivElement>(null);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const clockValue = `${hours}:${minutes} ${period}`;

  useSwipe(swipeRef, { onSwipeRight: () => setView("clock") }, { enabled: view === "hub" });
  useIdleTimeout(() => setView("clock"), IDLE_TIMEOUT_MS, { enabled: view === "hub" });

  return (
    <div data-testid="hub-container" className="h-full" onClick={() => setView("clock")}>
      <div ref={swipeRef} className="h-full">
        <div data-testid="widget-grid" className="grid grid-cols-2 gap-4 p-6">
          {PLACEHOLDER_WIDGETS.map((widget) => (
            <WidgetCard
              key={widget.id}
              id={widget.id}
              icon={widget.icon}
              title={widget.title}
              value={widget.id === "clock" ? clockValue : (widget.value ?? "")}
              onClick={widget.id === "clock" ? () => setView("clock") : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify PASSES**
Run: `cd apps/web && bun run test -- widget-grid`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**
```bash
cd apps/web && git add src/components/hub/widget-grid.tsx src/__tests__/widget-grid.test.tsx && git commit -m "feat: add WidgetGrid component with placeholder widgets" && git push
```

---

### Task 5: HomePage Integration (clock/hub dual-layer)

**Files:**
- Modify: `apps/web/src/routes/index.tsx`
- Test: `apps/web/src/__tests__/home-page-hub.test.tsx`

- [ ] **Step 1: Write failing integration tests**

```tsx
// apps/web/src/__tests__/home-page-hub.test.tsx
import { useNavigationStore } from "@/stores/navigation-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("HomePage hub integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useNavigationStore.setState({ view: "clock" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useNavigationStore.setState({ view: "clock" });
  });

  async function renderHomePage() {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    return render(<HomePage />);
  }

  it("initially shows clock layer with opacity 1", async () => {
    await renderHomePage();

    const clockLayer = screen.getByTestId("clock-layer");
    const hubLayer = screen.getByTestId("hub-layer");
    expect(clockLayer.style.opacity).toBe("1");
    expect(hubLayer.style.opacity).toBe("0");
  });

  it("initially has pointer-events auto on clock, none on hub", async () => {
    await renderHomePage();

    const clockLayer = screen.getByTestId("clock-layer");
    const hubLayer = screen.getByTestId("hub-layer");
    expect(clockLayer.style.pointerEvents).toBe("auto");
    expect(hubLayer.style.pointerEvents).toBe("none");
  });

  it("tap clock opens hub", async () => {
    await renderHomePage();

    fireEvent.click(screen.getByTestId("clock-layer"));

    const hubLayer = screen.getByTestId("hub-layer");
    expect(hubLayer.style.opacity).toBe("1");
    expect(hubLayer.style.pointerEvents).toBe("auto");
  });

  it("tap hub-container returns to clock", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    fireEvent.click(screen.getByTestId("hub-container"));

    const clockLayer = screen.getByTestId("clock-layer");
    expect(clockLayer.style.opacity).toBe("1");
  });

  it("tap widget card does NOT return to clock", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    fireEvent.click(screen.getByTestId("widget-card-weather"));

    expect(useNavigationStore.getState().view).toBe("hub");
  });

  it("auto-returns to clock after idle timeout", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(useNavigationStore.getState().view).toBe("clock");
  });

  it("clock widget tap returns to clock", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    fireEvent.click(screen.getByTestId("widget-card-clock"));

    expect(useNavigationStore.getState().view).toBe("clock");
  });
});
```

- [ ] **Step 2: Run test to verify FAILS**
Run: `cd apps/web && bun run test -- home-page-hub`
Expected: FAIL (no `clock-layer` testid found)

- [ ] **Step 3: Update HomePage to dual-layer layout**

```tsx
// apps/web/src/routes/index.tsx
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
      <div
        data-testid="clock-layer"
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: view === "clock" ? 1 : 0,
          pointerEvents: view === "clock" ? "auto" : "none",
        }}
        onClick={() => setView("hub")}
      >
        <ArtClock />
      </div>

      <div
        data-testid="hub-layer"
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

- [ ] **Step 4: Run test to verify PASSES**
Run: `cd apps/web && bun run test -- home-page-hub`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**
```bash
cd apps/web && git add src/routes/index.tsx src/__tests__/home-page-hub.test.tsx && git commit -m "feat: add dual-layer clock/hub layout with transitions" && git push
```

---

### Task 6: Update Existing HomePage Tests

**Files:**
- Modify: `apps/web/src/__tests__/home-page.test.tsx`

- [ ] **Step 1: Run existing tests to see what breaks**
Run: `cd apps/web && bun run test -- home-page.test`
Expected: Tests may still pass since clock content is always mounted in DOM (opacity-based visibility). If they pass, no changes needed.

- [ ] **Step 2: Fix any broken tests**

The existing tests use `screen.getByText("2")`, `screen.getByText("23")`, etc. These elements are still in the DOM (the clock layer is always mounted). The tests should still pass without changes. If `getByText("PM")` matches multiple elements (one in clock, one in clock widget card in hub), use `getAllByText` or scope with `within`.

Since both the art clock and the clock widget card render "PM", and the hub layer starts at opacity 0 with the clock view as default, both elements are in the DOM. `getByText("PM")` would fail if there are multiple matches. Update the test to use `getAllByText` for values that appear in both clock and hub widget:

```tsx
// apps/web/src/__tests__/home-page.test.tsx
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useNavigationStore.setState({ view: "clock" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useNavigationStore.setState({ view: "clock" });
  });

  it("renders clock time from ArtClock", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    // PM appears in both clock and clock widget card, so use getAllByText
    const pmElements = screen.getAllByText("PM");
    expect(pmElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders formatted date from ArtClock", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByText("SATURDAY, 11 APR 26")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify PASSES**
Run: `cd apps/web && bun run test -- home-page.test`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**
```bash
cd apps/web && git add src/__tests__/home-page.test.tsx && git commit -m "fix: update home page tests for dual-layer layout" && git push
```

---

### Task 7: Export CLOCK_UPDATE_INTERVAL_MS (if needed) and Full Test Suite Run

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**
Run: `cd apps/web && bun run test`
Expected: All tests pass

- [ ] **Step 2: Run type check**
Run: `cd apps/web && bunx tsc --noEmit`
Expected: Exit 0

- [ ] **Step 3: Run lint**
Run: `cd apps/web && bun run lint:fix`
Expected: Exit 0

- [ ] **Step 4: Fix any issues found in steps 1-3**
Address any type errors, lint issues, or test failures.

- [ ] **Step 5: Commit fixes (if any)**
```bash
cd apps/web && git add -A && git commit -m "fix: address lint and type issues" && git push
```
