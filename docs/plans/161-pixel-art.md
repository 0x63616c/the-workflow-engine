# Plan: Pixel Art Clock State (#161)

## Design choice

Pixel cityscape with a slowly scrolling parallax skyline. Two layers:
- **Background**: distant buildings (small, slow scroll left)
- **Foreground**: closer buildings (taller, faster scroll left)

Both rendered strictly on an 8px grid. Pure black and white (fillStyle `#ffffff` on `#000000`). No grays, no anti-aliasing on grid-snapped shapes.

Random animated details to make it feel alive:
- Windows that blink on/off on a slow cycle
- A pixelated moon (full circle, 8px radius) drifting slowly across the sky
- Stars (single pixel dots) twinkling (random toggling)

Time displayed using a hand-drawn pixel bitmap font. Each digit is a 5×7 grid of pixels drawn as 4px squares. Colon is 2 dots. AM/PM and date rendered in the same font at smaller scale (2px squares).

## File plan

| File | Action |
|------|--------|
| `apps/web/src/components/art-clock/states/pixel-art.tsx` | Create |
| `apps/web/src/__tests__/states/pixel-art.test.tsx` | Create |
| `apps/web/src/components/art-clock/clock-state-carousel.tsx` | Add import + push to CLOCK_STATES array |
| `apps/web/src/stores/navigation-store.ts` | Bump CLOCK_STATE_COUNT from 9 to 10 |
| `apps/web/src/__tests__/navigation-store.test.ts` | Update count assertion from 9 to 10 |

## Component structure

```tsx
export function PixelArt() {
  // useCurrentTime(1000)
  // formatTime / formatDate
  // canvas + rAF loop
  // returns: <div bg-black> <canvas data-testid="pixel-art-canvas"> + <div data-testid="pixel-art-time-overlay">
}
```

The time overlay is drawn **on the canvas itself** (not a DOM overlay) to keep the pixel aesthetic consistent. The DOM overlay div is rendered empty but present with the testid so existing test patterns still apply.

Actually — looking at other states, they overlay time via DOM with system fonts. For this state the pixel font is the whole point, so the time will be drawn directly onto the canvas. The `data-testid="pixel-art-time-overlay"` div will still be present (invisible, pointer-events none) to satisfy the smoke test pattern.

## Canvas rendering approach

1. **Grid constant**: `CELL = 4` (4px per pixel-art pixel)
2. **Pixel-art fill helper**: `fillPixel(ctx, gx, gy)` — draws a `CELL×CELL` rect at `(gx*CELL, gy*CELL)`
3. **Bitmap font**: `DIGITS` object maps `'0'–'9'`, `':'`, `'A'`, `'M'`, `'P'` to 5×7 boolean arrays. `drawText(ctx, str, gx, gy, scale)` renders each char.
4. **Cityscape**: deterministic per-seed building arrays (heights/widths) generated once at init. Each frame, x offset is updated and buildings drawn with window grids.
5. **Sky elements**: moon position increments slowly; star array is fixed positions with toggling visibility.
6. **`ctx.imageSmoothingEnabled = false`** to prevent any blurring.

## TDD order

1. Write failing smoke test (renders, has canvas, has overlay div, rAF called)
2. Create minimal `PixelArt` component that passes smoke test
3. Register in carousel (bump count)
4. Confirm all existing tests still pass

## What is NOT being done

- No grays or transparency effects on drawn shapes
- No React Three Fiber (canvas 2D only)
- No external font loading (font drawn as bitmap)
- No DOM time overlay (time is on-canvas only; empty overlay div kept for test compatibility)
