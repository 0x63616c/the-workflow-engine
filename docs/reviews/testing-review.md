# Testing Strategy & Coverage Review

_Date: 2026-04-12_

---

## Test Suite Health

| Metric | Result |
|--------|--------|
| Web test files | 40 |
| Web tests | 242 passing |
| API test files | 8 passing, 1 failing |
| API tests | 68 passing |
| Total failures | 1 file (countdown-events.test.ts) |
| Duration | ~8s total |

**The one failure** is a hard crash in `apps/api/src/__tests__/countdown-events.test.ts`:

```
Error: Cannot find package 'pg' imported from drizzle-orm/node-postgres/driver.js
```

The test requires a live Postgres connection and the `pg` package is not installed in this environment (the project migrated from SQLite to Postgres and `pg` was never added as a dev dependency, or the test DB is simply not running). This failure will also block CI if `DATABASE_URL` is not set.

**Warnings (non-fatal):**
- `Three.js multiple instances` warning in several web tests (cosmetic, from jsdom loading Two.js via separate import paths)
- `act(...)` warning on `WifiCard` in `card-expand-behavior` and `widget-grid` tests (async state update not wrapped in `act`)
- `--localstorage-file` warning from jsdom (missing path, cosmetic)
- `wireframe-globe` tests emit dozens of React lowercase-tag warnings due to Three.js custom renderer elements not being polyfilled in jsdom

---

## Test Inventory

### API (`apps/api/src/__tests__/`)

| File | What it tests | Quality |
|------|--------------|---------|
| `health.test.ts` | `/health.ping` response shape | Good |
| `env.test.ts` | Zod env schema parsing + validation | Good |
| `integrations/homeassistant.test.ts` | HA HTTP client: fetch, auth headers, error wrapping, singleton | Good |
| `integrations/ha-types.test.ts` | HA type schemas (Zod) | Good |
| `services/ha-service.test.ts` | Lights, media player mapping, commands, volume | Good |
| `services/ha-service-climate.test.ts` | Climate entity parsing, fan detection, fan commands | Good |
| `routers/devices.test.ts` | tRPC devices router (lights, media players) | Good |
| `routers/devices-climate.test.ts` | tRPC climate/fan router | Good |
| `countdown-events.test.ts` | Schema, service, router for countdown events — needs live Postgres | **Failing** |

### Web (`apps/web/src/__tests__/`)

