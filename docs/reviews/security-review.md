# Security Review

Date: 2026-04-12

## Scope

Authentication, API security, frontend security, secrets/env handling, dependencies, infrastructure, iOS/Capacitor.

---

## Critical

### C1: No Authentication on Any API Endpoint

**Location:** `apps/api/src/trpc/init.ts:8`, `apps/api/src/trpc/routers/devices.ts:14`

**Description:** All tRPC procedures use `publicProcedure` — there is no auth middleware, no token validation, and no protected procedure type. Every endpoint (lights, media player, climate, countdown events) is open to anyone who can reach the API port. The CLAUDE.md notes PIN-based auth as "planned" but it is not implemented.

**Impact:** Anyone on the same network as the Mac Mini (or able to reach it via Tailscale) can control home devices, CRUD countdown events, and read Home Assistant state with no credentials.

**Fix:** Implement an `authedProcedure` in `init.ts` that checks a token from the request context. Add token to `createContext` from the `Authorization` header. Gate all non-health procedures behind `authedProcedure`.

---

### C2: Drizzle ORM SQL Injection (CVE / GHSA-gpj5-g38j-94v9)

**Location:** `apps/api/package.json` — `drizzle-orm ^0.40.0` (current install: `<0.45.2`)

**Description:** `bun audit` reports a high-severity SQL injection vulnerability in drizzle-orm via improperly escaped SQL identifiers. The affected version range is `<0.45.2`.

**Impact:** If any user-controlled string is used as a table or column identifier (not just a value), an attacker could inject arbitrary SQL.

**Fix:** Upgrade `drizzle-orm` to `>=0.45.2`. Run `bun update drizzle-orm`.

---

## High

### H1: iOS App Transport Security Fully Disabled

**Location:** `apps/web/ios/App/App/Info.plist:28-31`

**Description:** `NSAllowsArbitraryLoads = true` disables ATS for all connections. The app can load content over plain HTTP from any host.

**Impact:** The Capacitor app communicates with the backend over HTTP (no TLS). If the local network is compromised, traffic between the iPad and Mac Mini (including HA tokens proxied through the API) can be intercepted. ATS exists as a defense-in-depth layer.

**Fix:** This is somewhat acceptable for a local-only LAN app, but should be scoped more tightly. Replace the blanket `NSAllowsArbitraryLoads` with `NSExceptionDomains` restricted to `homelab` (the Tailscale hostname). Ideally, terminate TLS at the Mac Mini with a self-signed cert and pin it, or use Tailscale's HTTPS certificates.

---

### H2: Capacitor `allowNavigation: ["*"]` and `cleartext: true`

**Location:** `apps/web/capacitor.config.ts:12-13`

**Description:** The Capacitor server config allows navigation to any origin (`allowNavigation: ["*"]`) and enables cleartext traffic. Combined with a WKWebView, this means a compromised page could navigate the webview to an arbitrary external URL.

**Impact:** Phishing surface: if the frontend ever renders attacker-controlled content (e.g., via an XSS in a Home Assistant media title), a navigation could redirect the kiosk to an attacker-controlled page that persists on the wall panel indefinitely.

**Fix:** Scope `allowNavigation` to only the production server hostname (e.g., `["homelab"]`). Remove `cleartext: true` once TLS is in place. For a wall-panel app that should only ever show one URL, this whitelist should be as narrow as possible.

---

### H3: SSH Host Key Verification Disabled in CI Deploy

**Location:** `.github/workflows/deploy.yml:285-288`

**Description:** The deploy job configures `StrictHostKeyChecking no` and `UserKnownHostsFile /dev/null` for the `homelab` SSH host.

**Impact:** A man-in-the-middle attack on the Tailscale connection during CI could intercept the deploy, inject malicious commands, or exfiltrate secrets passed as env vars to Kamal.

**Fix:** Bootstrap the homelab host key once (via `ssh-keyscan` on first provisioning) and store it as a GitHub secret. Add it to known_hosts in CI instead of disabling verification.

---

### H4: Inngest Signing Key and Event Key Have Insecure Defaults

**Location:** `apps/api/src/env.ts:14-15`

