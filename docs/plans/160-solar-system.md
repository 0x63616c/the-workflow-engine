# Plan: Solar System Clock State (#160)

## Overview

A new art clock state showing the solar system with all 8 planets at their real current orbital positions around the sun. Black and white, Canvas 2D, smooth real-time animation.

---

## Non-Technical Assumptions

- Black background, white-only elements (consistent with other clock states)
- Orbital radii are stylized (not to scale) so all planets are visible simultaneously
- Time display stays visible over the canvas (same pattern as Radar, ParticleDrift)
- Animation is accelerated so orbital movement is visually apparent (not real speed)
- Planet positions are calculated from real Keplerian orbital elements relative to current date
- Clean, minimal aesthetic — no labels, no color, no sci-fi flourishes

---

## Detailed Technical Assumptions

### Keplerian orbital position

- Each planet has a known orbital period and mean anomaly at epoch (J2000)
- Mean anomaly at time T: `M(T) = M0 + (2π / period_days) * days_since_J2000`
- For near-circular orbits (all 8 planets), mean anomaly ≈ true anomaly (error < 2°)
- J2000 epoch = January 1, 2000, 12:00 TT ≈ `new Date('2000-01-01T12:00:00Z')`
- No external library needed — pure math

### Orbital spacing

- Logarithmic spacing: `r_display = baseRadius * log(1 + planet_index) / log(9)`
- Ensures Mercury and Neptune are both visible
- Sun radius: ~6px, planet dots: ~3–4px, orbit ring line width: 0.5px

### Animation

- `requestAnimationFrame` loop (same as Radar/ParticleDrift)
- Time base: `Date.now()` for real current planetary angles
- Speed multiplier: ~50,000× real time so orbital motion is visibly animated
- Canvas sized to `window.innerWidth × window.devicePixelRatio` (same DPR handling as existing states)

### Time display

- Same overlay pattern as Radar: `data-testid="solar-system-time-overlay"` div centered over canvas
- `formatTime` and `formatDate` imported from `art-clock.tsx`
- `useCurrentTime(1000)` for 1s tick

### Files

| File | Action |
|---|---|
| `apps/web/src/components/art-clock/states/solar-system.tsx` | Create |
| `apps/web/src/__tests__/states/solar-system.test.tsx` | Create |
| `apps/web/src/components/art-clock/clock-state-carousel.tsx` | Edit — add import + append to `CLOCK_STATES` |
| `apps/web/src/stores/navigation-store.ts` | Edit — increment `CLOCK_STATE_COUNT` from 9 to 10 |

---

## Plain English: What's Being Built

A canvas-based clock state where the sun sits at the center, 8 thin white rings mark the orbits, and 8 white dots represent planets rotating around the sun at their actual current orbital angles (calculated from real Keplerian data). The animation runs at 50,000× real speed so you can see the inner planets visibly moving. The current time and date are displayed as a centered overlay, same layout as the Radar state.

---

## TDD Approach

Write `solar-system.test.tsx` first with:
1. Renders without throwing
2. Has `data-testid="solar-system-canvas"`
3. Calls `requestAnimationFrame` on mount
4. Calls `cancelAnimationFrame` on unmount
5. Has `data-testid="solar-system-time-overlay"`

Then implement to make tests pass.

---

## Orbital Data (J2000 mean elements)

| Planet | Period (days) | M0 at J2000 (deg) |
|---|---|---|
| Mercury | 87.969 | 174.796 |
| Venus | 224.701 | 50.115 |
| Earth | 365.256 | 357.517 |
| Mars | 686.971 | 19.412 |
| Jupiter | 4332.59 | 20.020 |
| Saturn | 10759.22 | 317.020 |
| Uranus | 30688.5 | 142.238 |
| Neptune | 60182.0 | 256.228 |
