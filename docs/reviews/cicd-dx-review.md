# CI/CD & Developer Experience Review

Reviewed: 2026-04-12

---

## 1. GitHub Actions

### What's Good

- **Concurrency control** — CI uses `cancel-in-progress: true` (correct for PRs), deploy uses `cancel-in-progress: false` (correct, never cancel an in-flight deploy).
- **Slack notifications** — full pipeline observability: start, checks, deploy, result, all threaded. Commit status written back to GitHub SHA. Well-structured.
- **Reusable custom actions** — `slack-notify-start`, `slack-notify-thread`, `slack-notify-result` keep workflow YAML clean.
- **Path-filtered iOS build** — only triggers on iOS-relevant file changes. Monthly scheduled build prevents TestFlight 90-day expiry. Smart.
- **GHA Docker layer caching** — logging image builds use `cache-from/cache-to: type=gha` with scoped keys (loki, alloy, grafana). Correct.
- **`fail-fast: false`** on matrix — all checks run even if one fails. Good for PR feedback.
- **`bun install --frozen-lockfile`** — lockfile integrity enforced in CI.

### Issues & Gaps

**P1 — Critical**

- **No bun cache in CI** — `oven-sh/setup-bun@v2` is called but no `cache: true` parameter. Every matrix job re-downloads and re-installs all node_modules from scratch. With 4 matrix jobs × 2 workflows, this is the single biggest build time bottleneck.

  Fix:
  ```yaml
  - uses: oven-sh/setup-bun@v2
    with:
      bun-version: latest
      cache: true
  ```

- **CI and Deploy duplicate matrix** — identical 4-job matrix (Lint, Typecheck, Test, Boundaries) defined in both `ci.yml` and `deploy.yml`. Any matrix change requires two edits. Drift risk.

  Fix: extract to reusable workflow (`call-ci-checks.yml`) and `uses:` it from both.

- **`actions/checkout` version inconsistency** — most steps use `@v6` but `check-logging-changes` uses `@v4`. Should be uniform.

**P2 — Important**

- **No web build step in CI** — `bun run build` for `apps/web` is never run in CI. TypeScript errors caught by `tsc --noEmit` but Vite build errors (bad imports, missing assets, plugin failures) only surface at deploy time. A failed build mid-deploy wastes the Kamal deploy slot.

  Fix: add a `Build` matrix entry: `bun run --filter '@repo/web' build`.

- **Deploy job depends on `build-logging-images`** — the `if` condition `needs.build-logging-images.result == 'success' || needs.build-logging-images.result == 'skipped'` is correct but fragile to read. A path-filter job failure would silently skip the logging build but still deploy. Acceptable for now but worth documenting.

- **`StrictHostKeyChecking no` in SSH config** — disables host key verification for homelab. Acceptable for private Tailscale network but worth noting. Would be better to pre-populate known_hosts with Tailscale host key.

- **`sudo gem install kamal`** — installs Kamal at runtime, no version pinning. Kamal breaking changes could silently break deploy. Pin via `Gemfile` in repo root or use the `kamal` GitHub action.

**P3 — Minor**

- **iOS build `timeout-minutes: 30`** — macOS-26 runners are slow. If Xcode/SPM needs to resolve packages cold, 30 min may be tight. Consider 45.
- **No deploy smoke test** — after `kamal deploy`, no health check step verifying the new container is actually responding. Kamal's built-in health check handles container readiness but a quick `curl` to the app endpoint would confirm end-to-end.

---

## 2. Pre-commit Hooks (Lefthook)

### What's Good

- `parallel: true` — all hooks run concurrently.
- `biome` hook uses `{staged_files}` + `stage_fixed: true` — only lints changed files, auto-stages fixes.
- `test` runs `vitest --changed` — only tests affected by staged files, fast.
- `no-env` guard blocks `.env` commits.
- `swiftformat` + `plist-lint` — native file hygiene.
- `actionlint` — GitHub Actions workflow validation at commit time.
- `yaml-lint` — YAML syntax check.
- `no-push-main` on pre-push — blocks direct pushes to main.

### Issues & Gaps

**P2 — Important**

- **`typecheck` runs full monorepo on every commit** — `bun run typecheck` typechecks all workspaces regardless of what's staged. No incremental option available with `tsc --noEmit`, but could scope to changed workspace: check which `apps/` folder has staged files and only run that workspace's typecheck. Would halve typecheck time for single-app commits.

