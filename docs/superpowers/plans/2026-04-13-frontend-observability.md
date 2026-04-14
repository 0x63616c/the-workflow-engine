# Frontend Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **IMPORTANT:** Merge `main` into your worktree branch before starting. Run `bun install` after creating the worktree.

**Goal:** Capture all frontend errors (React crashes, uncaught exceptions, unhandled rejections, failed tRPC requests) and send them to the existing Grafana/Loki stack via Grafana Faro SDK + Alloy. Show toast notifications in the UI when errors occur. Provide a Grafana dashboard for frontend error visibility.

**Architecture:** The Faro Web SDK runs in the browser and automatically captures errors, console logs, and web vitals. It POSTs telemetry to Alloy's `faro.receiver` endpoint (proxied through the API at `/api/collect` to avoid CORS and extra port exposure). Alloy forwards logs to Loki. Grafana queries Loki for frontend error dashboards. Sonner provides toast notifications in the UI, triggered by Faro's `beforeSend` hook.

**Tech Stack:** `@grafana/faro-web-sdk`, `@grafana/faro-react`, `sonner`, existing Grafana Alloy + Loki

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/lib/faro.ts` | Create | Faro SDK initialization, beforeSend hook for toasts |
| `apps/web/src/components/toast-provider.tsx` | Create | Sonner `<Toaster>` component with iPad-appropriate config |
| `apps/web/src/routes/__root.tsx` | Modify | Add `<Toaster>`, initialize Faro |
| `apps/web/src/components/error-boundary.tsx` | Modify | Add Faro error reporting to `componentDidCatch` |
| `apps/web/src/lib/trpc.ts` | Modify | Add error logging link for tRPC request failures |
| `apps/web/package.json` | Modify | Add `@grafana/faro-web-sdk`, `@grafana/faro-react`, `sonner` |
| `apps/api/src/server.ts` | Modify | Add `/api/collect` proxy route to Alloy |
| `apps/api/src/env.ts` | Modify | Add `ALLOY_URL` env var |
| `infra/logging/alloy/config.alloy` | Modify | Add `faro.receiver` block |
| `infra/logging/grafana/dashboards/frontend-errors.json` | Create | Provisioned Grafana dashboard |
| `infra/logging/grafana/dashboard-provider.yaml` | Create | Dashboard provisioning config |
| `infra/logging/grafana/Dockerfile` | Modify | Copy dashboard files into image |
| `config/deploy.yml` | Modify | Add `ALLOY_URL` to env, expose faro port |
| `Dockerfile` | Modify | Add `VITE_FARO_URL` and `VITE_BUILD_HASH` build args |
| `docs/logging.md` | Modify | Add frontend observability section |
| `docs/architecture.md` | Modify | Update data flow diagram |
| `CLAUDE.md` | Modify | Add observability ports to port table |
| `apps/web/src/__tests__/faro.test.ts` | Create | Unit tests for Faro init and dedup |
| `apps/web/src/__tests__/toast-provider.test.tsx` | Create | Render test for Toaster |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install Faro and sonner packages**

```bash
cd apps/web
bun add @grafana/faro-web-sdk @grafana/faro-react sonner
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/web && bun run typecheck
```

Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json bun.lock
git commit -m "feat: add @grafana/faro-web-sdk, @grafana/faro-react, sonner"
git push
```

---

## Task 2: Toast Provider Component

**Files:**
- Create: `apps/web/src/components/toast-provider.tsx`
- Test: `apps/web/src/__tests__/toast-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/__tests__/toast-provider.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@/components/toast-provider";

describe("ToastProvider", () => {
  it("renders the Toaster component", () => {
    const { container } = render(<ToastProvider />);
    // Sonner renders a <ol> with data-sonner-toaster attribute
    const toaster = container.querySelector("[data-sonner-toaster]");
    expect(toaster).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && bunx vitest run src/__tests__/toast-provider.test.tsx
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write the ToastProvider component**

```tsx
// apps/web/src/components/toast-provider.tsx
import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      richColors
      closeButton
      duration={5000}
      visibleToasts={3}
      toastOptions={{
        style: {
          fontSize: "14px",
        },
      }}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && bunx vitest run src/__tests__/toast-provider.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/toast-provider.tsx apps/web/src/__tests__/toast-provider.test.tsx
