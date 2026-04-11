# Theme Engine + Art Clock Design Spec

## Overview

Build the frontend visual foundation for the wall-mounted iPad Pro panel: a Zustand-powered Theme Engine that injects CSS variables onto `:root`, and an Art Clock home scene that replaces the current hello-world index route. The clock is the hero UI, designed as living art with a museum/gallery aesthetic. Single palette now, structured for future time-of-day switching.

## Assumptions

Decisions made autonomously (not specified in alignment doc):

- **Accent color**: `#d4a574` (muted warm amber). Softer than bright orange, reads well on true black, evokes gallery warmth.
- **Accent foreground**: `#1a1a1a` (near-black for text on accent backgrounds).
- **Clock font weight**: Geist Variable at weight 100 (ultralight). Maximum elegance, thinnest available.
- **Time format**: 24-hour (`HH:MM`) with no leading zero on hours. Colon pulses (opacity animation, 2s cycle). No seconds displayed.
- **Date format**: Weekday full name, day number, month abbreviated, e.g. "Friday 11 Apr". Lowercase, letter-spaced.
- **Clock update interval**: 1000ms (1 second) to keep colon pulse smooth.
- **Theme initialization**: Runs once at app startup via a `<ThemeProvider>` component that reads the Zustand store and applies CSS variables to `document.documentElement`. Subscribes to store changes for future dynamic switching.
- **CSS variable naming**: Reuses existing `--color-*` convention from `globals.css` `@theme` block. Theme engine overrides these at runtime via `style` attribute on `<html>`.
- **No transition animations on theme switch yet**: Single palette means no visible transitions. The store supports a `transitionDuration_MS` field for future use.
- **Build hash display removed**: The current index route shows a build hash. This is removed from the clock view. The build hash query remains in `ConnectionStatus` component.
- **Clock container**: Full viewport, centered, no scroll. Flexbox column layout.
- **`theme.ts` replaced**: The existing `src/styles/theme.ts` static color export is replaced by the Zustand store. Any code importing from it will import from the new store instead.

## Architecture

### Data Flow

```
ThemeStore (Zustand)
  |
  +--> ThemeProvider (React component, subscribes to store)
  |      |
  |      +--> Sets CSS variables on document.documentElement.style
  |
  +--> Tailwind classes read CSS variables automatically via @theme block
  |
  +--> Components can read store directly for programmatic access
```

### Components

1. **ThemeStore** (`stores/theme-store.ts`) - Zustand store holding palette data and active palette ID
2. **ThemeProvider** (`components/theme-provider.tsx`) - Subscribes to store, applies CSS vars to DOM
3. **ArtClock** (`components/art-clock/art-clock.tsx`) - Main clock display component
4. **useCurrentTime** (`hooks/use-current-time.ts`) - Hook returning current Date, updates every second

### Palette Structure

```typescript
interface ThemePalette {
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
```

## Implementation Details

### 1. Theme Store (`stores/theme-store.ts`)

Zustand store with a single "midnight" palette registered by default.

```typescript
// Palette: "midnight" (the single approved palette)
const MIDNIGHT_PALETTE: ThemePalette = {
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
```

Key differences from existing `theme.ts`:
- `accent` changes from `#262626` (gray) to `#d4a574` (warm amber)
- `accentForeground` changes from `#fafafa` to `#1a1a1a` (dark, for readability on amber)

Store exports:
- `useThemeStore` - Zustand hook
- `MIDNIGHT_PALETTE` - exported for tests
- Type exports: `ThemePalette`, `ThemeState`, `ThemeActions`

### 2. Theme Provider (`components/theme-provider.tsx`)

Thin component that:
1. Reads `activePaletteId` and `palettes` from store
2. Derives the active palette's colors
3. Applies each color as `--color-{name}` on `document.documentElement.style`
4. Sets `transition` on `document.documentElement.style` using `transitionDuration_MS` for future smooth palette switches
5. Returns `children` (no wrapper div)

Uses `useEffect` to sync CSS vars when palette changes. Converts camelCase color keys to kebab-case for CSS variable names (e.g., `mutedForeground` -> `muted-foreground`).

Mounted in `App` component, wrapping `RouterProvider`.

### 3. useCurrentTime Hook (`hooks/use-current-time.ts`)