- **`boundaries` runs unconditionally** — always scans all API source files even if only `apps/web` files are staged. Add a glob guard: only run when `apps/api/src/**` files are staged.

  ```yaml
  boundaries:
    glob: "apps/api/src/**/*.ts"
    run: bun run check:boundaries
  ```

**P3 — Minor**

- **`yamllint -d relaxed`** — relaxed config allows things like missing newlines at end of file. Consider `-d '{extends: default, rules: {line-length: {max: 120}}}'` for slightly tighter rules.
- **No `secrets-scan` hook** — no tool like `trufflesecurity/trufflehog` or `gitleaks` detecting accidentally committed secrets (API keys, tokens in code). Low risk given the team size but worth adding.

---

## 3. Local Dev (Tilt)

### What's Good

- Startup order enforced: inngest → api → web via `resource_deps`.
- Hot reload: `bun --watch` for API, Vite HMR for web.
- `PORT_OFFSET` system — clean parallel agent isolation.
- `docker-compose.yml` minimal: only Inngest and Postgres. No over-engineering.
- Postgres `healthcheck` in compose — Tilt won't start API until Postgres is ready.

### Issues & Gaps

**P2 — Important**

- **API `PORT` env hardcoded to 4201** — Tiltfile passes `"PORT": str(4201)` not `str(port_api)`. When `PORT_OFFSET != 0`, the API still binds 4201 instead of the offset port. The Vite proxy would also need updating (it reads `API_PORT` env var in `vite.config.ts`). Current PORT_OFFSET system is partially broken for the API.

  Fix in Tiltfile:
  ```python
  serve_env={
      "PORT": str(port_api),
      "PORT_OFFSET": str(port_offset),
      "INNGEST_DEV": "1",
  },
  ```
  And ensure `API_PORT` is also passed to the web resource so the Vite proxy uses the offset port.

- **No `libs/shared` dep tracking** — `apps/api` and `apps/web` both depend on `libs/shared` but Tiltfile `deps` only watches `apps/api/src` and `apps/web/src`. Changes to `libs/shared/src` won't trigger a reload. Add `libs/shared/src` to both `deps` arrays.

**P3 — Minor**

- **No Tiltfile live_update** — uses `serve_cmd` (process restart on file change) rather than `live_update` rules. For the API this is fine (bun --watch handles it). For web, Vite HMR handles it. No action needed.
- **`INNGEST_PORT` env set via `os.putenv`** — this sets the variable for the Tilt process environment, not compose. The compose file reads `${INNGEST_PORT:-8288}` which picks it up via shell expansion. Works but is implicit. A comment explaining this would help.

---

## 4. Linting & Formatting (Biome)

### What's Good

- Biome 1.9.0 — current stable. Right choice: 10-50x faster than ESLint+Prettier, single config, zero plugin sprawl.
- `recommended: true` — sensible defaults, catches real bugs.
- `organizeImports: enabled` — auto-sorts imports on save.
- Formatter config explicit: 2-space indent, 100 char line width.
- `.gen.ts` files ignored — correct, TanStack Router generates these.

### Issues & Gaps

**P2 — Important**

- **No `noConsole` rule** — `console.log` left in production code is common dev noise. Enable `style.noConsoleLog` or use `suspicious.noConsole` (Biome 1.9+):
  ```json
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": {
        "noConsole": "warn"
      }
    }
  }
  ```

- **No `useExhaustiveDependencies` override** — `recommended` enables this for React hooks but at `error` level. For a codebase with complex animation hooks (Three.js, Framer Motion), this often produces false positives on intentionally stable refs. Consider setting to `"warn"` to reduce noise without disabling.

**P3 — Minor**

- **`biome.json` ignores `.claude/skills/`** — reasonable for generated/external skills content.
- **No per-workspace Biome config** — single root config. Fine for now. If web and API ever need different rules (e.g., different complexity thresholds), each workspace can have its own `biome.json` extending root.
- **Biome vs alternatives** — no reason to switch. ESLint + Prettier would be slower and require more config. Biome is the right choice for this stack.

---

## 5. Build & Bundle

### What's Good

- Vite 6.3 — latest major, fastest build.
- `tsc -b && vite build` — TypeScript check before bundle. Fails fast on type errors.
- `simplex-noise` in `optimizeDeps.include` — pre-bundled to avoid CJS/ESM interop issues at dev time.
- `@` path alias configured in both `vite.config.ts` and `tsconfig.json` — consistent.
- Vite proxy `/trpc` → API — no CORS config needed in dev.
- TypeScript `strict: true` at root — full type safety enforced across monorepo.

