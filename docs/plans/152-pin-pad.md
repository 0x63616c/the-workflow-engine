# Plan: PIN Pad UI Lock (#152)

## Non-Technical Assumptions

1. This is a "phone lock screen" UX — not server-side auth. The PIN protects the settings UI only.
2. No lockout after N failed attempts. Wrong PIN = shake animation + retry. No account to lock.
3. First-time setup (no PIN saved) = user enters new PIN directly without confirmation step, OR two-step (enter, then re-enter to confirm). Assuming two-step for safety — enter once, then confirm.
4. Changing PIN from within settings = enter current PIN to unlock, then set new PIN inside settings.
5. Disabling PIN from settings = toggle that disables it (with PIN already unlocked, so no re-auth needed to toggle off).
6. PIN length: fixed 4 digits (simpler UX on wall panel, easier to remember).

## Technical Assumptions

1. **Storage**: localStorage (same pattern as `theme-store.ts`) — no Capacitor Preferences, keeps it simple and testable.
2. **Hashing**: `crypto.subtle.digest('SHA-256', ...)` — Web Crypto API, available in browser and jsdom with vitest.
3. **No lockout timer** — just shake + clear on wrong PIN.
4. **Haptics**: `@capacitor/haptics` is already installed (`package.json` line 21). Use `Haptics.impact()` on each digit tap and `Haptics.notification({ type: NotificationType.Error })` on wrong PIN.
5. **Haptics graceful degradation**: Capacitor haptics no-ops in browser/web context, so no special guard needed.
6. **Integration point**: `SettingsCard.onClick` currently calls `expandCard("settings")` directly. We intercept here — if PIN enabled and not already unlocked, show PIN pad overlay instead.
7. **PIN unlock state**: Ephemeral (not persisted). Once unlocked in a session, stays unlocked until page reload. Stored in `pin-store.ts` as `isUnlocked` flag.
8. **PIN pad overlay**: Rendered as a separate overlay (not inside `CardOverlay`). It sits at `z-60` over everything, shown when settings is tapped and PIN is enabled but not unlocked.
9. **Card expansion store**: Not modified. The PIN pad overlay is independent.

## What's Being Built

A 4-digit PIN pad that intercepts taps on the settings card. When PIN is enabled and session is locked, tapping settings shows a full-screen PIN pad (dots + 3x4 grid of number buttons). Correct PIN dismisses it and opens settings. Wrong PIN shakes the dot indicators and clears. PIN hash is stored in localStorage. PIN can be set/changed/disabled from inside the settings expanded view once unlocked.

## File Inventory

**New files:**
- `apps/web/src/components/hub/pin-pad.tsx` — PIN pad overlay component
- `apps/web/src/stores/pin-store.ts` — Zustand store (pinHash, enabled, isUnlocked, actions)
- `apps/web/src/__tests__/pin-pad.test.tsx` — component tests
- `apps/web/src/__tests__/pin-store.test.ts` — store unit tests

**Modified files:**
- `apps/web/src/components/hub/settings-card.tsx` — intercept onClick, add PIN setup/change/toggle section to `SettingsCardExpanded`
- `apps/web/src/routes/index.tsx` (or wherever `CardOverlay` lives) — render `PinPadOverlay` alongside `CardOverlay`

## State Design (`pin-store.ts`)

```ts
interface PinState {
  pinHash: string | null;   // SHA-256 hex, null = no PIN set
  enabled: boolean;          // false = settings opens freely
  isUnlocked: boolean;       // ephemeral session flag
}

interface PinActions {
  setPin: (pin: string) => Promise<void>;    // hash + store
  verifyPin: (pin: string) => Promise<boolean>; // compare hash
  unlock: () => void;                         // set isUnlocked = true
  lock: () => void;                           // set isUnlocked = false
  disable: () => void;                        // enabled = false
  enable: () => void;                         // enabled = true
}
```

Storage: `pinHash` and `enabled` persisted to localStorage manually (same pattern as theme-store).

## Component Design (`pin-pad.tsx`)

- `PinPadOverlay` — top-level overlay, renders when `showPinPad` is true
  - Fixed inset-0, z-60, dark background
  - 4 dot indicators (filled = digit entered)
  - 3x4 button grid: 1-9 (rows 1-3), backspace / 0 / confirm (row 4)
  - Each button: 80px minimum touch target, large text
  - On digit tap: append to local `digits` state, fire `Haptics.impact()`
  - At 4 digits: auto-submit (no confirm tap needed, cleaner UX)
  - Wrong PIN: shake animation on dots (Framer Motion `x` keyframe), clear digits, `Haptics.notification(Error)`
  - Correct PIN: call `unlock()`, close overlay, `expandCard("settings")`
  - Dismiss/cancel: tap outside or X button — contracts overlay without opening settings

## Settings Card Integration

`SettingsCard.onClick`:
```
if pinEnabled && !isUnlocked:
  show PIN pad overlay (set local state or store flag)
else:
  expandCard("settings")
```

`SettingsCardExpanded` gets a new "Security" section:
- "PIN lock" toggle (enable/disable)
- "Change PIN" button — triggers PIN setup flow (inline or via a sub-overlay)

## PIN Setup Flow

First time (no `pinHash`):
1. Enter new 4-digit PIN
2. Re-enter to confirm
3. `setPin()` — hashes and stores

Change PIN (from settings):
1. Enter current PIN (verify)
2. Enter new PIN
3. Confirm new PIN
4. `setPin()`

The PIN setup UI reuses `PinPadOverlay` with a `mode` prop: `"unlock" | "setup-enter" | "setup-confirm" | "change-verify" | "change-enter" | "change-confirm"`.

## TDD Plan

**Tests first (red), then implement (green):**

1. `pin-store.test.ts`
   - `setPin` stores hashed value (not plaintext)
   - `verifyPin` returns true for correct PIN, false for wrong
   - `unlock/lock` toggle `isUnlocked`
   - `enable/disable` toggle `enabled`
   - State persists to localStorage

2. `pin-pad.test.tsx`
   - Renders dot indicators (4 empty initially)
   - Clicking digit fills a dot
   - Backspace clears last digit
   - Auto-submits at 4 digits
   - Shows shake animation on wrong PIN (test that class/variant applied)
   - Calls `onSuccess` on correct PIN
   - Calls `onDismiss` on cancel

3. `settings-card.test.tsx` updates
   - Settings card with PIN enabled + locked: click does NOT expand, shows PIN pad
   - Settings card with PIN disabled: click expands directly
   - Settings card with PIN enabled + unlocked: click expands directly
   - SettingsCardExpanded shows Security section with toggle and change button

## Commits Plan

1. `test: add failing tests for pin-store`
2. `feat: add pin-store with hash/verify/unlock`
3. `test: add failing tests for PinPadOverlay component`
4. `feat: add PinPadOverlay component`
5. `feat: integrate PIN pad with settings card click`
6. `feat: add PIN setup/change flow in settings expanded view`
7. `test: update settings-card tests for PIN integration`