**Description:** `INNGEST_SIGNING_KEY` defaults to `"signing-key-0000000000000000"` and `INNGEST_EVENT_KEY` defaults to `"local-dev-event-key-00000000"`. If production secrets are not correctly injected, the server silently starts with these predictable keys.

**Impact:** An attacker who knows the default keys could forge signed Inngest events or authenticate to the Inngest dev server, triggering background functions with arbitrary payloads.

**Fix:** Remove both defaults entirely from `env.ts` so that missing production values cause a startup failure rather than silent degradation. Use `z.string().min(32)` with no `.default()`.

---

## Medium

### M1: `entityId` Not Validated Against Known Entities

**Location:** `apps/api/src/trpc/routers/devices.ts:53-67, 69-83, 94-114`

**Description:** `mediaPlayerCommand`, `setVolume`, `fanOn`, and `fanOff` accept a free-form `entityId: z.string()` and pass it directly to Home Assistant's service API. There is no validation that the ID belongs to the expected domain or is a known entity.

**Impact:** An authenticated caller (once auth exists) could pass arbitrary entity IDs (e.g., `switch.security_alarm`) to HA service calls that accept `entity_id`, potentially controlling unintended devices.

**Fix:** Validate that the `entityId` prefix matches the expected domain (e.g., `media_player.*`, `climate.*`, `fan.*`) before calling HA. Optionally, fetch the allowed entity list and reject unknown IDs.

---

### M2: Internal Error Details Logged to Console

**Location:** `apps/api/src/server.ts:57-60`

**Description:** The tRPC `onError` handler logs the full error message to stdout/stderr: `error.message`. In production, these logs are shipped to Loki/Grafana.

**Impact:** Low direct risk (logs are internal), but HA API error responses (which may include tokens or URLs in some edge cases) could leak into log storage.

**Fix:** For production, consider redacting or classifying tRPC errors before logging. At minimum, avoid logging the full `error.message` for 500-class errors where the cause may be an upstream API response body.

---

### M3: Loki Has Authentication Disabled

**Location:** `infra/logging/loki/loki-config.yaml:1`

**Description:** `auth_enabled: false` means anyone who can reach the Loki container can read all logs without credentials.

**Impact:** Logs contain tRPC path/status information and potentially error messages with HA entity IDs. On the internal network, this is low risk; however, if the logging stack is ever exposed beyond the Docker network, all logs are readable unauthenticated.

**Fix:** Acceptable for a single-tenant homelab. Document that Loki must not be exposed outside the internal Docker network. If Grafana is ever exposed externally, enable Loki auth and configure Grafana to use a credential.

---

### M4: Merge Conflict Markers in Production iOS Code

**Location:** `apps/web/ios/App/App/KioskViewController.swift:5-39`

