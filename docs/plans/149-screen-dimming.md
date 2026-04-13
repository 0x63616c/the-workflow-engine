# Plan: Screen Dimming on Idle (#149)

## Non-Technical Assumptions

1. Dim to 20% after 60 seconds of inactivity (separate from the 45s clock expansion).
2. Any touch anywhere on screen immediately restores brightness to 100%.
3. In a web browser (non-Capacitor), dimming silently does nothing — no error, no fallback UI.
4. Both the dim timeout and the target brightness are configurable via the Settings card Display section.
5. Clock expansion still happens at 45s (unchanged). Screen dimming is additive, not a replacement.

## Technical Assumptions

1. **`@capacitor/screen-brightness` is not installed** — it is absent from `apps/web/package.json`. Must be added.
2. **Capacitor plugin import pattern**: Use a dynamic `import()` inside the hook body, guarded by `Capacitor.isNativePlatform()` from `@capacitor/core`. This avoids native module errors in the web browser during dev/test.
3. **Config keys** (consistent with existing `display.idleTimeout_MS` naming):
   - `display.dimTimeout_MS` — idle duration before dimming (default: `60_000`)
   - `display.dimBrightness` — fractional target brightness (default: `0.2`)
4. **New hook `useScreenDimming`** in `apps/web/src/hooks/use-screen-dimming.ts` — keeps screen-brightness concerns separate from clock-expansion concerns.
5. **Mounted in `WidgetGrid`** alongside the existing `useIdleTimeout` call, so both timers share the same "user activity = touchstart" reset lifecycle.
6. **Touch restore lifecycle**: The hook attaches a `touchstart` listener on `document` that calls `setBrightness(1.0)` and resets the dim timer. This is separate from the existing `useIdleTimeout` listener (both can coexist — `useIdleTimeout` only resets the clock timer, `useScreenDimming` resets the dim timer).
7. **Always-restore on unmount**: On hook cleanup, restore brightness to 1.0 so navigation away from the page doesn't leave the screen dimmed.
8. **No `enabled` option needed**: Screen dimming is always on (there is no equivalent "a card is expanded" guard — dimming should work even when the clock card is open).
9. **Test strategy**:
   - Unit test `useScreenDimming` with fake timers, mocking `@capacitor/screen-brightness` and `@capacitor/core`.
   - Assert dim is called after `dimTimeout_MS`, restore is called on touch, restore is called on unmount.
   - No visual/E2E needed for brightness (no visible DOM change to assert).

## What Is Being Built

A new `useScreenDimming` hook that:

1. Installs `@capacitor/screen-brightness` via bun.
2. Starts a timer for `dimTimeout_MS` (default 60s, config-driven).
3. On timer expiry: calls `ScreenBrightness.setBrightness({ brightness: dimBrightness })` only if on a native Capacitor platform.
4. On any `touchstart`: restores brightness to 1.0 and resets the timer.
5. On unmount: restores brightness to 1.0.
6. Reads `display.dimTimeout_MS` and `display.dimBrightness` from `useAppConfig`.

The hook is added to `WidgetGrid` (same component that already owns `useIdleTimeout`).

The Settings card Display section gains two new read-only rows showing the configured values (matching the existing pattern of the idle timeout row). No interactive controls yet — that is scope for a follow-up.

## Files Changed

| File | Change |
|------|--------|
| `apps/web/package.json` | Add `@capacitor/screen-brightness` dependency |
| `apps/web/src/hooks/use-screen-dimming.ts` | New hook |
| `apps/web/src/__tests__/use-screen-dimming.test.ts` | New tests (TDD first) |
| `apps/web/src/components/hub/widget-grid.tsx` | Mount `useScreenDimming` |
| `apps/web/src/components/hub/settings-card.tsx` | Add dim timeout + brightness rows to Display section |

## Open Questions / Risks

- `@capacitor/screen-brightness` is a first-party Capacitor plugin — should be straightforward, but version alignment with `@capacitor/core ^8.3.0` needs checking.
- Dynamic import of Capacitor plugin inside the hook means tests must mock it at the module level. Standard `vi.mock` pattern used in this codebase will work.