```typescript
function useCurrentTime(intervalMs: number = 1000): Date
```

- Returns `new Date()`, re-renders every `intervalMs`
- Uses `setInterval` in `useEffect`, cleans up on unmount
- Pure, no dependencies beyond React

### 4. Art Clock Component (`components/art-clock/art-clock.tsx`)

Layout (top to bottom, centered):
```
|                          |
|                          |
|         14:23            |  <-- time, ultralight, massive
|      friday 11 apr       |  <-- date, small caps feel, letter-spaced
|                          |
|                          |
```

**Time display**:
- Font: Geist Variable, weight 100
- Size: `text-[12rem]` (192px) - large enough to be art, not UI
- Leading: tight (`leading-none`)
- Color: `text-foreground`
- Letter spacing: `tracking-tight` (-0.025em)
- The colon between hours and minutes: animated opacity pulse (1 -> 0.2 -> 1, 2s ease-in-out infinite)
- Hours: no leading zero (e.g., `9:05` not `09:05`)
- Minutes: always two digits with leading zero

**Date display**:
- Font: Geist Variable, weight 300
- Size: `text-lg` (18px)
- Color: `text-muted-foreground`
- Letter spacing: `tracking-[0.25em]` (generous)
- Text transform: uppercase
- Format: `FRIDAY 11 APR`
- Margin top: `mt-4`

**Container**:
- Full height flex column, items-center, justify-center
- No padding (clock is the only content, centered by flexbox)

**Formatting helpers** (pure functions, exported for testing):
```typescript
function formatTime(date: Date): { hours: string; minutes: string }
function formatDate(date: Date): string
```

`formatTime` returns separate hours/minutes strings so the colon can be a separate animated element.

`formatDate` uses `Intl.DateTimeFormat` with `{ weekday: "long", day: "numeric", month: "short" }` and transforms to uppercase.

**Colon animation**: Defined as a CSS keyframe in `globals.css`:
```css
@keyframes pulse-colon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```
Applied via Tailwind arbitrary class: `animate-[pulse-colon_2s_ease-in-out_infinite]`

### 5. CSS Changes (`styles/globals.css`)

- Add `@keyframes pulse-colon` animation
- Update `@theme` block: change `--color-accent` to `#d4a574` and `--color-accent-foreground` to `#1a1a1a`
- These `@theme` values serve as defaults; ThemeProvider overrides at runtime

### 6. Remove `styles/theme.ts`

Delete this file. The Zustand store replaces it. No other files import from it currently (verified: only `globals.css` defines these colors, and Tailwind reads them from CSS variables).

### 7. Route Change (`routes/index.tsx`)

Replace current hello-world content with `<ArtClock />`. Remove the `trpc` import and build hash query.

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

### 8. App.tsx Change

Add `ThemeProvider` wrapping `RouterProvider`:

```typescript
import { ThemeProvider } from "./components/theme-provider";

// Inside App render:
<trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>
</trpc.Provider>
```

## File Structure

### Create

| File | Purpose |
|------|---------|
| `src/stores/theme-store.ts` | Zustand theme store with palette registry, types, midnight palette |
| `src/components/theme-provider.tsx` | Subscribes to store, applies CSS variables to document.documentElement |
| `src/hooks/use-current-time.ts` | Hook returning current Date, updates every second |
| `src/components/art-clock/art-clock.tsx` | Art clock display component with time/date formatting |
| `src/__tests__/theme-store.test.ts` | Unit tests for theme store |
| `src/__tests__/use-current-time.test.ts` | Unit tests for current time hook |
| `src/__tests__/art-clock.test.tsx` | Unit tests for clock formatting + rendering |
| `src/__tests__/theme-provider.test.tsx` | Unit tests for CSS variable application |

### Modify

| File | Change |
|------|--------|
| `src/app.tsx` | Add ThemeProvider wrapping RouterProvider |
| `src/routes/index.tsx` | Replace hello-world with ArtClock |
| `src/styles/globals.css` | Add pulse-colon keyframe, update accent color values |

### Delete

| File | Reason |
|------|--------|
| `src/styles/theme.ts` | Replaced by Zustand theme store |

## Testing Strategy

### Unit Tests: Theme Store (`__tests__/theme-store.test.ts`)