**Description:** `KioskViewController.swift` contains unresolved git merge conflict markers (`<<<<<<< Updated upstream`, `=======`, `>>>>>>> Stashed changes`). The file includes debug code (`viewDidLoad` writing to `debug.txt` and `debug-3s.txt` in the app's documents directory) that would be compiled into a production build.

**Impact:** (1) The debug file writes expose internal config (server URL, webview URL) to the device's Documents directory, readable by iTunes file sharing or diagnostics. (2) The conflict markers mean the file won't compile cleanly — the CI iOS build would either fail or only compile one branch of the conflict.

**Fix:** Resolve the merge conflict. Remove the debug file-writing code from `viewDidLoad` before shipping to TestFlight. The `prefersHomeIndicatorAutoHidden` override and `viewDidLoad` can be kept, but the `try? "...".write(to: debugFile...)` calls must be removed.

---

### M5: CI Postgres Uses Hardcoded Credentials

**Location:** `.github/workflows/ci.yml:19-21`, `.github/workflows/deploy.yml:52-54`

**Description:** Both CI workflows start a Postgres service with `POSTGRES_PASSWORD: workflow` and connect via `postgresql://evee:workflow@localhost:5432/evee_test`.

**Impact:** Low risk (ephemeral CI containers, not reachable externally), but represents a pattern of hardcoded credentials that should not bleed into other environments.

**Fix:** Acceptable as-is for CI-only ephemeral databases. Ensure this credential is never reused in staging or production.

---

## Low / Informational

### L1: `BUILD_HASH` Exposed via Unauthenticated Endpoint

**Location:** `apps/api/src/trpc/routers/health.ts:10-13`

**Description:** The `health.buildHash` endpoint returns the current build hash and server start timestamp to any caller, with no auth.

**Impact:** Information disclosure — an attacker can determine the exact deployed version, helping them target known vulnerabilities in that specific build.

**Fix:** Once auth is implemented, gate `buildHash` behind `authedProcedure`. The `health.ping` endpoint can remain public for uptime monitoring.

---

### L2: No CORS Configuration

**Location:** `apps/api/src/server.ts`

**Description:** Bun's built-in `serve` does not set CORS headers, and none are added manually. There is no `Access-Control-Allow-Origin` restriction.

**Impact:** In production, the API and web are served from the same origin (Kamal serves static assets from the API process), so CORS is not exploitable. In development, the Vite proxy handles requests, so CORS is also not a direct risk. Low severity.

**Fix:** No immediate action needed. If the API is ever exposed on a different origin than the web, add explicit CORS middleware.

---

### L3: No Rate Limiting

**Location:** `apps/api/src/server.ts`

**Description:** There is no rate limiting on any endpoint. The `/trpc` batch endpoint accepts unlimited requests.

**Impact:** In the current local network deployment, this is low risk. If the API were ever exposed to the internet, it would be trivially DoS-able or brute-forceable.

**Fix:** No immediate action needed for a LAN-only deployment. Add rate limiting (e.g., via a Bun middleware or Kamal/Caddy reverse proxy) if internet exposure is ever planned.

---

### L4: esbuild Dev Server Vulnerability (Moderate)

**Location:** `apps/web/package.json` — `vite ^6.3.0` (depends on `esbuild <=0.24.2`)

**Description:** `bun audit` reports a moderate vulnerability in esbuild where any website can send requests to the dev server and read responses (GHSA-67mh-4wv8-2f99).

**Impact:** Only affects local development (Vite dev server). Has no impact on the production build.

**Fix:** Update `vite` to a version that bundles `esbuild >0.24.2` once available. Monitor for a vite patch release. No production risk.

---

### L5: Database URL Has Default Credentials in `env.ts`

**Location:** `apps/api/src/env.ts:7-10`

**Description:** `DATABASE_URL` defaults to `postgresql://evee:workflow@localhost:5432/evee`. This default is harmless in dev but risky if `NODE_ENV=production` is set without injecting a real `DATABASE_URL`.

**Impact:** If a production deploy accidentally runs without the secret injected, the API will attempt to connect with the default credential. Unlikely given Kamal's secret injection, but it's a silent failure mode.

**Fix:** Consider removing the default for `DATABASE_URL` in production builds, or adding a check that the URL is not the dev default when `NODE_ENV=production`.

---

## Summary Table

| ID | Severity | Title |
|----|----------|-------|
| C1 | Critical | No authentication on any API endpoint |
| C2 | Critical | Drizzle ORM SQL injection vulnerability (unpatched dep) |
| H1 | High | iOS ATS fully disabled (NSAllowsArbitraryLoads) |
| H2 | High | Capacitor allows navigation to any origin |
| H3 | High | SSH host key verification disabled in CI deploy |
| H4 | High | Inngest keys have insecure default values |
| M1 | Medium | entityId not validated against known HA entities |
| M2 | Medium | Internal error messages logged with full detail |
| M3 | Medium | Loki authentication disabled |
| M4 | Medium | Merge conflict markers + debug code in production iOS file |
| M5 | Medium | CI Postgres uses hardcoded credentials (pattern risk) |
| L1 | Low | Build hash exposed unauthenticated |
| L2 | Low | No CORS configuration (currently safe by same-origin) |
| L3 | Low | No rate limiting |
| L4 | Low | esbuild dev server vulnerability (dev-only) |
| L5 | Low | DATABASE_URL has default credentials in env schema |
