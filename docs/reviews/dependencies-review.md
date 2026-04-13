# Dependencies Review

Generated: 2026-04-12

---

## Dependency Inventory

### Root (`package.json`)

| Package | Current | Latest | Status | Notes |
|---------|---------|--------|--------|-------|
| `@biomejs/biome` | 1.9.4 | 2.4.11 | Major update available | v2 has breaking config changes |
| `lefthook` | 1.13.6 | 2.1.5 | Major update available | v2 has breaking changes to lefthook.yml |
| `typescript` | 5.9.3 | 6.0.2 | Major update available | TS 6 has breaking changes; evaluate carefully |

### apps/web

| Package | Current | Latest | Status | Notes |
|---------|---------|--------|--------|-------|
| `@capacitor/core` | 8.3.x | 8.3.x | Up to date | |
| `@capacitor/haptics` | 8.0.2 | 8.0.2 | Up to date | |
| `@capacitor/ios` | 8.3.x | 8.3.x | Up to date | |
| `@capacitor/status-bar` | 8.0.2 | 8.0.2 | Up to date | |
| `@react-three/drei` | 10.7.7 | 10.7.7 | Up to date | |
| `@react-three/fiber` | 9.5.0 | 9.5.0 | Up to date | |
| `@tanstack/react-query` | 5.97.0 | 5.99.0 | Minor update available | Patch |
| `@tanstack/react-router` | 1.168.15 | 1.168.18 | Minor update available | Patch |
| `@trpc/client` | 11.x | 11.x | Up to date | |
| `@trpc/react-query` | 11.x | 11.x | Up to date | |
| `@types/qrcode` | 1.5.6 | 1.5.6 | Up to date | Type-only, should be devDep |
| `clsx` | 2.1.0 | 2.1.0 | Up to date | |
| `framer-motion` | 12.38.0 | 12.38.0 | Up to date | |
| `geist` | 1.3.0 | 1.3.0 | **Unused** | App uses `@fontsource-variable/geist` instead; remove |
| `lucide-react` | 0.475.0 | 1.8.0 | Major update available | v1.x is a new major; low risk for icon updates |
| `qrcode` | 1.5.4 | 1.5.4 | Up to date | Used in wifi-card.tsx |
| `react` | 19.0.0 | 19.0.0 | Up to date | |
| `react-dom` | 19.0.0 | 19.0.0 | Up to date | |
| `simplex-noise` | 4.0.3 | 4.0.3 | Up to date | Used in topographic-contours.tsx |
| `tailwind-merge` | 3.0.0 | 3.0.0 | Up to date | |
| `three` | 0.183.2 | 0.183.2 | Up to date | |
| `zustand` | 5.0.0 | 5.0.0 | Up to date | |
| `@capacitor/cli` | 8.3.x | 8.3.x | Up to date | devDep |
| `@fontsource-variable/geist` | 5.2.8 | 5.2.8 | Up to date | devDep; used in globals.css |
| `@fontsource-variable/geist-mono` | 5.2.7 | 5.2.7 | Up to date | devDep; used in globals.css |
| `@tailwindcss/vite` | 4.1.x | 4.1.x | Up to date | devDep |
| `@tanstack/router-plugin` | 1.167.14 | 1.167.18 | Minor update available | devDep; patch |
| `@testing-library/jest-dom` | 6.6.0 | 6.6.0 | Up to date | devDep |
| `@testing-library/react` | 16.2.0 | 16.2.0 | Up to date | devDep |
| `@types/react` | 19.x | 19.x | Up to date | devDep |
| `@types/react-dom` | 19.x | 19.x | Up to date | devDep |
| `@types/three` | 0.183.1 | 0.183.1 | Up to date | devDep |
| `@vitejs/plugin-react` | 4.7.0 | 6.0.1 | Major update available | devDep; v6 requires Vite 7+ |
| `jsdom` | 26.1.0 | 29.0.2 | Major update available | devDep; usually safe to upgrade |
| `tailwindcss` | 4.1.x | 4.1.x | Up to date | devDep |
| `typescript` | 5.9.3 | 6.0.2 | Major update available | devDep |
| `vite` | 6.4.2 | 8.0.8 | Major update available | devDep; v7 and v8 are new majors |
| `vitest` | 3.2.4 | 4.1.4 | Major update available | devDep |

### apps/api

| Package | Current | Latest | Status | Notes |
|---------|---------|--------|--------|-------|
| `drizzle-orm` | 0.40.1 | 0.45.2 | **VULNERABLE** | SQL injection via improperly escaped identifiers (GHSA-gpj5-g38j-94v9, high severity) |
| `inngest` | 3.52.7 | 4.2.1 | Major update available | v4 has breaking changes |
| `pg` | 8.13.x | 8.13.x | Up to date | |
| `zod` | 3.25.76 | 4.3.6 | Major update available | Zod v4 has significant breaking changes |
| `@types/bun` | 1.2.x | 1.2.x | Up to date | devDep |
| `@types/pg` | 8.15.6 | 8.20.0 | Minor update available | devDep; safe to update |
| `drizzle-kit` | 0.31.x | 0.31.x | Up to date | devDep; pulls in vulnerable esbuild (moderate, dev only) |
| `typescript` | 5.9.3 | 6.0.2 | Major update available | devDep |
| `vitest` | 3.2.4 | 4.1.4 | Major update available | devDep |

### libs/shared

