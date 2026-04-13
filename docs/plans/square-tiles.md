# Plan: Square Bento Grid Tiles

## Current State

**widget-grid.tsx** renders a CSS Grid with:
```css
gridTemplateColumns: "repeat(6, 1fr)"
gridTemplateRows: "repeat(4, 1fr)"
```

The grid container has `h-full` — meaning row height is determined by the viewport height divided by 4. Column width is viewport width divided by 6. On a 4:3 device (2732x2048), columns are narrower than rows — so 1x1 tiles come out taller than wide.

**card-registry.ts** defines 12 cards with explicit `gridColumn`/`gridRow` spans:
- 2x2: clock (`3/5, 1/3`), weather (`1/3, 1/3`)
- 2x1 (wide): countdown (`5/7, 1/2`), photo (`5/7, 2/3`), quote (`1/3, 4/5`)
- 1x1: wifi, lights, music, calendar, email, system, theme

Row 4 only has quote (cols 1-2) and theme (col 3). Cols 4-6 row 4 are empty. Row 3 col 4-6 is populated (calendar, email, system). **No placeholder cells currently exist.**

## Assumptions

### Non-technical
- Perfect squares means pixel-perfect 1:1 aspect ratio, not "close enough"
- Scrolling is acceptable — grid may overflow viewport vertically
- Placeholders are subtle fills (not interactive cards) for empty grid positions
- Larger tiles maintain proportion: 2x1 = 2:1 wide, 2x2 = 1:1 (same as base square)

### Technical
- The fix lives entirely in `widget-grid.tsx` (grid container styles)
- `card-registry.ts` does NOT need to change — grid positions stay the same
- CSS approach: drop `gridTemplateRows: "repeat(4, 1fr)"` and use `grid-auto-rows` calculated from column width
- Column width = `(containerWidth - padding*2 - gap*5) / 6`
- Row height = column width (makes 1x1 square)
- Container switches from `h-full` (fixed height) to `min-h-full` (can grow)
- Placeholder cells: rendered as a background grid of 6x4 empty divs, positioned behind the real cards using CSS Grid stacking or absolute positioning

### Placeholder approach
Two options:
1. **CSS Grid background cells** — render 24 `<div>` elements in the same grid before the real cards, with `z-index` layering. Simpler, pure CSS/HTML.
2. **Computed empties** — compute which cells are empty from `CARD_CONFIGS`, render placeholder divs only there. More surgical but requires span arithmetic.

Option 1 is simpler and robust to layout changes.

## Implementation Plan

### 1. Switch grid to square rows via CSS custom property

In `widget-grid.tsx`, replace the inline `gridTemplateRows` with a dynamic row height derived from the grid's rendered column width:

```tsx
// Use a ref + ResizeObserver OR pure CSS with aspect-ratio on the grid cells
```

**Best CSS approach:** Remove fixed `gridTemplateRows`. Add `aspect-ratio: 1` to each grid cell wrapper. CSS Grid will then set row height equal to column width automatically when `grid-auto-rows` is set to match.

Actually the cleanest approach for CSS Grid square cells:
- Keep `gridTemplateColumns: "repeat(6, 1fr)"`
- Remove `gridTemplateRows` (let it auto-size)
- Wrap each card in a `<div>` that has `aspect-ratio: 1` and `grid-column`/`grid-row` applied
- The grid auto-row height will follow the tallest cell in each row, which will be the square cells

Wait — multi-span cells complicate this. A 2x2 cell with `aspect-ratio: 1` would try to be square relative to its 2-column width, which is correct (2 units wide = 2 units tall). But CSS Grid can't enforce this directly via `aspect-ratio` on items without fixing the row height externally.

**Most reliable approach: JS ResizeObserver on grid container**
- Measure rendered container width
- Subtract padding (`p-5` = 20px each side = 40px) and gaps (`gap-3` = 12px * 5 gaps = 60px)
- `cellSize = (containerWidth - 40 - 60) / 6`
- Set `gridAutoRows: cellSize + "px"` in state
- Container: `min-h-full` instead of `h-full` so it can grow

This is deterministic, simple, and works for all span sizes.

### 2. Placeholder cells

Render 24 placeholder divs (6 cols x 4 rows) at the start of the grid, each occupying one grid cell:

```tsx
{Array.from({ length: 24 }, (_, i) => {
  const col = (i % 6) + 1;
  const row = Math.floor(i / 6) + 1;
  return (
    <div
      key={`placeholder-${i}`}
      className="rounded-2xl border border-white/[0.03] bg-white/[0.01]"
      style={{ gridColumn: `${col} / ${col + 1}`, gridRow: `${row} / ${row + 1}` }}
      aria-hidden
    />
  );
})}
```

Real cards use higher z-index (or natural DOM order stacking) to render on top. Since CSS Grid places items in explicit positions, real cards will overlap placeholder cells automatically — no z-index needed if real cards come after in DOM order.

### 3. Remove `h-full` from grid container

Change `h-full` to `min-h-full` so the grid can grow if `cellSize * 4 rows > viewport height`. The outer `div` in `HomePage` and `WidgetGrid` also needs `min-h-full`.

### Files to change

- `apps/web/src/components/hub/widget-grid.tsx` — grid styles + placeholder cells + ResizeObserver
- `apps/web/src/routes/index.tsx` — `h-full` → `min-h-full` on outer div if needed

### Tests

- Unit test: ResizeObserver calculates correct `cellSize` for given container width
- Unit test: placeholder cells render (24 divs with `aria-hidden`)
- Existing widget-grid tests should still pass (hub-container, widget-grid testIds exist)

## Risk

- ResizeObserver adds a render cycle (flicker on first paint) — mitigate with a sensible default (e.g. assume 1024px wide initially)
- Safari/WKWebView ResizeObserver support: fully supported in all modern versions, no concern
