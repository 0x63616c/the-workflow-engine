# Plan: #186 Centralized Config + #151 Settings Card

## Assumptions

### Non-technical (UX/product/scope)

1. The settings card lives in the bento grid as a tappable card that opens a full-screen overlay.
2. The expanded view is divided into three sections: Appearance, Display, System.
3. Appearance: toggle between Midnight (dark) and Daylight (light) palette.
4. Display: idle timeout duration (default 45s), dim brightness (placeholder for Wave 3 dimming).
5. System: read-only — build hash, API status (ping latency), HA status (up/down).
6. Settings persist server-side in `app_config` table. Theme preference also mirrors to localStorage for instant hydration on load (no FOUC).
7. The settings card replaces the existing `wifi` card position or takes one of the row-4 slots. Grid currently has clock (1-4,1-3), countdown (4-7,1-2), music (4-7,2-4), lights (1-2,3-4), fan (2-3,3-4), climate (3-4,3-4), wifi (1-4,4-5). Settings card will sit at column 4-7, row 4-5 (currently empty).

### Technical

1. **Database**: `system_info` table uses `text` values. It already stores key/value pairs. However, config values may need typed structures (e.g. idle timeout as number). We will extend it with a new `app_config` table using `jsonb` for typed values rather than reusing `system_info` (which appears to store system metadata, not user settings). The existing `system_info` table is likely used for metadata like `build_hash`; keeping concerns separate is cleaner.
2. **Config schema at launch**:
   - `theme.activePaletteId`: `"midnight" | "daylight"` (string)
   - `display.idleTimeout_MS`: number (default: 45000)
   - `display.dimBrightness`: number 0-100 (default: 20, placeholder for Wave 3)
3. **Drizzle migration**: add `app_config` table with `key text unique`, `value jsonb`, `updatedAt timestamp`.
4. **Service layer**: `services/app-config.ts` — `getConfig(db, key)`, `setConfig(db, key, value)`, `getAllConfig(db)`.
5. **tRPC router**: `trpc/routers/app-config.ts` — `getAll` query, `get` query by key, `set` mutation (key + value).
6. **Frontend**: new `useAppConfig` hook using tRPC. Settings card reads/writes via this hook. Theme store `setActivePalette` also calls tRPC `set` to persist.
7. **Env validation**: `HA_TOKEN` already has no default (correct). `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` have dev defaults that are fine for local dev but should throw in production. Add `.refine()` checks: if `NODE_ENV === "production"` then Inngest keys must not equal the default values. `DATABASE_URL` default is also fine for dev/test.
8. **Card registration**: settings card added to `CARD_CONFIGS` in `card-registry.ts` at `gridColumn: "4 / 7"`, `gridRow: "4 / 5"`. Has `hasExpandedView: true`.
9. **Widget grid**: add `<SettingsCard />` to `widget-grid.tsx`.
10. **Card overlay**: add `settings` to `EXPANDED_VIEWS` map in `card-overlay.tsx`.
11. **Idle timeout constant**: currently hardcoded in `widget-grid.tsx` as `IDLE_TIMEOUT_MS = 45_000`. After this work it will be read from `app_config` via tRPC (with a fallback default of 45000 for loading state).
12. **Test approach (TDD)**:
    - API: service unit tests for `getConfig`/`setConfig`/`getAllConfig` using in-memory Postgres.
    - API: router integration tests via tRPC caller.
    - Web: `useAppConfig` hook tests mocking tRPC.
    - Web: `SettingsCard` component tests (renders sections, calls mutations on toggle).
    - Web: `SettingsCardExpanded` component tests.

### What is being built (plain English)

A key/value config table in Postgres where the app stores user-configurable settings. A tRPC router exposes read/write access. The frontend reads config at startup and writes on any settings change. A new "Settings" card in the bottom-right of the bento grid (gear icon) taps to open an overlay showing three sections: theme toggle, display settings (idle timeout), and system status (build hash, API/HA health). Theme changes now persist to the database (not just localStorage). Idle timeout in the widget grid reads from config instead of a hardcoded constant.

---

## Implementation Steps

### Phase 1: DB + Service + Router (API)

1. Add `app_config` table to `apps/api/src/db/schema.ts`
2. Generate and apply Drizzle migration
3. Write failing tests for `services/app-config.ts`
4. Implement `services/app-config.ts`
5. Write failing tests for `trpc/routers/app-config.ts`
6. Implement `trpc/routers/app-config.ts`
7. Register router in `trpc/routers/index.ts`

### Phase 2: Env hardening

8. Add production guards to `apps/api/src/env.ts` for Inngest keys

### Phase 3: Frontend

9. Write failing tests for `useAppConfig` hook
10. Implement `useAppConfig` hook
11. Update `theme-store.ts` to persist active palette to config via tRPC on change
12. Write failing tests for `SettingsCard` and `SettingsCardExpanded`
13. Implement `SettingsCard` and `SettingsCardExpanded` components
14. Add `settings` to `card-registry.ts`
15. Add `<SettingsCard />` to `widget-grid.tsx`
16. Add `settings` to `EXPANDED_VIEWS` in `card-overlay.tsx`
17. Update `widget-grid.tsx` idle timeout to read from config (with fallback)

### Phase 4: Verify

18. Run all tests
19. Browser smoke test: launch app, open settings card, toggle theme, confirm persists on reload
