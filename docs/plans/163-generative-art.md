# Plan: Generative Art Clock States (#163)

## States to Build

### 1. Flow Field (`flow-field.tsx`)
Particles following a Perlin-noise-inspired flow field. Hundreds of short-lived
particles stream across the canvas guided by a slowly-rotating vector field
computed from layered sine/cosine functions (no external noise library needed).
Trails fade out as they age, producing organic ink-like streaks.

Distinct from existing states because: no points/dots structure (particle-drift),
no circular geometry (radar/black-hole), continuous flowing lines not connected
graph edges.

Time overlay: centred, large, font-weight 100, white on black — same style as
particle-drift.

### 2. Lissajous Curves (`lissajous.tsx`)
A harmonograph: multiple overlapping parametric curves drawn with very high
point-count, accumulating over time into a dense interference pattern. The
frequency ratio drifts slowly so the figure evolves continuously — never
looping exactly, always changing.

Each frame adds a new thin-stroke layer; a very slow fade (`fillRect` with low
alpha) keeps the canvas from saturating while preserving history.

Distinct from existing states because: pure geometric mathematics, no particles,
no terrain/map metaphor, produces spiro-graph / rose-curve aesthetics.

Time overlay: bottom-centre or top, small tracking-widest date below, so the
curves can fill the canvas without competing with the clock.

---

## Implementation Pattern (per state)

All existing states follow the same structure — mirroring it exactly:

```
import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

export function StateName() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  useEffect(() => {
    // canvas setup + resize + draw loop
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener(...) };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="{name}-canvas" className="absolute inset-0" />
      <div data-testid="{name}-time-overlay" ...>
        {/* time + date */}
      </div>
    </div>
  );
}
```

## Test Pattern (per state)

Smoke tests only (matching all existing state tests):
- renders without throwing
- renders canvas element (by testid)
- calls requestAnimationFrame on mount
- calls cancelAnimationFrame on unmount
- renders time overlay (by testid)

mockCtx mocks all canvas 2D methods used by the state.

## Registration

`navigation-store.ts` exports `CLOCK_STATE_COUNT = 9`. Adding 2 states means
bumping to `11`.

`clock-state-carousel.tsx` `CLOCK_STATES` array: append `FlowField` and
`Lissajous` (import + push).

## File Checklist

- [ ] `apps/web/src/components/art-clock/states/flow-field.tsx`
- [ ] `apps/web/src/components/art-clock/states/lissajous.tsx`
- [ ] `apps/web/src/__tests__/states/flow-field.test.tsx`
- [ ] `apps/web/src/__tests__/states/lissajous.test.tsx`
- [ ] `apps/web/src/stores/navigation-store.ts` — bump CLOCK_STATE_COUNT to 11
- [ ] `apps/web/src/components/art-clock/clock-state-carousel.tsx` — register both

## Order of Work

1. Write failing tests for flow-field
2. Implement flow-field — tests green
3. Commit
4. Write failing tests for lissajous
5. Implement lissajous — tests green
6. Commit
7. Register both in carousel + bump count
8. Run full test suite
9. Commit + push
10. Open PR
</content>
</invoke>