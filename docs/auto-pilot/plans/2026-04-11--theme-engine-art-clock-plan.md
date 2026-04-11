# Theme Engine + Art Clock Implementation Plan

**Goal:** Build a Zustand-powered Theme Engine that injects CSS variables onto `:root`, and an Art Clock home scene that replaces the current hello-world index route with a museum-aesthetic time display.
**Architecture:** ThemeStore (Zustand) holds palette data. ThemeProvider component subscribes to the store and applies CSS variables to `document.documentElement.style`. ArtClock component uses a `useCurrentTime` hook and pure formatting functions to render time/date with Geist ultralight typography.
**Tech Stack:** React 19, Zustand 5, Tailwind CSS v4, Vitest, Testing Library, Geist Variable font.

---

## Task 1: Theme Types + Palette Definition

**Files:**
- Create: `apps/web/src/stores/theme-store.ts`
- Test: `apps/web/src/__tests__/theme-store.test.ts`

- [ ] **Step 1: Create stores directory and write failing tests**

Create `apps/web/src/__tests__/theme-store.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { useThemeStore, MIDNIGHT_PALETTE } from "@/stores/theme-store";
import type { ThemePalette } from "@/stores/theme-store";

describe("theme-store", () => {
  afterEach(() => {
    // Reset store to initial state between tests
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
  });

  it("initializes with midnight palette as active", () => {
    const state = useThemeStore.getState();
    expect(state.activePaletteId).toBe("midnight");
    expect(state.palettes.midnight).toBeDefined();
  });

  it("getActivePalette returns the midnight palette", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.id).toBe("midnight");
    expect(palette.name).toBe("Midnight");
  });

  it("midnight palette has correct accent color", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.colors.accent).toBe("#d4a574");
    expect(palette.colors.accentForeground).toBe("#1a1a1a");
  });

  it("midnight palette has correct background and foreground", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.colors.background).toBe("#000000");
    expect(palette.colors.foreground).toBe("#fafafa");
  });

  it("registerPalette adds a new palette", () => {
    const testPalette: ThemePalette = {
      id: "dawn",
      name: "Dawn",
      colors: {
        background: "#1a1a2e",
        foreground: "#eaeaea",
        muted: "#2d2d44",
        mutedForeground: "#9999aa",
        border: "#2d2d44",
        input: "#2d2d44",
        ring: "#ccccdd",
        primary: "#eaeaea",
        primaryForeground: "#1a1a2e",
        secondary: "#2d2d44",
        secondaryForeground: "#eaeaea",
        accent: "#e8a87c",
        accentForeground: "#1a1a2e",
        destructive: "#ef4444",
        destructiveForeground: "#fafafa",
        card: "#1a1a2e",
        cardForeground: "#eaeaea",
        popover: "#1a1a2e",
        popoverForeground: "#eaeaea",
      },
    };
    useThemeStore.getState().registerPalette(testPalette);
    expect(useThemeStore.getState().palettes.dawn).toEqual(testPalette);
  });

  it("registerPalette overwrites existing palette with same ID", () => {
    const updated: ThemePalette = {
      ...MIDNIGHT_PALETTE,
      name: "Midnight V2",
    };
    useThemeStore.getState().registerPalette(updated);
    expect(useThemeStore.getState().palettes.midnight.name).toBe("Midnight V2");
  });

  it("setActivePalette switches active palette ID", () => {
    const testPalette: ThemePalette = {
      id: "dawn",
      name: "Dawn",
      colors: { ...MIDNIGHT_PALETTE.colors },
    };
    useThemeStore.getState().registerPalette(testPalette);
    useThemeStore.getState().setActivePalette("dawn");
    expect(useThemeStore.getState().activePaletteId).toBe("dawn");
  });

  it("setActivePalette with invalid ID does not change active palette", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    useThemeStore.getState().setActivePalette("nonexistent");
    expect(useThemeStore.getState().activePaletteId).toBe("midnight");
    expect(warnSpy).toHaveBeenCalledWith(
      'Theme palette "nonexistent" not found, keeping current palette'
    );
    warnSpy.mockRestore();
  });

  it("has correct transitionDuration_MS default", () => {
    expect(useThemeStore.getState().transitionDuration_MS).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd apps/web && bun run test`
Expected: FAIL (module `@/stores/theme-store` does not exist)

- [ ] **Step 3: Create stores directory and implement theme store**

Create directory: `apps/web/src/stores/`