| File | What it tests | Quality |
|------|--------------|---------|
| `app.test.tsx` | Placeholder: only validates Zod import | Poor |
| `card-registry.test.ts` | Card config data, grid positions, `getCardConfig` | Good |
| `card-expansion-store.test.ts` | Zustand store: expand/contract actions | Good |
| `navigation-store.test.ts` | Zustand navigation + clock state index | Good |
| `theme-store.test.ts` | Theme palette registration, switching, invalid ID | Good |
| `timer-store.test.ts` | Timer state machine (start, pause, resume, tick, done) | Excellent |
| `art-clock.test.tsx` | `formatTime`, `formatDate` utils + `ArtClock` render | Good |
| `clock-state-carousel.test.tsx` | Carousel renders correct state per index, indicator dots | Good |
| `state-indicator-dots.test.tsx` | Dot opacity/active state at each index | Good |
| `states/wireframe-globe.test.tsx` | Renders without crash | Minimal |
| `states/constellation-map.test.tsx` | Renders, accepts time prop | Minimal |
| `states/topographic-contours.test.tsx` | Renders without crash | Minimal |
| `states/black-hole.test.tsx` | Renders without crash | Minimal |
| `states/pendulum.test.tsx` | Renders without crash | Minimal |
| `states/particle-drift.test.tsx` | Renders without crash | Minimal |
| `states/radar.test.tsx` | Renders without crash | Minimal |
| `states/waveform-pulse.test.tsx` | Renders without crash | Minimal |
| `bento-card.test.tsx` | Card renders, click handler, styles | Good |
| `card-overlay.test.tsx` | Overlay shows/hides per store state, close button | Good |
| `card-expand-behavior.test.tsx` | Each card sets correct expanded ID, grid positions | Good |
| `widget-grid.test.tsx` | Grid layout, all cards present | Good |
| `home-page.test.tsx` | HomePage renders widget-grid | Minimal |
| `home-page-hub.test.tsx` | Idle timeout auto-expands clock, overlay interaction | Good |
| `route-index.test.tsx` | Route renders without crash | Minimal |
| `use-idle-timeout.test.ts` | Timer fires, resets on touch, disabled, cleanup | Excellent |
| `use-timer.test.ts` | Interval tick, pause/resume, done detection | Good |
| `use-current-time.test.ts` | Returns `Date`, updates on interval | Good |
| `use-lights.test.ts` | Loading/success/error states, turn on/off | Good |
| `use-sonos.test.ts` | Players, activeSpeaker selection, commands, error | Good |
| `use-climate.test.ts` | Climate data, fan commands, error states | Good |
| `lights-card.test.tsx` | Count display, buttons, error/loading states | Good |
| `climate-card.test.tsx` | Temp display, fan toggle, error/loading states | Good |
| `timer-card.test.tsx` | Timer card display states | Good |
| `timer-panel.test.tsx` | Timer panel controls | Good |
| `music-card.test.tsx` | Music card display | Good |
| `sonos-panel.test.tsx` | Track info, controls, speaker list, volume | Good |
| `sonos-sub-components.test.tsx` | SonosControls, SpeakerList, ProgressBar sub-components | Good |
| `countdown-card.test.tsx` | Countdown card render + tRPC mock | Good |
| `placeholder-cards.test.tsx` | Email, photo, quote, system-status render without crash | Minimal |
| `theme-provider.test.tsx` | CSS variables applied, palette switching | Good |

---

## Coverage Gaps

### Priority 1 — Blocked / Broken

**1. `countdown-events.test.ts` is entirely skipped due to missing `pg` package.**
The test is the only one with real DB integration (Postgres). Fix: add `pg` to `apps/api` devDependencies and ensure the test database runs in CI. Or accept that countdown events are only tested by the migration that already runs in CI.

**2. `WifiCard` act() warning is a latent bug.**
An async state update in `WifiCard` is not wrapped in `act`. This causes a React warning on every run. It won't fail tests today but is a signal of a real async state update happening outside test awareness.

### Priority 2 — Untested API surface

**3. No Inngest function tests.**
`apps/api/src/inngest/client.ts` is only a thin client wrapper, so there are no functions yet. Low risk now but any future Inngest functions should have tests from the start.

**4. No `server.ts` integration test.**
The HTTP server boot path (static serving, route registration, Inngest handler) is untested. A smoke test hitting `GET /health` via `fetch` would catch wiring regressions.

**5. No countdown-events router test independent of Postgres.**
The countdown events router is only tested in `countdown-events.test.ts` which requires a live DB. A mock-service version (like devices router tests) would provide basic coverage without a DB dependency.

### Priority 3 — Thin/missing frontend tests

**6. Art clock states are smoke-tested only (7 of 8 states).**
Each state file has tests that only verify "renders without throwing" and "renders a canvas element." There are no behavioral assertions (animation props, time display, WebGL mock checks). Acceptable for canvas-heavy components but worth noting.

**7. `app.test.tsx` is a non-test.**
It only tests that Zod can parse a schema. It doesn't test the `app.tsx` component at all. The component should at minimum render without crashing.

**8. Hooks `use-auto-reload`, `use-build-hash`, `use-debounced-callback`, `use-swipe` have no tests.**
- `use-debounced-callback` is utility logic that is straightforward to unit test.
- `use-swipe` is used by the carousel and has no coverage.
- `use-auto-reload` and `use-build-hash` are side-effect hooks; their behavior should at minimum be smoke-tested.

**9. Placeholder cards (`email-card`, `photo-card`, `quote-card`, `system-status-card`) have only smoke tests.**
Acceptable as stubs but annotate as such to avoid confusion.

