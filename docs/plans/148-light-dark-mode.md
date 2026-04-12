# Plan: Light/Dark Mode Toggle (#148)

## Current Theme System

**How it works:**
- `useThemeStore` (Zustand) holds `palettes` map, `activePaletteId`, and `transitionDuration_MS`
- Two built-in palettes: `midnight` (dark) and `daylight` (light)
- `ThemeProvider` component reads active palette from store and sets CSS custom properties on `document.documentElement` (e.g. `--color-background`, `--color-foreground`, etc.)
- `globals.css` sets static `@theme` defaults (Tailwind v4 theme tokens) but these get overridden at runtime by the ThemeProvider inline styles
- `body` uses `var(--color-background)` and `var(--color-foreground)` — already theme-aware
- Persistence: `localStorage.getItem("theme-mode")` on init. `setActivePalette` does NOT currently persist to localStorage — it only updates Zustand state in memory

**What `setActivePalette` is missing:** it doesn't write back to `localStorage`. Switching palettes will be lost on page reload.

---

## Palette Values vs Requirement

The requirement says: dark = pure black bg, white text. Light = pure white bg, black text. No grays.

Current `MIDNIGHT_PALETTE`:
- background: `#000000` — correct (pure black)
- foreground: `#fafafa` — off-white (close but not `#ffffff`)
- card: `#0a0a0a` — near-black, not pure black
- muted, border, etc: grays (`#262626`, `#a3a3a3`)

Current `DAYLIGHT_PALETTE`:
- background: `#ffffff` — correct (pure white)
- foreground: `#1a1a1a` — near-black, not pure black
- card: `#f7f7f7` — off-white
- muted, border, etc: light grays

**Gap:** the palettes have grays in muted/secondary/border/card. The requirement says "no grays" — this needs interpretation. The critical high-contrast tokens are `background`, `foreground`, `card`, `cardForeground`. Supporting tokens like `muted`, `border`, `secondary` are needed for UI structure — using pure black/white for those would break visual hierarchy.

**Recommendation:** treat "no grays" as applying to the primary surfaces (background, card, popover) and their text colors. Muted/border/ring/secondary can remain slightly off for usability.

---

## What Needs to Change

### 1. Update palette color values

**MIDNIGHT_PALETTE** — bring to true pure-black spec:
- `foreground`: `#fafafa` → `#ffffff`
- `card`: `#0a0a0a` → `#000000`
- `popover`: `#0a0a0a` → `#000000`
- `cardForeground`: already `#fafafa` → `#ffffff`
- `popoverForeground`: already `#fafafa` → `#ffffff`
- `primary`: already `#fafafa` → `#ffffff`

**DAYLIGHT_PALETTE** — bring to true pure-white spec:
- `foreground`: `#1a1a1a` → `#000000`
- `card`: `#f7f7f7` → `#ffffff`
- `popover`: `#f7f7f7` → `#ffffff`
- `cardForeground`: `#1a1a1a` → `#000000`
- `popoverForeground`: `#1a1a1a` → `#000000`
- `primary`: `#1a1a1a` → `#000000`
- `primaryForeground`: already `#ffffff`

### 2. Fix `setActivePalette` to persist to localStorage

Add `globalThis.localStorage?.setItem("theme-mode", id)` inside `setActivePalette`.

### 3. `BentoCard` hardcoded colors

`bento-card.tsx` has inline `borderColor` and `boxShadow` that are hardcoded (`rgba(255,255,255,0.08)` / `rgba(0,0,0,0.06)`) based on `isDark`. These will work correctly since they already branch on `activePaletteId === "midnight"`. No change needed — the logic is correct.

### 4. No Tailwind dark-mode class strategy needed

The app uses runtime CSS variable injection via ThemeProvider. There is no `darkMode: 'class'` Tailwind config. The entire theme is driven by CSS variables. This means the toggle is purely: call `setActivePalette("midnight" | "daylight")`.

---

## Clock States — Key Decision

All 8 clock state components (`black-hole`, `constellation-map`, `waveform-pulse`, `topographic-contours`, `radar`, `wireframe-globe`, `particle-drift`, `pendulum`) hardcode:
- Container: `className="absolute inset-0 bg-black"`
- Canvas drawing: `rgba(255,255,255,...)` for all lines/particles/text
- Text overlays: `text-white` or `className="... text-white"`

**Recommendation: Clock stays dark regardless of app theme (option b).**

Reasoning:
- The clock states are generative art. They are designed as dark canvas art pieces with glowing white elements. Inverting them would require rewriting canvas drawing logic across 8 files.
- The art is the product. Its aesthetic identity is the dark/space aesthetic.
- A wall-mounted panel in "light mode" during the day should still show beautiful black-canvas art when idle.
- This is the least implementation risk and the most intentional design choice.
- The clock overlay is fullscreen — when the clock is active, the app theme is invisible anyway.

**Implementation:** no changes to clock state files. They already have `bg-black` hardcoded and will stay that way.

---

## Persistence

Currently: `localStorage.getItem("theme-mode")` on store init (read-only).
After fix: `setActivePalette` writes back to `localStorage`.
Future: migrate to API config endpoint (noted in task description, not in scope here).

---

## Toggle UI

The toggle will live in the settings card (separate concern). For this issue, the core toggle mechanism is:
- `useThemeStore().setActivePalette("midnight")` or `setActivePalette("daylight")`
- Can be exposed as a helper: `toggleTheme()` that flips between the two

---

## TDD Plan

**Failing tests first:**

1. `theme-store.test.ts` — test that `setActivePalette` persists to localStorage
2. `theme-store.test.ts` — test pure-black/white values on midnight and daylight palettes
3. `theme-provider.test.tsx` — test CSS vars are set correctly on palette change
4. `bento-card.test.tsx` — verify border color logic for both themes

**Then implement.**

---

## Files to Change

- `apps/web/src/stores/theme-store.ts` — update palette color values, fix localStorage persistence in `setActivePalette`
- `apps/web/src/__tests__/` — new test file for theme store

**No changes to:**
- `globals.css` — static defaults, runtime override handles it
- Clock state files — stay dark intentionally
- `theme-provider.tsx` — already correct
- `bento-card.tsx` — logic already correct
