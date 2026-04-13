# Clock Fixes Plan

## Fix 1: TopographicContours edge behavior

**Problem:** The noise grid is sized as `Math.ceil(w / GRID_CELL_SIZE) + 1` cols/rows, but the contour lines start at pixel 0 and the cells extend to `col * GRID_CELL_SIZE` which can go up to `(cols-1) * GRID_CELL_SIZE` — potentially beyond the canvas. The issue is the grid starts at pixel 0 and goes right to the edge, so marching squares cells that straddle the canvas boundary have interpolated edge points that may land exactly on or outside the boundary. These segments look "broken" because the canvas clips them mid-stroke without any visual fade.

**Fix: fade contour lines near boundaries using `save()/clip()/restore()` and/or a gradient mask.**

The simplest correct fix is to apply a `ctx.save()` + `ctx.beginPath()` clip rect inset by a few pixels, then render all contours inside that clip. But that just clips without fading.

Better: after drawing contours, apply a radial/linear gradient overlay on top (or use `destination-in` composite) to fade out at all 4 edges. This gives a soft fade rather than a hard clip.

**Approach:** Add a fade-out vignette after contour drawing. Specifically:
- After all contour strokes, draw 4 linear gradient rects (top, bottom, left, right) with composite mode `destination-out` going from `rgba(0,0,0,1)` at the edge to `rgba(0,0,0,0)` inward. This masks the canvas alpha to fade strokes that hit the edges.
- Fade width: ~3 cells (84px) so lines have room to taper.

This is purely additive to the draw loop — no structural changes needed.

**Tests:** Add a test asserting `save` and `restore` are called (or that the gradient path is exercised). Existing tests still pass since they mock ctx.

## Fix 2: Clock card border

**Problem:** Clock card `colorScheme.border` is `""` (empty string) in `register-cards.ts`. BentoCard falls back to `rgba(255,255,255,0.08)` (midnight) or `rgba(0,0,0,0.06)` (daylight) when border is empty. This is nearly invisible.

**Fix:** Set a bold, visible border on the clock card. Since the clock is the centrepiece and has a dark art-clock background, use a white/neutral border with higher opacity. Example: `border-white/20` (Tailwind) or a specific color. Since BentoCard checks `colorScheme?.border ? undefined : fallback` — if we provide a Tailwind border class it uses that class and skips the inline borderColor.

**Specific change in `register-cards.ts`:**
```ts
colorScheme: { bg: "", accent: "#fafafa", border: "border-white/25" }
```

This gives a visible 1px white border at 25% opacity — subtle but clearly more prominent than the 8% fallback.

**Tests:** Add/update card-registry test asserting clock card border is not empty string.

## Implementation order

1. Fix topographic edge fade (draw loop change)
2. Fix clock border (register-cards.ts one-liner)
3. Tests for both
4. lint + typecheck + test
5. Commit + push