**10. `CardOverlay` expanded view rendering is not tested by card type.**
`card-overlay.test.tsx` verifies the overlay opens/closes and renders a generic container, but doesn't verify that the correct expanded component (e.g. SonosPanel for music, TimerPanel for timer) is rendered per card ID.

**11. No E2E tests.**
No browser automation tests exist. The CLAUDE.md requires browser automation for all UI tasks, but there is no persistent E2E suite. Any E2E verification happens only during development sessions.

### Priority 4 — Test quality issues

**12. Over-mocking pattern in hook tests.**
`use-lights`, `use-sonos`, `use-climate` all mock the entire `trpc` object. This is appropriate to avoid needing a running server, but the mock shape is not validated against the actual tRPC type. If the router API changes, the hook tests could continue to pass while the hook breaks. Consider using `@trpc/react-query`'s testing utilities or a typed factory to keep mock shapes in sync.

**13. Vitest configs have no coverage reporting.**
Neither `apps/web/vitest.config.ts` nor `apps/api/vitest.config.ts` configures `coverage`. Without it, there is no CI-enforced coverage floor and no visibility into which branches are untested.

**14. API router tests only test happy path for some procedures.**
`devices.lightsOn` and `devices.lightsOff` don't test the `HaError` path. Minor, but inconsistent with the pattern in `devices.lights` and `devices.mediaPlayers`.

---

## Recommended Strategy Improvements

### Immediate fixes

1. **Fix `countdown-events.test.ts`** — add `pg` to devDependencies and add a CI job or docker-compose service for the test DB. Or split into a mock-based router test (always runs) and an integration test (runs only when `DATABASE_URL` is set).

2. **Fix `WifiCard` act() warning** — wrap the async state-triggering render in `act()` in the relevant tests.

3. **Replace `app.test.tsx`** — test that `<App />` renders without crashing (needs a basic tRPC/QueryClient provider wrapper).

### Config improvements

4. **Add coverage config** to both vitest configs:

```ts
// vitest.config.ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html"],
    thresholds: { lines: 70, functions: 70, branches: 60 },
  }
}
```

5. **Suppress or fix Three.js jsdom warnings** in wireframe-globe tests — add a `beforeAll` that suppresses `console.error` for known false-positive messages, keeping test output clean.

### New tests to write

**`use-swipe.test.ts`** — the carousel navigation depends on swipe gestures:
```ts
it("calls onSwipeLeft when pointer moves left beyond threshold", () => {
  const onSwipeLeft = vi.fn();
  const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight: vi.fn() }));
  // simulate pointerdown/pointermove/pointerup
  expect(onSwipeLeft).toHaveBeenCalled();
});
```

**`use-debounced-callback.test.ts`**:
```ts
it("debounces calls within delay window", () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const { result } = renderHook(() => useDebouncedCallback(fn, 300));
  result.current();
  result.current();
  vi.advanceTimersByTime(299);
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledOnce();
});
```

**`card-overlay.test.tsx` expanded view routing**:
```ts
it("renders SonosPanel when music card is expanded", () => {
  useCardExpansionStore.setState({ expandedCardId: "music" });
  render(<CardOverlay />);
  // assert SonosPanel content is present
});
```

**`countdown-events.router.test.ts` (mock-based fallback)**:
```ts
// Duplicate the router test pattern from devices.test.ts
// Mock the countdown-events service, test router validation and error handling
// without requiring Postgres
```

---

## Infrastructure Improvements

| Item | Current state | Recommendation |
|------|--------------|----------------|
| Coverage reporting | Not configured | Add v8 coverage + thresholds to both vitest configs |
| Test DB in CI | Not running (countdown tests fail) | Add Postgres service container to CI workflow |
| E2E suite | None | Add a Playwright config with 2-3 smoke tests (renders, clock auto-expands, timer flow) |
| Three.js jsdom noise | Dozens of spurious console errors per test run | Mock `@react-three/fiber` canvas in test setup |
| `--localstorage-file` warning | Every web test run | Pass a valid temp path in vitest.config.ts or suppress warning |