Create `apps/web/src/stores/theme-store.ts`:

```typescript
import { create } from "zustand";

export interface ThemePalette {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    ring: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
  };
}

interface ThemeState {
  palettes: Record<string, ThemePalette>;
  activePaletteId: string;
  transitionDuration_MS: number;
}

interface ThemeActions {
  setActivePalette: (id: string) => void;
  registerPalette: (palette: ThemePalette) => void;
  getActivePalette: () => ThemePalette;
}

export const MIDNIGHT_PALETTE: ThemePalette = {
  id: "midnight",
  name: "Midnight",
  colors: {
    background: "#000000",
    foreground: "#fafafa",
    muted: "#262626",
    mutedForeground: "#a3a3a3",
    border: "#262626",
    input: "#262626",
    ring: "#d4d4d4",
    primary: "#fafafa",
    primaryForeground: "#0a0a0a",
    secondary: "#262626",
    secondaryForeground: "#fafafa",
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: "#ef4444",
    destructiveForeground: "#fafafa",
    card: "#0a0a0a",
    cardForeground: "#fafafa",
    popover: "#0a0a0a",
    popoverForeground: "#fafafa",
  },
};

export const useThemeStore = create<ThemeState & ThemeActions>((set, get) => ({
  palettes: { midnight: MIDNIGHT_PALETTE },
  activePaletteId: "midnight",
  transitionDuration_MS: 0,

  setActivePalette: (id: string) => {
    const { palettes } = get();
    if (!palettes[id]) {
      console.warn(`Theme palette "${id}" not found, keeping current palette`);
      return;
    }
    set({ activePaletteId: id });
  },

  registerPalette: (palette: ThemePalette) => {
    set((state) => ({
      palettes: { ...state.palettes, [palette.id]: palette },
    }));
  },

  getActivePalette: () => {
    const { palettes, activePaletteId } = get();
    return palettes[activePaletteId] ?? MIDNIGHT_PALETTE;
  },
}));
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd apps/web && bun run test`
Expected: PASS (all theme-store tests green)

- [ ] **Step 5: Lint**

Run: `cd apps/web && bun run lint:fix`

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/stores/theme-store.ts src/__tests__/theme-store.test.ts && git commit -m "feat: add Zustand theme store with midnight palette" && git push
```

---

## Task 2: useCurrentTime Hook

**Files:**
- Create: `apps/web/src/hooks/use-current-time.ts`
- Test: `apps/web/src/__tests__/use-current-time.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/use-current-time.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentTime } from "@/hooks/use-current-time";

describe("useCurrentTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a Date object on initial render", () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current).toBeInstanceOf(Date);
  });

  it("returns current time on initial render", () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current.getHours()).toBe(14);
    expect(result.current.getMinutes()).toBe(23);
  });

  it("updates after interval elapses", () => {
    const { result } = renderHook(() => useCurrentTime());
    const initial = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.getTime()).toBeGreaterThan(initial);
  });

  it("uses custom interval", () => {
    const { result } = renderHook(() => useCurrentTime(500));
    const initial = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.getTime()).toBeGreaterThan(initial);
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useCurrentTime());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd apps/web && bun run test`
Expected: FAIL (module `@/hooks/use-current-time` cannot resolve)

- [ ] **Step 3: Implement useCurrentTime hook**

Create `apps/web/src/hooks/use-current-time.ts`:

```typescript
import { useEffect, useState } from "react";

export function useCurrentTime(interval_MS: number = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, interval_MS);

    return () => clearInterval(id);
  }, [interval_MS]);

  return now;
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd apps/web && bun run test`
Expected: PASS

- [ ] **Step 5: Lint**

Run: `cd apps/web && bun run lint:fix`

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/hooks/use-current-time.ts src/__tests__/use-current-time.test.ts && git commit -m "feat: add useCurrentTime hook with configurable interval" && git push
```

---

## Task 3: Art Clock Formatting Utilities + Component