### Issues & Gaps

**P2 — Important**

- **No bundle splitting config** — Vite default code-splitting applies but no explicit `rollupOptions.output.manualChunks`. Three.js (`three` + `@react-three/fiber` + `@react-three/drei`) is very large (~2MB). Should be split into its own chunk so the main app loads fast and 3D assets load lazily:
  ```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'framer': ['framer-motion'],
        }
      }
    }
  }
  ```
  This matters for initial load on the iPad (though it's LAN so impact is low).

- **No `build.target` specified** — defaults to Vite's `modules` target (es2020 + dynamic import). Since this only runs on an iPad Pro (Safari/WKWebView), could set `build.target: 'safari15'` for slightly smaller output (no legacy transforms needed).

**P3 — Minor**

- **`skipLibCheck: true`** — standard for monorepos. Acceptable.
- **`isolatedModules: true`** — correct for Vite/esbuild transforms.
- **No `noUncheckedIndexedAccess`** — not in strict mode by default. Would catch `arr[i]` potentially-undefined bugs. High signal/noise ratio improvement. Worth enabling.
- **`apps/api` has `outDir: dist` but build isn't run in CI** — API runs directly via `bun src/server.ts`, no compilation step needed. The `outDir` in tsconfig is vestigial. Low priority.

---

## 6. Scripts & Tooling

### What's Good

- Root scripts are minimal and clear: `test`, `lint:fix`, `typecheck`, `check:boundaries`.
- `bun run --filter '*' test` runs all workspace tests correctly.
- `check-boundaries.ts` — well-structured, uses `Glob` from bun, exits non-zero on violations, reports file + rule + import. Covers all API layers.

### Issues & Gaps

**P2 — Important**

- **`check:boundaries` only covers API** — `scripts/check-boundaries.ts` scans `apps/api/src` only. No boundary enforcement for `apps/web` (e.g., preventing route files from importing db layer directly, or enforcing that `@repo/shared` isn't importing from app packages). Minimal risk now but worth noting as frontend grows.

- **No `db:migrate` in CI** — migrations aren't verified to be up-to-date in CI. A common footgun: developer generates a migration locally but forgets to commit it, CI passes, deploy fails. Add a check:
  ```yaml
  - name: Check no pending migrations
    run: bunx drizzle-kit generate --check
  ```
  (if drizzle-kit supports `--check` flag; if not, compare generated output to committed files).

**P3 — Minor**

- **No `clean` script** — no script to nuke `node_modules`, `dist`, `.tilt`. Devs have to know paths manually. Low priority but convenient.
- **Missing `cap:sync` in CI iOS build** — the iOS workflow does run `bunx cap sync ios` directly, so this is covered. The workspace script `cap:sync` runs `bun run build` first which is correct for local use.

---

## Prioritized Improvements

| Priority | Item | Impact |
|----------|------|--------|
| P1 | Add `cache: true` to `setup-bun` in CI | Biggest time save — likely 1-2 min per matrix job |
| P1 | Extract shared CI matrix to reusable workflow | Eliminate duplication, prevent drift |
| P1 | Fix Tiltfile PORT_OFFSET for API | PORT_OFFSET system broken for API |
| P2 | Add web `build` step to CI matrix | Catch Vite build failures before deploy |
| P2 | Add `libs/shared` to Tiltfile deps | Shared library changes don't trigger reload |
| P2 | Scope `typecheck`/`boundaries` hooks to changed workspace | Faster pre-commit for single-app changes |
| P2 | Add Three.js manual chunk splitting in Vite | Faster initial load (minor on LAN) |
| P2 | Add `noConsole` Biome rule | Catch debug logs in prod |
| P2 | Fix `actions/checkout` version inconsistency | `@v4` vs `@v6` in deploy.yml |
| P3 | Pin Kamal version | Prevent silent breaking changes in deploy |
| P3 | Add deploy smoke test after `kamal deploy` | Confirm app live after deploy |
| P3 | Enable `noUncheckedIndexedAccess` in tsconfig | Catch array index bugs at compile time |
| P3 | Add `gitleaks` or `trufflesecurity` pre-commit hook | Defense-in-depth secrets scanning |
