# Plan: Conway's Game of Life Clock State (#162)

## Overview

Add a new art clock state: Conway's Game of Life running on a canvas background with time overlaid.

---

## Pattern Analysis (from existing states)

All clock states follow the same structure:

- React functional component, `useEffect` for canvas lifecycle
- `canvasRef` + `rafRef` (requestAnimationFrame loop)
- `resize()` inside effect: sets canvas dimensions at DPR, re-seeds state
- `draw()` inside effect: called via `requestAnimationFrame`, clears and redraws each frame
- Cleanup: `cancelAnimationFrame` + `removeEventListener`
- Time via `useCurrentTime(CLOCK_UPDATE_INTERVAL_MS)` + `formatTime`/`formatDate` from `art-clock`
- Time overlay: absolute-positioned `div` with `pointerEvents: none`, centered, GeistMono font
- `data-testid` on canvas and overlay elements for tests
- Black background via `className="absolute inset-0 bg-black"`

Tests follow a standard smoke pattern:
- Mock `canvas.getContext` to return a mock ctx object
- Mock `requestAnimationFrame` / `cancelAnimationFrame`
- Assert: renders without throwing, canvas element exists, rAF called on mount, cancelled on unmount, time overlay present

---

## Implementation Plan

### 1. Constants

```
CELL_SIZE_PX = 5           // cells per pixel, gives ~546x409 grid on 2732x2048
GENERATION_INTERVAL_MS = 80  // ~12.5 gen/s
STAGNATION_CHECK_GENERATIONS = 30  // check every 30 gens
STAGNATION_THRESHOLD = 5   // re-seed if population unchanged for 5 consecutive checks
MIN_POPULATION = 50         // re-seed if population falls below this
CLOCK_UPDATE_INTERVAL_MS = 1000
```

### 2. Grid State

- `Uint8Array` for `gridRef` and `nextGridRef` — double-buffer pattern
- Grid dimensions: `cols = ceil(width / CELL_SIZE_PX)`, `rows = ceil(height / CELL_SIZE_PX)`
- Stored flat: `index = row * cols + col`

### 3. Seeding

Random seed on init and re-seed: ~30% cell density, scattered with some known patterns (R-pentomino, glider gun fragments) placed randomly for visual interest. Simplest: pure random fill at ~30% density — produces Methuselahs naturally.

### 4. Simulation Loop

- `lastGenTime` tracked in ref
- In `draw()`: if `elapsed - lastGenTime >= GENERATION_INTERVAL_MS`, step one generation
- Step: iterate all cells, count 8-neighbor live count, apply classic rules to `nextGrid`, swap buffers

### 5. Stagnation Detection

- `populationRef` tracks live cell count each generation
- `stagnationCountRef` increments when population matches last check
- After `STAGNATION_CHECK_GENERATIONS` generations, compare — if stagnated for `STAGNATION_THRESHOLD` cycles, re-seed
- Also re-seed if population < `MIN_POPULATION`

### 6. Rendering

- `ctx.fillStyle = "black"` fill entire canvas each frame (or `clearRect`)
- Draw all live cells as white filled rects: `ctx.fillRect(col * CELL_SIZE_PX, row * CELL_SIZE_PX, CELL_SIZE_PX - 1, CELL_SIZE_PX - 1)` (1px gap between cells for grid feel)
- DPR handled via `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`

### 7. Time Overlay

Same pattern as Radar/ParticleDrift: centered absolute div, pointerEvents none.
- Large hours:minutes, period superscript, date below
- `data-testid="game-of-life-time-overlay"`

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `apps/web/src/components/art-clock/states/game-of-life.tsx` | Create |
| `apps/web/src/__tests__/states/game-of-life.test.tsx` | Create |
| `apps/web/src/components/art-clock/clock-state-carousel.tsx` | Add import + push to `CLOCK_STATES` array |
| `apps/web/src/stores/navigation-store.ts` | Increment `CLOCK_STATE_COUNT` from 9 to 10 |

---

## TDD Order

1. Write `game-of-life.test.tsx` (smoke tests — render, canvas, rAF, overlay)
2. Run tests — expect failure (component doesn't exist)
3. Implement `game-of-life.tsx`
4. Run tests — all pass
5. Register in carousel + bump count
6. Run full test suite

---

## Commit Plan

1. `test: add smoke tests for GameOfLife clock state`
2. `feat: implement Conway's Game of Life clock state`
3. `feat: register GameOfLife in clock state carousel`