**Files:**
- Create: `apps/web/src/components/art-clock/art-clock.tsx`
- Test: `apps/web/src/__tests__/art-clock.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/art-clock.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArtClock, formatTime, formatDate } from "@/components/art-clock/art-clock";

describe("formatTime", () => {
  it("formats afternoon time correctly", () => {
    const date = new Date(2026, 3, 11, 14, 5);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "14", minutes: "05" });
  });

  it("does not add leading zero to single-digit hours", () => {
    const date = new Date(2026, 3, 11, 9, 30);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "9", minutes: "30" });
  });

  it("formats midnight as 0:00", () => {
    const date = new Date(2026, 3, 11, 0, 0);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "0", minutes: "00" });
  });

  it("pads single-digit minutes with leading zero", () => {
    const date = new Date(2026, 3, 11, 12, 3);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "12", minutes: "03" });
  });
});

describe("formatDate", () => {
  it("formats date as uppercase WEEKDAY DD MON", () => {
    const date = new Date(2026, 3, 11); // Saturday April 11, 2026
    const result = formatDate(date);
    expect(result).toBe("SATURDAY 11 APR");
  });

  it("formats another date correctly", () => {
    const date = new Date(2026, 0, 1); // Thursday January 1, 2026
    const result = formatDate(date);
    expect(result).toBe("THURSDAY 1 JAN");
  });
});

describe("ArtClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders hours", () => {
    render(<ArtClock />);
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("renders minutes", () => {
    render(<ArtClock />);
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("renders the colon separator", () => {
    render(<ArtClock />);
    const colon = screen.getByText(":");
    expect(colon).toBeInTheDocument();
  });

  it("colon has pulse animation class", () => {
    render(<ArtClock />);
    const colon = screen.getByText(":");
    expect(colon.className).toContain("animate-[pulse-colon_2s_ease-in-out_infinite]");
  });

  it("renders formatted date", () => {
    render(<ArtClock />);
    expect(screen.getByText("SATURDAY 11 APR")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd apps/web && bun run test`
Expected: FAIL (module `@/components/art-clock/art-clock` does not exist)

- [ ] **Step 3: Implement ArtClock component**

Create directory: `apps/web/src/components/art-clock/`

Create `apps/web/src/components/art-clock/art-clock.tsx`:

```typescript
import { useCurrentTime } from "@/hooks/use-current-time";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

export function formatTime(date: Date): { hours: string; minutes: string } {
  const hours = String(date.getHours());
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { hours, minutes };
}

export function formatDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
  return formatted.toUpperCase();
}

export function ArtClock() {
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes } = formatTime(now);
  const dateStr = formatDate(now);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex items-baseline text-[12rem] font-[100] leading-none tracking-tight text-foreground">
        <span>{hours}</span>
        <span className="animate-[pulse-colon_2s_ease-in-out_infinite]">:</span>
        <span>{minutes}</span>
      </div>
      <div className="mt-4 text-lg font-[300] tracking-[0.25em] text-muted-foreground">
        {dateStr}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd apps/web && bun run test`
Expected: PASS

- [ ] **Step 5: Lint**

Run: `cd apps/web && bun run lint:fix`

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/components/art-clock/art-clock.tsx src/__tests__/art-clock.test.tsx && git commit -m "feat: add ArtClock component with time/date formatting" && git push
```

---

## Task 4: ThemeProvider Component

**Files:**
- Create: `apps/web/src/components/theme-provider.tsx`
- Test: `apps/web/src/__tests__/theme-provider.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/theme-provider.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { useThemeStore, MIDNIGHT_PALETTE } from "@/stores/theme-store";
import type { ThemePalette } from "@/stores/theme-store";