- **Default state**: Store initializes with midnight palette as active
- **getActivePalette**: Returns the midnight palette object
- **setActivePalette**: Switches active palette ID (register a second palette, switch to it, verify)
- **setActivePalette with invalid ID**: Does not change active palette (stays on current)
- **registerPalette**: Adds a new palette to the registry
- **registerPalette with existing ID**: Overwrites the existing palette
- **Palette color values**: Midnight palette has correct accent (#d4a574)

### Unit Tests: useCurrentTime (`__tests__/use-current-time.test.ts`)

- **Returns a Date**: Initial render returns a Date object
- **Updates on interval**: After advancing fake timers by 1000ms, the returned date changes
- **Cleans up interval on unmount**: Spy on clearInterval, unmount, verify called
- **Custom interval**: Pass 500ms, verify updates at that rate

Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.

### Unit Tests: Art Clock (`__tests__/art-clock.test.tsx`)

- **formatTime**: `new Date(2026, 3, 11, 14, 5)` -> `{ hours: "14", minutes: "05" }`
- **formatTime no leading zero on hours**: `new Date(2026, 3, 11, 9, 30)` -> `{ hours: "9", minutes: "30" }`
- **formatTime midnight**: `new Date(2026, 3, 11, 0, 0)` -> `{ hours: "0", minutes: "00" }`
- **formatDate**: Returns uppercase weekday, day number, abbreviated month
- **Renders time**: Component renders hours and minutes text
- **Renders date**: Component renders formatted date string
- **Colon element exists**: The colon separator is rendered with animation class

### Unit Tests: Theme Provider (`__tests__/theme-provider.test.tsx`)

- **Applies CSS variables**: After mounting ThemeProvider, `document.documentElement.style` has `--color-background` set to `#000000`
- **Applies all color variables**: Check a sample of variables (accent, foreground, muted)
- **Updates when palette changes**: Register new palette, switch to it, verify CSS variables update
- **Renders children**: Children passed through correctly

## E2E Verification Plan

### Prerequisites
- Working directory: `apps/web`
- No backend needed (pure frontend, clock uses device time)

### Steps

1. **Start dev server**
   ```bash
   cd apps/web && bun run dev
   ```
   Wait for "ready" message on port 4200.

2. **Run unit tests**
   ```bash
   cd apps/web && bun run test
   ```
   All tests must pass. Zero failures.

3. **Run type check**
   ```bash
   cd apps/web && bun run typecheck
   ```
   Must exit 0.

4. **Run lint**
   ```bash
   cd apps/web && bun run lint
   ```
   Must exit 0.

5. **Visual verification via browser**
   Open `http://localhost:4200` using agent-browser or screencapture.

   **Verify**:
   - Background is true black (#000000)
   - Large time display centered on screen (ultralight weight, massive size)
   - Date displayed below time in uppercase, letter-spaced
   - Time updates every minute (colon pulses)
   - No "The Workflow Engine" text or build hash visible
   - Warm amber accent color is available (inspect CSS vars on html element)

6. **Verify CSS variables applied**
   In browser devtools or via agent-browser, check `document.documentElement.style`:
   - `--color-accent` should be `#d4a574`
   - `--color-background` should be `#000000`

### PASS Criteria
- All unit tests pass
- Type check passes
- Lint passes
- Clock renders centered with correct time
- True black background
- Ultralight font weight visible
- Colon animation visible (pulsing)
- Date formatted correctly below time
- CSS variables present on html element

### FAIL Criteria
- Any test failure
- Type errors
- Clock not rendering or showing wrong time
- Background not true black
- Font weight appears normal/bold instead of ultralight
- CSS variables not applied
- Old hello-world content still visible

## Error Handling

- **Theme store**: `setActivePalette` with unknown ID is a no-op (logs warning via `console.warn`). Does not throw.
- **Theme provider**: If `getActivePalette()` returns undefined (should not happen with default palette), falls back to midnight palette colors.
- **useCurrentTime**: No error states. `new Date()` always succeeds. Interval cleanup on unmount prevents memory leaks.
- **Art clock**: No error states. Pure display of `Date` object. `Intl.DateTimeFormat` is supported on all target browsers (Safari/WebKit on iPad).
- **CSS variable application**: If `document.documentElement` is somehow null (SSR), ThemeProvider guards with early return. Not expected in this SPA context.