| Package | Current | Latest | Status | Notes |
|---------|---------|--------|--------|-------|
| `zod` | 3.25.76 | 4.3.6 | Major update available | v4 has breaking changes; must coordinate with api upgrade |
| `typescript` | 5.9.3 | 6.0.2 | Major update available | devDep |

---

## Vulnerabilities

### High: drizzle-orm SQL injection (GHSA-gpj5-g38j-94v9)

- **Affected**: `apps/api` — `drizzle-orm` < 0.45.2
- **Fix**: upgrade to `drizzle-orm` >= 0.45.2
- **Risk**: SQL identifiers not properly escaped; exploitable if user-controlled strings reach column/table names
- **Action**: Upgrade immediately. `drizzle-kit` (devDep) must also be updated to match (currently 0.31.x — check compatibility with 0.45.x schema)

### Moderate: esbuild dev server CORS bypass (GHSA-67mh-4wv8-2f99)

- **Affected**: `drizzle-kit` (devDep in api), `vite` and `@tanstack/router-plugin` (devDep in web) via bundled esbuild <= 0.24.2
- **Risk**: Only exploitable in local dev environment, not production
- **Fix**: Update `vite` to >= 6.3.x resolves for web; `drizzle-kit` update required for api
- **Action**: Low urgency given dev-only exposure, but address as part of routine update cycle

---

## Unnecessary Packages

### `geist` (apps/web deps)

- **Issue**: Listed as a runtime dependency but never imported in source. The app uses `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` (devDeps, imported via CSS) instead.
- **Action**: Remove `geist` from `apps/web` dependencies

### `@types/qrcode` (apps/web deps — wrong categorization)

- **Issue**: Type-only package listed as a runtime dependency. Should be a devDependency.
- **Action**: Move to `devDependencies`

---

## Packages Needing Updates (Prioritized)

### Priority 1 — Security (action required)

1. `drizzle-orm` → 0.45.2+ (high severity SQL injection)

### Priority 2 — Minor/patch updates (low risk, do now)

2. `@tanstack/react-query` 5.97.0 → 5.99.0
3. `@tanstack/react-router` 1.168.15 → 1.168.18
4. `@tanstack/router-plugin` 1.167.14 → 1.167.18
5. `@types/pg` 8.15.6 → 8.20.0

### Priority 3 — Major updates (coordinate, test carefully)

6. `lucide-react` 0.475.0 → 1.8.0 — icon library major; likely low-friction since icons rarely break
7. `inngest` 3.x → 4.x — review changelog for function API changes
8. `vite` 6.x → 7/8.x — ecosystem-level change; requires `@vitejs/plugin-react` upgrade too
9. `@vitejs/plugin-react` 4.x → 6.x — requires Vite 7+
10. `vitest` 3.x → 4.x — test runner; review breaking changes
11. `jsdom` 26 → 29 — vitest environment; usually safe
12. `biome` 1.x → 2.x — formatter/linter; config migration required
13. `lefthook` 1.x → 2.x — git hooks; config migration required
14. `typescript` 5.x → 6.x — compiler; strict mode changes possible
15. `zod` 3.x → 4.x — breaking API changes; must coordinate across api + shared

---

## Dependency Categorization Issues

| Package | Location | Current | Should Be | Reason |
|---------|----------|---------|-----------|--------|
| `@types/qrcode` | apps/web | `dependencies` | `devDependencies` | Type-only package |
| `geist` | apps/web | `dependencies` | Remove | Unused; fontsource variant used instead |

---

## CLAUDE.md vs Reality: SQLite vs PostgreSQL Mismatch

CLAUDE.md describes the database as "SQLite via Drizzle ORM (Bun SQLite driver)" but the actual implementation uses **PostgreSQL** (`pg` pool, `drizzle-orm/node-postgres`, `pgTable` in schema). The CLAUDE.md documentation is outdated.

---

## Missing Packages

No clearly missing runtime dependencies found. Potential additions to consider:

- **`drizzle-orm/bun-sqlite`** is mentioned in docs but not used — if a SQLite path is planned for test isolation, the infrastructure for it isn't in place yet
- **`@sentry/bun`** or equivalent — no error monitoring package present

---

## Workspace Config Assessment

The Bun workspace setup is minimal and correct:

```json
"workspaces": ["apps/*", "libs/*"]
```

- `zod` is declared in both `apps/api` and `libs/shared` at the same version range (`^3.24.0`) — currently fine, but when upgrading to Zod v4 both must be updated together
- `typescript` is declared in root devDeps and in each workspace — acceptable but slightly redundant; could be hoisted to root only
- `vitest` is declared separately in each app with the same version — no conflict, just minor duplication
- No version conflicts between workspaces detected

---

## Renovate (Issue #110)

**Recommend prioritizing Renovate setup.** Rationale:

- Multiple packages are already at major version lag (vite 6→8, biome 1→2, vitest 3→4)
- A high-severity vulnerability (`drizzle-orm`) was already present and unnoticed
- The monorepo structure (3 workspaces) benefits from grouped PRs that Renovate handles well
- Renovate can be configured to auto-merge patch/minor for low-risk packages and flag majors for review

Suggested Renovate config approach:
- Group `@tanstack/*` updates together
- Group `vite`/`vitest`/`@vitejs/*` together (they move in lockstep)
- Auto-merge devDep patches
- Pin major upgrades to manual review PRs