describe("ThemeProvider", () => {
  afterEach(() => {
    // Reset store state
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
    // Clear inline styles
    document.documentElement.style.cssText = "";
  });

  it("applies --color-background CSS variable to documentElement", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe("#000000");
  });

  it("applies --color-accent CSS variable", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("#d4a574");
  });

  it("applies --color-foreground CSS variable", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );
    expect(document.documentElement.style.getPropertyValue("--color-foreground")).toBe("#fafafa");
  });

  it("applies --color-muted-foreground with kebab-case", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );
    expect(document.documentElement.style.getPropertyValue("--color-muted-foreground")).toBe("#a3a3a3");
  });

  it("renders children", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">hello</div>
      </ThemeProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("updates CSS variables when palette changes", () => {
    const dawnPalette: ThemePalette = {
      id: "dawn",
      name: "Dawn",
      colors: {
        background: "#1a1a2e",
        foreground: "#eaeaea",
        muted: "#2d2d44",
        mutedForeground: "#9999aa",
        border: "#2d2d44",
        input: "#2d2d44",
        ring: "#ccccdd",
        primary: "#eaeaea",
        primaryForeground: "#1a1a2e",
        secondary: "#2d2d44",
        secondaryForeground: "#eaeaea",
        accent: "#e8a87c",
        accentForeground: "#1a1a2e",
        destructive: "#ef4444",
        destructiveForeground: "#fafafa",
        card: "#1a1a2e",
        cardForeground: "#eaeaea",
        popover: "#1a1a2e",
        popoverForeground: "#eaeaea",
      },
    };

    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );

    // Register and switch to dawn palette
    useThemeStore.getState().registerPalette(dawnPalette);
    useThemeStore.getState().setActivePalette("dawn");

    // Re-render triggers useEffect
    // Need to wait for React to process the store update
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe("#1a1a2e");
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `cd apps/web && bun run test`
Expected: FAIL (module `@/components/theme-provider` does not exist)

- [ ] **Step 3: Implement ThemeProvider**

Create `apps/web/src/components/theme-provider.tsx`:

```typescript
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useThemeStore, MIDNIGHT_PALETTE } from "@/stores/theme-store";

interface ThemeProviderProps {
  children: ReactNode;
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const activePaletteId = useThemeStore((state) => state.activePaletteId);
  const palettes = useThemeStore((state) => state.palettes);
  const palette = palettes[activePaletteId] ?? MIDNIGHT_PALETTE;

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    for (const [key, value] of Object.entries(palette.colors)) {
      const cssVarName = `--color-${camelToKebab(key)}`;
      root.style.setProperty(cssVarName, value);
    }
  }, [palette]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it PASSES**

Run: `cd apps/web && bun run test`
Expected: PASS

- [ ] **Step 5: Lint**

Run: `cd apps/web && bun run lint:fix`

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/components/theme-provider.tsx src/__tests__/theme-provider.test.tsx && git commit -m "feat: add ThemeProvider that applies CSS variables from store" && git push
```

---

## Task 5: Update globals.css

**Files:**
- Modify: `apps/web/src/styles/globals.css`

- [ ] **Step 1: Write failing test**

No unit test needed for CSS keyframe changes. Verification is via the existing ArtClock test that checks for the animation class name, plus visual E2E verification later. The CSS variable defaults are tested by ThemeProvider tests.

Skip to implementation.

- [ ] **Step 2: Update globals.css**

Modify `apps/web/src/styles/globals.css`:

1. Change `--color-accent: #262626;` to `--color-accent: #d4a574;`
2. Change `--color-accent-foreground: #fafafa;` to `--color-accent-foreground: #1a1a1a;`
3. Add `@keyframes pulse-colon` block after the closing `}` of the `body` rule:

```css
@keyframes pulse-colon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
```

The full updated file:

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";
@import "@fontsource-variable/geist-mono";

@theme {
  --color-background: #000000;
  --color-foreground: #fafafa;
  --color-muted: #262626;
  --color-muted-foreground: #a3a3a3;
  --color-border: #262626;
  --color-input: #262626;
  --color-ring: #d4d4d4;
  --color-primary: #fafafa;
  --color-primary-foreground: #0a0a0a;
  --color-secondary: #262626;
  --color-secondary-foreground: #fafafa;
  --color-accent: #d4a574;
  --color-accent-foreground: #1a1a1a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #fafafa;
  --color-card: #0a0a0a;
  --color-card-foreground: #fafafa;
  --color-popover: #0a0a0a;
  --color-popover-foreground: #fafafa;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --font-sans: "Geist Variable", "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono Variable", "Geist Mono", ui-monospace, monospace;
}

html,
body,
#root {
  height: 100%;
}

html,
body {
  overscroll-behavior: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-background);
  color: var(--color-foreground);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}

@keyframes pulse-colon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
```

- [ ] **Step 3: Run existing tests to verify nothing breaks**

Run: `cd apps/web && bun run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd apps/web && git add src/styles/globals.css && git commit -m "feat: update accent colors and add pulse-colon keyframe animation" && git push
```

---

## Task 6: Wire ThemeProvider into App.tsx

**Files:**
- Modify: `apps/web/src/app.tsx`

- [ ] **Step 1: Write a test to verify ThemeProvider is mounted**

The existing `apps/web/src/__tests__/theme-provider.test.tsx` already tests ThemeProvider in isolation. For integration, we verify CSS variables are applied when the full app renders. However, rendering the full app requires router setup. Instead, we verify by running the full test suite after the change.

Skip to implementation (ThemeProvider integration is tested by visual E2E).

- [ ] **Step 2: Modify app.tsx to wrap RouterProvider with ThemeProvider**

Modify `apps/web/src/app.tsx` to add the ThemeProvider import and wrap `<RouterProvider>`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { trpc, trpcClient } from "./lib/trpc";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd apps/web && bun run test`
Expected: PASS