git commit -m "feat: add ToastProvider component with sonner"
git push
```

---

## Task 3: Faro SDK Initialization

**Files:**
- Create: `apps/web/src/lib/faro.ts`
- Test: `apps/web/src/__tests__/faro.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/__tests__/faro.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@grafana/faro-web-sdk", () => ({
  initializeFaro: vi.fn(() => ({
    api: {
      pushError: vi.fn(),
      pushLog: vi.fn(),
    },
  })),
  getWebInstrumentations: vi.fn(() => []),
}));

vi.mock("@grafana/faro-react", () => ({
  ReactIntegration: vi.fn(),
}));

describe("faro", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initFaro returns a faro instance when URL is provided", async () => {
    const { initializeFaro } = await import("@grafana/faro-web-sdk");
    const { initFaro } = await import("@/lib/faro");

    const faro = initFaro("https://example.com/api/collect", "test-app", "1.0.0");

    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/api/collect",
        app: expect.objectContaining({
          name: "test-app",
          version: "1.0.0",
        }),
      }),
    );
    expect(faro).toBeDefined();
  });

  it("initFaro returns null when url is empty", async () => {
    const { initFaro } = await import("@/lib/faro");

    const faro = initFaro("", "test-app", "1.0.0");

    expect(faro).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && bunx vitest run src/__tests__/faro.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write the Faro initialization module**

```ts
// apps/web/src/lib/faro.ts
import { ReactIntegration } from "@grafana/faro-react";
import { getWebInstrumentations, initializeFaro } from "@grafana/faro-web-sdk";
import { toast } from "sonner";

import type { Faro } from "@grafana/faro-web-sdk";

const DEDUP_WINDOW_MS = 60_000;
const recentErrors = new Map<string, number>();

function dedupeKey(message: string, stack?: string): string {
  return `${message}::${stack?.slice(0, 200) ?? ""}`;
}

function isDuplicate(key: string): boolean {
  const lastSeen = recentErrors.get(key);
  if (lastSeen && Date.now() - lastSeen < DEDUP_WINDOW_MS) {
    return true;
  }
  recentErrors.set(key, Date.now());
  return false;
}

export function initFaro(url: string, appName: string, appVersion: string): Faro | null {
  if (!url) {
    return null;
  }

  const faro = initializeFaro({
    url,
    app: {
      name: appName,
      version: appVersion,
    },
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: false,
      }),
      new ReactIntegration(),
    ],
    beforeSend: (event) => {
      if (event.type === "error" || event.type === "exception") {
        const message =
          event.payload?.message ?? event.payload?.value ?? "An unexpected error occurred";
        const key = dedupeKey(message, event.payload?.stacktrace?.toString());

        if (!isDuplicate(key)) {
          toast.error("Something went wrong", {
            description: message.length > 120 ? `${message.slice(0, 120)}...` : message,
          });
        }
      }
      return event;
    },
  });

  return faro;
}

export { isDuplicate as _isDuplicate, recentErrors as _recentErrors };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && bunx vitest run src/__tests__/faro.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add dedup tests**

Append to the same test file:

```ts
describe("dedup", () => {
  it("deduplicates identical errors within the window", async () => {
    const { _isDuplicate, _recentErrors } = await import("@/lib/faro");
    _recentErrors.clear();

    const first = _isDuplicate("test-key");
    const second = _isDuplicate("test-key");

    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it("allows the same error after the dedup window expires", async () => {
    const { _isDuplicate, _recentErrors } = await import("@/lib/faro");
    _recentErrors.clear();

    _recentErrors.set("test-key", Date.now() - 61_000);
    const result = _isDuplicate("test-key");

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 6: Run all faro tests**

```bash
cd apps/web && bunx vitest run src/__tests__/faro.test.ts
```

Expected: PASS, all tests green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/faro.ts apps/web/src/__tests__/faro.test.ts
git commit -m "feat: add Faro SDK initialization with dedup and toast integration"
git push
```

---

## Task 4: Wire Faro + Toaster into Root Layout

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`
- Modify: `apps/web/src/components/error-boundary.tsx`

- [ ] **Step 1: Update __root.tsx**

Add ToastProvider and initialize Faro at module level. Keep the existing ErrorBoundary as the UI fallback (it shows retry/reload). Faro reporting happens inside the ErrorBoundary's `componentDidCatch`.

```tsx
// apps/web/src/routes/__root.tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ConnectionStatus } from "@/components/connection-status";
import { ErrorBoundary } from "@/components/error-boundary";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CardOverlay } from "@/components/hub/card-overlay";
import { ToastProvider } from "@/components/toast-provider";
import { useAutoReload } from "@/hooks/use-auto-reload";
import { initFaro } from "@/lib/faro";

initFaro(
  import.meta.env.VITE_FARO_URL ?? "",
  "workflow-engine-web",
  import.meta.env.VITE_BUILD_HASH ?? "dev",
);

function RootLayout() {
  useAutoReload();

  return (
    <ErrorBoundary>
      <AppShell>
        <Outlet />
      </AppShell>
      <Header />
      <Footer />
      <CardOverlay />
      <ConnectionStatus />
      <ToastProvider />
    </ErrorBoundary>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
```

- [ ] **Step 2: Update ErrorBoundary to report to Faro**

Add a single import and a Faro pushError call inside `componentDidCatch`. The rest of the file stays identical.

Add this import at the top:

```ts
import { faro } from "@grafana/faro-web-sdk";
```

Replace the `componentDidCatch` method body:

```ts
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] React crash:", error, info.componentStack);

    const faroInstance = faro.api;
    if (faroInstance) {
      faroInstance.pushError(error, {
        context: {
          componentStack: info.componentStack ?? "unknown",
        },
      });
    }

    this.scheduleAutoRetry();
  }
```

No other changes to error-boundary.tsx. The render method, retry logic, and everything else stays the same.

- [ ] **Step 3: Run typecheck**

```bash
cd apps/web && bun run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run existing tests**

```bash
cd apps/web && bun run test
```

Expected: PASS, all existing tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/__root.tsx apps/web/src/components/error-boundary.tsx
git commit -m "feat: wire Faro SDK and ToastProvider into root layout"
git push
```

---

## Task 5: tRPC Error Reporting Link

**Files:**
- Modify: `apps/web/src/lib/trpc.ts`

tRPC catches its own errors internally so they don't bubble to `window.onerror`. We add a custom link that reports tRPC failures to Faro.

- [ ] **Step 1: Add error reporting link**

```ts
// apps/web/src/lib/trpc.ts
import { faro } from "@grafana/faro-web-sdk";
import type { AppRouter } from "@repo/api/trpc";
import {
  type TRPCLink,
  httpBatchLink,
  splitLink,
  unstable_httpSubscriptionLink,
} from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { createTRPCReact } from "@trpc/react-query";

const errorReportingLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          const faroApi = faro.api;
          if (faroApi) {
            faroApi.pushError(new Error(`tRPC ${op.type} ${op.path}: ${err.message}`), {
              context: {
                source: "trpc-request",
                path: op.path,
                type: op.type,
                code: err.data?.code ?? "UNKNOWN",
              },
            });
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    errorReportingLink,
    splitLink({
      condition: (op) => op.type === "subscription",
      true: unstable_httpSubscriptionLink({ url: "/trpc" }),
      false: httpBatchLink({ url: "/trpc" }),
    }),
  ],
});
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run tests**

```bash
cd apps/web && bun run test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/trpc.ts
git commit -m "feat: add tRPC error reporting link for Faro"
git push
```

---

## Task 6: API Collect Proxy Route

**Files:**
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/env.ts`

The browser sends Faro telemetry to `/api/collect` on the same origin. The API proxies this to Alloy's `faro.receiver`. No CORS issues, no extra port exposure to the browser.

- [ ] **Step 1: Add ALLOY_URL to env.ts**

Add to the Zod schema in `apps/api/src/env.ts`:

```ts
ALLOY_URL: z.string().default("http://workflow-engine-alloy:12346"),
```

Note: not `.url()` validated because in dev this won't resolve and that's fine. The proxy route handles unreachable Alloy gracefully (returns 502).

- [ ] **Step 2: Add proxy route in server.ts**

Add this block after the Inngest handler and before the static file serving:

```ts
    // Faro telemetry proxy -> Alloy faro.receiver
    if (url.pathname === "/api/collect") {
      try {
        const body = await req.text();
        const upstream = await fetch(`${env.ALLOY_URL}/collect`, {
          method: req.method,
          headers: {
            "Content-Type": req.headers.get("Content-Type") ?? "application/json",
          },
          body: req.method !== "GET" ? body : undefined,
        });
        return respond(new Response(upstream.body, { status: upstream.status }));
      } catch {
        return respond(new Response("Bad Gateway", { status: 502 }));
      }
    }
```

- [ ] **Step 3: Run typecheck**

```bash
cd apps/api && bun run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/server.ts
git commit -m "feat: add /api/collect proxy route for Faro telemetry to Alloy"
git push
```

---

## Task 7: Alloy faro.receiver Configuration

**Files:**
- Modify: `infra/logging/alloy/config.alloy`

The `faro.receiver` component creates its own HTTP listener. Alloy's debug UI already uses port 12345, so the faro receiver uses port 12346.

- [ ] **Step 1: Update config.alloy**

Replace the entire file with:

```hcl
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

discovery.relabel "docker" {
  targets = discovery.docker.containers.targets

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "container"
  }

  rule {
    source_labels = ["__meta_docker_container_id"]
    target_label  = "container_id"
  }

  rule {
    source_labels = ["__meta_docker_container_image"]
    target_label  = "image"
  }
}

loki.source.docker "default" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.relabel.docker.output
  forward_to = [loki.write.local.receiver]

  refresh_interval = "5s"
}

// Process Faro frontend logs: extract kind and app labels
loki.process "faro" {
  forward_to = [loki.write.local.receiver]

  stage.logfmt {
    mapping = { "kind" = "", "app" = "" }
  }

  stage.labels {
    values = { "kind" = "kind", "app" = "app" }
  }
}

// Receive frontend telemetry from Faro SDK (proxied via API /api/collect)
faro.receiver "frontend" {
  server {
    listen_address = "0.0.0.0"
    listen_port    = 12346

    cors_allowed_origins = ["*"]

    max_allowed_payload_size = "5MiB"

    rate_limiting {
      rate = 50
    }
  }

  extra_log_labels = {
    "source" = "faro",
    "app"    = "workflow-engine-web",
  }

  log_format = "json"

  sourcemaps {}

  output {
    logs = [loki.process.faro.receiver]
  }
}

loki.write "local" {
  endpoint {
    url = "http://workflow-engine-loki:3100/loki/api/v1/push"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/logging/alloy/config.alloy
git commit -m "feat: add faro.receiver to Alloy config for frontend telemetry"
git push
```

---

## Task 8: Update Kamal Deploy Config

**Files:**
- Modify: `config/deploy.yml`

- [ ] **Step 1: Add ALLOY_URL and VITE build args**

Add `ALLOY_URL` to the `env.clear` section:

```yaml
env:
  clear:
    NODE_ENV: production
    PORT: "4301"
    PORT_OFFSET: "0"
    INNGEST_DEV: "0"
    HA_URL: "http://host.docker.internal:8123"
    ALLOY_URL: "http://workflow-engine-alloy:12346"
```

Add `VITE_FARO_URL` and `VITE_BUILD_HASH` to `builder.args`:

```yaml
builder:
  args:
    BUILD_HASH: <%= `git rev-parse --short HEAD`.strip %>
    VITE_WIFI_SSID: <%= ENV["VITE_WIFI_SSID"] %>
    VITE_WIFI_PASSWORD: <%= ENV["VITE_WIFI_PASSWORD"] %>
    VITE_FARO_URL: "/api/collect"
    VITE_BUILD_HASH: <%= `git rev-parse --short HEAD`.strip %>
```

- [ ] **Step 2: Expose faro receiver port on Alloy accessory**

Update the `alloy` accessory port config:

```yaml
  alloy:
    image: ghcr.io/0x63616c/workflow-engine-alloy:latest
    host: homelab
    port:
      - "12345:12345"
      - "12346:12346"
    cmd: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
    options:
      volume:
        - "/var/run/docker.sock:/var/run/docker.sock:ro"
```

- [ ] **Step 3: Commit**

```bash
git add config/deploy.yml
git commit -m "feat: add ALLOY_URL env and faro port to Kamal deploy config"
git push
```

---

## Task 9: Dockerfile Build Args

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Check existing Dockerfile for VITE_ arg pattern**

```bash
grep -n "VITE_\|ARG" Dockerfile
```

Follow the existing pattern for `VITE_WIFI_SSID` / `VITE_WIFI_PASSWORD`. Add:

```dockerfile
ARG VITE_FARO_URL=""
ARG VITE_BUILD_HASH=""
```

And in the build stage, ensure they're available as env vars:

```dockerfile
ENV VITE_FARO_URL=$VITE_FARO_URL
ENV VITE_BUILD_HASH=$VITE_BUILD_HASH
```

- [ ] **Step 2: Run typecheck to verify nothing broke**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add VITE_FARO_URL and VITE_BUILD_HASH build args to Dockerfile"
git push
```

---

## Task 10: Grafana Dashboard for Frontend Errors

**Files:**
- Create: `infra/logging/grafana/dashboards/frontend-errors.json`
- Create: `infra/logging/grafana/dashboard-provider.yaml`
- Modify: `infra/logging/grafana/Dockerfile`

- [ ] **Step 1: Create dashboard provisioning config**

```yaml
# infra/logging/grafana/dashboard-provider.yaml
apiVersion: 1

providers:
  - name: "default"
    orgId: 1
    folder: ""
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards/json
      foldersFromFilesStructure: false
```

- [ ] **Step 2: Create the frontend errors dashboard**

Create `infra/logging/grafana/dashboards/frontend-errors.json`:

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "panels": [
    {
      "title": "Frontend Errors Over Time",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 0 },
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "" },
          "expr": "sum(count_over_time({source=\"faro\", app=\"workflow-engine-web\"} | json | kind=\"error\" [$__interval]))",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": {
            "fillOpacity": 20,
            "lineWidth": 2,
            "pointSize": 5,
            "drawStyle": "line",
            "showPoints": "auto"
          }
        },
        "overrides": []
      }
    },
    {
      "title": "Error Logs",
      "type": "logs",
      "gridPos": { "h": 12, "w": 24, "x": 0, "y": 8 },
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "" },
          "expr": "{source=\"faro\", app=\"workflow-engine-web\"} | json | kind=\"error\" or kind=\"exception\"",
          "refId": "A"
        }
      ],
      "options": {
        "showTime": true,
        "showLabels": true,
        "showCommonLabels": false,
        "wrapLogMessage": true,
        "prettifyLogMessage": true,
        "enableLogDetails": true,
        "sortOrder": "Descending"
      }
    },
    {
      "title": "All Frontend Events",
      "type": "logs",
      "gridPos": { "h": 10, "w": 24, "x": 0, "y": 20 },
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "" },
          "expr": "{source=\"faro\", app=\"workflow-engine-web\"} | json",
          "refId": "A"
        }
      ],
      "options": {
        "showTime": true,
        "showLabels": true,
        "showCommonLabels": false,
        "wrapLogMessage": true,
        "prettifyLogMessage": true,
        "enableLogDetails": true,
        "sortOrder": "Descending"
      }
    }
  ],
  "schemaVersion": 39,
  "tags": ["frontend", "faro", "errors"],
  "templating": { "list": [] },
  "time": { "from": "now-24h", "to": "now" },
  "timepicker": {},
  "timezone": "browser",
  "title": "Frontend Observability",
  "uid": "frontend-observability",
  "version": 1
}
```

- [ ] **Step 3: Update Grafana Dockerfile**

```dockerfile
FROM grafana/grafana:11.6.0
COPY datasource.yaml /etc/grafana/provisioning/datasources/loki.yaml
COPY dashboard-provider.yaml /etc/grafana/provisioning/dashboards/default.yaml
COPY dashboards/ /etc/grafana/provisioning/dashboards/json/
```

- [ ] **Step 4: Commit**

```bash
git add infra/logging/grafana/
git commit -m "feat: add provisioned Grafana dashboard for frontend observability"
git push
```

---

## Task 11: Update Documentation

**Files:**
- Modify: `docs/logging.md`
- Modify: `docs/architecture.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add frontend observability section to docs/logging.md**

Insert after the "Querying Logs" section:

```markdown
## Frontend Observability (Faro)

Frontend errors, exceptions, and web vitals are captured by the [Grafana Faro Web SDK](https://grafana.com/oss/faro/) running in the browser.

### Data Flow

```
Browser (Faro SDK)
    |
    v (POST /api/collect)
API server (proxy)
    |
    v (HTTP forward)
Alloy (faro.receiver, port 12346)
    |
    v (loki.process -> loki.write)
Loki
    |
    v (query)
Grafana ("Frontend Observability" dashboard)
```

### What's Captured

- **JS errors**: uncaught exceptions, unhandled promise rejections
- **React crashes**: ErrorBoundary componentDidCatch with component stack
- **tRPC request failures**: path, type, error code
- **Web vitals**: LCP, FID, CLS (automatic via Faro)

### Querying Frontend Logs

```logql
# All frontend events
{source="faro", app="workflow-engine-web"} | json

# Errors only
{source="faro", app="workflow-engine-web"} | json | kind="error"

# tRPC request errors
{source="faro", app="workflow-engine-web"} | json | kind="error" |~ "tRPC"
```

### Dashboard

Open Grafana at `http://homelab:3000`, navigate to Dashboards, select **Frontend Observability**.

### Toast Notifications

Errors also trigger toast notifications in the UI via [sonner](https://sonner.emilkowal.ski/). Toasts auto-dismiss after 5 seconds and are deduped (same error won't toast more than once per 60 seconds).
```

- [ ] **Step 2: Update docs/architecture.md data flow diagram**

Replace the existing Data Flow section with:

```
Browser
  |
  |  HTTP (queries/mutations)
  |  POST /api/collect (Faro telemetry)
  v
API Server (port 4301)
  |
  +---> /trpc/* -> tRPC Routers -> Services
  |       |
  |       +---> Drizzle ORM ---> PostgreSQL (port 5432)
  |       +---> Inngest Client ---> Inngest Server (port 8288)
  |       +---> Integration Plugins (Home Assistant, Slack)
  |
  +---> /api/collect -> Alloy faro.receiver (port 12346)
                          |
                          v
                        Loki (port 3100) -> Grafana (port 3000)
```

Also update the `db/` layer description: replace `bun:sqlite` with `drizzle-orm`, `pg` if not already done.

- [ ] **Step 3: Update CLAUDE.md port table**

Add to the existing port table:

```markdown
| Alloy debug  | 12345        |
| Alloy faro   | 12346        |
| Grafana      | 3000         |
| Loki         | 3100         |
```

- [ ] **Step 4: Commit**

```bash
git add docs/logging.md docs/architecture.md CLAUDE.md
git commit -m "docs: update architecture and logging docs with frontend observability"
git push
```

---

## Task 12: Visual Verification

**Files:**
- Screenshots saved to: `docs/screenshots/`

- [ ] **Step 1: Start the dev server**

```bash
cd apps/web && VITE_FARO_URL="" bun run dev
```

Faro is disabled in dev (empty URL), but toasts work independently.

- [ ] **Step 2: Open browser at iPad resolution (2732x2048)**

Use agent-browser in headless mode at iPad resolution.

- [ ] **Step 3: Trigger a toast notification**

In the browser console, run:

```js
window.__testToast = true;
```

Or add a temporary trigger. Alternatively, use sonner's API directly from the console. The simplest approach: temporarily add a test button to the UI that calls `toast.error("Something went wrong", { description: "Failed to fetch countdown events" })`, verify visually, then remove it.

- [ ] **Step 4: Screenshot the toast**

Capture the page with the toast visible. Save to `docs/screenshots/toast-error-notification.png`.

Verify:
- Toast is visible at bottom-center of the iPad screen
- Text is readable at iPad resolution
- Dark theme matches the app
- Close button is present and tappable-sized
- Toast auto-dismisses after 5 seconds

- [ ] **Step 5: Commit screenshot**

```bash
git add docs/screenshots/toast-error-notification.png
git commit -m "docs: add screenshot of error toast notification"
git push
```

---

## Task 13: Full Integration Test

- [ ] **Step 1: Run full typecheck**

```bash
bun run typecheck
```

Expected: PASS across all workspaces.

- [ ] **Step 2: Run full test suite**

```bash
bun run test
```

Expected: PASS, all tests green.

- [ ] **Step 3: Run lint**

```bash
bun run lint:fix
```

Expected: PASS or auto-fixed.

- [ ] **Step 4: Run boundary check**

```bash
bun run check:boundaries
```

Expected: PASS. New imports (`@grafana/faro-web-sdk`, `@grafana/faro-react`, `sonner`) are all in `apps/web/` which has no strict boundary rules.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A && git commit -m "chore: lint fixes" && git push
```

Only if there were auto-fixes.

---

## Self-Review

**Spec coverage:**
- [x] Frontend error capture (React crashes, uncaught errors, unhandled rejections): Faro SDK handles all three automatically
- [x] tRPC request failure reporting: custom tRPC link in Task 5
- [x] Toast notifications: sonner in Tasks 2 and 4
- [x] Grafana dashboard: Task 10
- [x] Alloy faro.receiver config: Task 7
- [x] API proxy for telemetry: Task 6
- [x] Dedup logic: Task 3
- [x] Architecture docs update: Task 11
- [x] Visual verification with screenshot: Task 12
- [x] Kamal deploy config: Task 8
- [x] Dockerfile build args: Task 9

**Placeholder scan:** No TBD/TODO items. All code blocks complete.

**Type consistency:** `initFaro` used consistently. `faro.api` accessed via global singleton from `@grafana/faro-web-sdk`. `toast.error` from sonner used in `beforeSend` hook.