- [ ] **Step 4: Run type check**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
cd apps/web && git add src/app.tsx && git commit -m "feat: wrap app with ThemeProvider for CSS variable injection" && git push
```

---

## Task 7: Replace Index Route with ArtClock

**Files:**
- Modify: `apps/web/src/routes/index.tsx`

- [ ] **Step 1: Write a test to verify the route renders ArtClock**

This is covered by the existing ArtClock tests and the visual E2E verification. The route file is a thin wrapper.

- [ ] **Step 2: Replace index route content**

Modify `apps/web/src/routes/index.tsx`:

```typescript
import { ArtClock } from "@/components/art-clock/art-clock";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <ArtClock />;
}
```

- [ ] **Step 3: Run tests**

Run: `cd apps/web && bun run test`
Expected: PASS

- [ ] **Step 4: Run type check**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: Lint**

Run: `cd apps/web && bun run lint:fix`

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/routes/index.tsx && git commit -m "feat: replace hello-world index route with ArtClock" && git push
```

---

## Task 8: Delete theme.ts + Final Cleanup

**Files:**
- Delete: `apps/web/src/styles/theme.ts`

- [ ] **Step 1: Verify nothing imports theme.ts**

Run: `cd apps/web && grep -r "styles/theme" src/` 
Expected: no output (no imports found)

- [ ] **Step 2: Delete theme.ts**

```bash
cd apps/web && rm src/styles/theme.ts
```

- [ ] **Step 3: Run full test suite**

Run: `cd apps/web && bun run test`
Expected: PASS (all tests)

- [ ] **Step 4: Run type check**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: Run lint**

Run: `cd apps/web && bun run lint:fix`
Expected: clean

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add -A && git commit -m "refactor: remove static theme.ts, replaced by Zustand theme store" && git push
```

---

## Task 9: E2E Visual Verification

- [ ] **Step 1: Start dev server**

```bash
cd apps/web && bun run dev
```

Wait for "ready" message on port 4200.

- [ ] **Step 2: Open browser and screenshot**

Use agent-browser to navigate to `http://localhost:4200`.

- [ ] **Step 3: Verify visual requirements**

Check all of:
- Background is true black (#000000)
- Large time display centered on screen (ultralight weight, massive size)
- Date displayed below time in uppercase, letter-spaced
- Colon pulses (opacity animation)
- No "The Workflow Engine" text or build hash visible
- Font appears ultralight (weight 100)

- [ ] **Step 4: Verify CSS variables**

In browser devtools or via script, check `document.documentElement.style`:
- `--color-accent` is `#d4a574`
- `--color-background` is `#000000`

- [ ] **Step 5: Save screenshot**

Save screenshot to `docs/screenshots/` and commit.

```bash
git add docs/screenshots/ && git commit -m "docs: add art clock visual verification screenshot" && git push
```

---

## Self-Review Checklist

| Check | Status |
|-------|--------|
| Spec coverage: Theme store with midnight palette | Covered in Task 1 |
| Spec coverage: ThemeProvider applying CSS vars | Covered in Task 4 |
| Spec coverage: useCurrentTime hook | Covered in Task 2 |
| Spec coverage: ArtClock component with formatTime/formatDate | Covered in Task 3 |
| Spec coverage: globals.css accent color update + keyframe | Covered in Task 5 |
| Spec coverage: App.tsx ThemeProvider wrapping | Covered in Task 6 |
| Spec coverage: Index route replaced | Covered in Task 7 |
| Spec coverage: theme.ts deleted | Covered in Task 8 |
| Spec coverage: E2E visual verification | Covered in Task 9 |
| Placeholder scan: No TBD/TODO | Clean |
| Type consistency: ThemePalette, ThemeState, ThemeActions names match across files | Consistent |
| TDD compliance: Tasks 1-4 all start with failing tests | Yes |
| Import convention: All imports at top of file | Yes |
| No global variables | Yes |
| Conventional commits | Yes |
| Unit suffix on numeric constants | CLOCK_UPDATE_INTERVAL_MS, interval_MS, transitionDuration_MS |
