# Future Architecture & Next-Level Tech Planning

**Evee** — wall-mounted iPad Pro smart home panel

*Document date: 2026-04-12*

---

## 1. Current Architecture: Strengths & Limitations

### What's working well

**Strong foundations the future should build on:**

- tRPC with `splitLink` is the right call. HTTP batch for queries, SSE for subscriptions — ready for real-time without switching to WebSockets.
- The `Integration` interface is clean. `init / getState / execute / subscribe` is a good contract. The boundary rules (`integrations/` can't import `db/` or `services/`) enforce a healthy dependency direction.
- Inngest is the right event/queue infrastructure. Self-hosted, durable, with a dev UI. Zero functions registered yet — it's a waiting engine.
- Zustand stores are thin and well-typed. The theme store's `registerPalette` pattern is a preview of what the whole card system should become.
- Bun as runtime and test runner is a strong choice. Fast, native TypeScript, no transpile step.

**Honest assessment of limitations:**

- **No notification system.** Listed as Core System #1 in CLAUDE.md, but completely absent. Every future integration will want to surface alerts — smart plugs tripping, calendar events starting, stock prices hitting targets. Without a central bus this gets bolted on per-card.
- **Polling everywhere.** Lights, Sonos — both poll every 5 seconds via TanStack Query. Fine for 2 integrations, wrong pattern for 10. HA has a WebSocket/SSE event bus; we're not using it.
- **`Integration` interface is too generic.** `execute(command: string, params: Record<string, unknown>)` is an untyped catch-all. No schema, no type safety at the boundary. Works for one integration; breaks down when you need to surface strongly-typed commands to the UI.
- **Cards are hardcoded.** `card-registry.ts` and `EXPANDED_VIEWS` in `card-overlay.tsx` are parallel static arrays. Adding a card requires touching both files plus the widget-grid. There's no plugin registration step.
- **SQLite is fine for now.** But `schema.ts` already imports from `drizzle-orm/pg-core`, not SQLite. The env default is PostgreSQL. The schema and the actual runtime are mismatched — this needs resolving before adding notification persistence.
- **No auth middleware.** Context is bare `db`. `publicProcedure` exposes everything. Acceptable for a single-user home panel, but webhooks and external APIs (#79, #80) require at least HMAC verification.
- **No observability.** Request logging exists. No structured logs, no error aggregation, no alerting. Grafana/Loki (#120) is partially set up at infra but nothing ships structured log payloads.

---

## 2. Notification System Design

### Architecture overview

```
┌─────────────────────────────────────────────────────┐
│                  NOTIFICATION BUS                    │
│                                                      │
│  Integration  ──► event.emit()                       │
│  Inngest fn   ──► event.emit()                       │
│  Webhook      ──► event.emit()                       │
│                        │                            │
│                   ┌────▼────┐                       │
│                   │  bus.ts  │  (EventEmitter)       │
│                   └────┬────┘                       │
│                        │                            │
│            ┌───────────┼───────────┐                │
│            ▼           ▼           ▼                │
│       persist()    deliver()    broadcast()          │
│       (Postgres)  (Slack/Evee) (SSE to iPad)        │
└─────────────────────────────────────────────────────┘
```

### Database schema additions

```sql
-- notifications table
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,             -- 'alert' | 'info' | 'warning' | 'event'
  source       TEXT NOT NULL,             -- integration id: 'homeassistant', 'calendar', etc.
  title        TEXT NOT NULL,
  body         TEXT,
  payload      JSONB,                     -- arbitrary structured data from source
  read_at      TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX notifications_created_at ON notifications (created_at DESC);
CREATE INDEX notifications_unread ON notifications (read_at) WHERE read_at IS NULL;
```

### Notification bus (`apps/api/src/notifications/bus.ts`)

```ts
import { EventEmitter } from "node:events";
import type { NotificationInput } from "@repo/shared";

// Singleton in-process event bus
export const notificationBus = new EventEmitter();

export function emit(notification: NotificationInput): void {
  notificationBus.emit("notification", notification);
}
```

### Notification service (`apps/api/src/services/notification-service.ts`)

```ts
import { notificationBus } from "../notifications/bus";
import type { NotificationInput } from "@repo/shared";

// Called once at server startup
export function startNotificationService(db: DrizzleDb): void {
  notificationBus.on("notification", async (n: NotificationInput) => {
    await Promise.all([
      persistNotification(db, n),
      deliverToSlack(n),
      broadcastToSSE(n),
    ]);
  });
}
```

### tRPC subscription router

The SSE infrastructure already exists via `unstable_httpSubscriptionLink`. The notification router plugs straight in:

```ts
// apps/api/src/trpc/routers/notifications.ts
export const notificationsRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().default(20), unreadOnly: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      return getRecentNotifications(ctx.db, input);
    }),

  markRead: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return markNotificationRead(ctx.db, input.id);
    }),

  // SSE subscription — iPad gets live push
  onNew: publicProcedure.subscription(async function* ({ ctx }) {
    const queue: unknown[] = [];
    const handler = (n: unknown) => queue.push(n);
    notificationBus.on("notification", handler);
    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift();
        } else {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    } finally {
      notificationBus.off("notification", handler);
    }
  }),
});
```

### Delivery channels

**Slack (Evee bot):** Inngest function, triggered by notification events. Rate-limited per source. Only `type: 'alert'` or `type: 'warning'` get Slack pings by default.

**iPad SSE:** Always delivered. iPad renders a notification tray or badge over the grid.

**Inngest integration:** Any integration can fire `inngest.send({ name: "notification/new", data: payload })`. An Inngest function picks it up, enriches it, and calls `emit()`. This gives durable delivery with retry — critical for time-sensitive alerts (stock price, door unlock, etc.).

### Notification card on the grid

A dedicated notification card (replacing or augmenting `system`) showing:
- Unread count badge
- Last 3 notifications in the mini card
- Expanded view: full notification history, mark-all-read

---

## 3. Integration Hub v2

### Problem with v1

The current `Integration` interface is too abstract:

```ts
execute(command: string, params: Record<string, unknown>): Promise<unknown>
```

This means the UI has no idea what commands exist, and there's no compile-time safety when calling from services. Adding 10 integrations with 5 commands each makes this unmaintainable.

### v2 Interface

```ts
// libs/shared/src/integrations/types.ts
export interface IntegrationCapability<TInput, TOutput> {
  description: string;
  input: z.ZodSchema<TInput>;
  output: z.ZodSchema<TOutput>;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  capabilities: Record<string, IntegrationCapability<unknown, unknown>>;
}

export interface IntegrationRuntime {
  config: IntegrationConfig;
  init(): Promise<void>;
  teardown?(): Promise<void>;
  getHealth(): Promise<IntegrationHealth>;
  run<T>(capability: string, input: unknown): Promise<T>;
  subscribe?(handler: IntegrationEventHandler): IntegrationUnsubscribe;
}

export interface IntegrationHealth {
  status: "healthy" | "degraded" | "unavailable";
  latency_MS?: number;
  lastChecked: Date;
  detail?: string;
}
```

### Integration registry

```ts
// apps/api/src/integrations/registry.ts
const registry = new Map<string, IntegrationRuntime>();

export function registerIntegration(integration: IntegrationRuntime): void {
  registry.set(integration.config.id, integration);
}

export function getIntegration(id: string): IntegrationRuntime | undefined {
  return registry.get(id);
}

export function getAllIntegrations(): IntegrationRuntime[] {
  return Array.from(registry.values());
}

// Called at server startup
export async function initAllIntegrations(): Promise<void> {
  for (const integration of registry.values()) {
    try {
      await integration.init();
    } catch (err) {
      console.error(`[integrations] ${integration.config.id} init failed:`, err);
    }
  }
}
```

### Lifecycle management in server.ts

```ts
// Register all integrations at startup
registerIntegration(new HomeAssistantIntegration());
registerIntegration(new CalendarIntegration());
registerIntegration(new WeatherIntegration());

await initAllIntegrations();

// Subscribe all event-emitting integrations to the notification bus
for (const integration of getAllIntegrations()) {
  integration.subscribe?.((event) => {
    emit({ source: integration.config.id, ...event });
  });
}
```

### Priority integration roadmap

**Phase 1 — foundation**

| Integration | Issue | Key capabilities |
|-------------|-------|-----------------|
| Smart Plugs (HA) | #141 | get_state, turn_on, turn_off, get_power_usage |
| Notifications bus | — | persist, deliver, subscribe |
| Webhook ingestion | #79 | receive, validate, route to Inngest |

**Phase 2 — data**

| Integration | Issue | Key capabilities |
|-------------|-------|-----------------|
| Weather (Open-Meteo) | — | current, forecast, hourly |
| Calendar (CalDAV or Google) | — | list_events, today_summary |
| Stocks | #85 | get_quote, set_alert, portfolio_value |

**Phase 3 — interactive**

| Integration | Issue | Key capabilities |
|-------------|-------|-----------------|
| LG Appliances (ThinQ) | #86 | get_state, run_course, set_mode |
| Voice assistant | #92 | speech_to_intent, respond |
| Banking | #84 | get_balance, recent_transactions (read-only) |

---

## 4. Real-Time Architecture

### Current state

All data is polled. TanStack Query with `refetchInterval: 5000` on lights and Sonos. No push from server to iPad.

### Recommendation: Stay with SSE, add HA WebSocket relay

**Do not switch to WebSockets.** SSE works well on iOS WKWebView, is simpler than WebSocket over Tailscale VPN, and tRPC's `unstable_httpSubscriptionLink` already handles it. WebSocket adds complexity (connection negotiation, ping/pong, reconnect logic) for no meaningful benefit at this scale.

**Add HA WebSocket relay in the API.** Home Assistant has a WebSocket API that pushes state changes in real-time. Instead of the iPad polling HA state every 5 seconds, the API maintains one long-lived WebSocket to HA and relays relevant events to the iPad via SSE:

```
iPad <--SSE-- API <--WebSocket-- Home Assistant
```

```ts
// apps/api/src/integrations/homeassistant/ws-relay.ts
import type { ServerWebSocket } from "bun";

export class HaWebSocketRelay {
  private ws: WebSocket | null = null;

  connect(url: string, token: string, onEvent: (event: HaStateChange) => void): void {
    this.ws = new WebSocket(`${url.replace("http", "ws")}/api/websocket`);
    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data as string);
      if (data.type === "event" && data.event.event_type === "state_changed") {
        onEvent(data.event.data as HaStateChange);
      }
    };
    // Auth handshake, subscribe to state_changed events
  }
}
```

Subscribe the relay to the notification bus so state changes surface as notifications when relevant (e.g., a door contact sensor opening at 2am).

### SSE subscription design for iPad

```
trpc.notifications.onNew.useSubscription(undefined, {
  onData: (notification) => addToast(notification),
});

trpc.devices.onStateChange.useSubscription({ entities: ["light.*", "media_player.*"] }, {
  onData: (change) => queryClient.setQueryData(["devices.lights"], updater),
});
```

This eliminates polling for HA-connected cards entirely.

### Event sourcing with Inngest

For anything that needs history or retry guarantees:

```
External trigger (webhook, schedule, HA event)
  -> inngest.send({ name: "ha/state-changed", data: payload })
    -> Inngest function: enrich, decide if notification-worthy
      -> notification-service.emit()
        -> persist + SSE + Slack
```

Inngest provides the audit log for free (event history in dev UI). Every state change that matters is a durable, replayable event.

---

## 5. Observability & Reliability Roadmap

### Fix the database mismatch first

`schema.ts` uses `drizzle-orm/pg-core` but the env says `DATABASE_URL` with a PostgreSQL default. The migration directory has SQLite migrations (`0000_glossy_earthquake.sql`). This inconsistency needs resolving before adding more tables. Decision: commit to PostgreSQL (the prod infra already has it via Kamal secrets).

### Structured logging

Replace the inline `console.log` in `server.ts` with a structured logger:

```ts
// apps/api/src/lib/logger.ts
import pino from "pino";
export const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
```

Log format:
```json
{ "time": "...", "level": "info", "method": "GET", "path": "/trpc/devices.lights", "status": 200, "duration_ms": 42, "requestId": "..." }
```

Loki scrapes Docker container stdout. Grafana dashboard already partially set up (#120) — structured logs make this trivially queryable.

### Error tracking

For a single-user home panel, Sentry is overkill (and a privacy concern for home network telemetry). Instead:

1. Persist unhandled errors to the `notifications` table with `type: 'error'`, `source: 'system'`.
2. Forward these to Slack via Evee with a special "System Error" channel.
3. The `system-status` card on the grid can surface the last 24h error count.

This is zero-dependency error tracking that uses the notification system already being built.

### Health monitoring

Extend the existing `/up` endpoint with a richer `/health` endpoint:

```ts
GET /health
{
  "status": "healthy",
  "database": "healthy",
  "integrations": {
    "homeassistant": { "status": "healthy", "latency_ms": 12 },
    "calendar": { "status": "unavailable", "detail": "auth expired" }
  },
  "uptime_seconds": 86400
}
```

The `system-status` card queries this. CI can hit it post-deploy as a smoke test.

### Backup strategy (#119)

PostgreSQL running in Docker on Mac Mini. Two-layer backup:

1. `pg_dump` Inngest-scheduled daily, uploaded to iCloud Drive or Backblaze B2 via `rclone`.
2. WAL archiving if data grows beyond a few hundred MB (unlikely for a home panel for years).

The daily backup Inngest function is a 20-line job — lowest-hanging fruit in the roadmap.

---

## 6. Next-Level Tech Recommendations

### Priority 1: Real-time HA relay (highest leverage, unlocks all device cards)

Replace 5-second polling with HA WebSocket relay. Every device card becomes live. Presence detection (motion sensors) becomes real-time. This is infrastructure that makes every future feature better.

**Estimated scope:** 1 Inngest function + 1 WebSocket client class + 1 new tRPC subscription router.

### Priority 2: Notification system (unlocks Slack, alerts, history)

Build the notification bus, persistence, SSE delivery, and Evee Slack delivery. This directly resolves #124 (Slack notifications) and provides the foundation for every integration that needs to surface alerts.

### Priority 3: Presence detection

Motion sensor via HA already triggers the idle timeout. Next level: distinguish between "room is empty" and "someone just walked in" to:
- Wake the panel from sleep instantly on presence (sub-100ms via HA WebSocket event)
- Dim the screen on prolonged absence (beyond the current 45s idle timeout)
- Adjust default card focus (show music card if it was playing when person left)

This requires no new hardware. HA already has the motion sensor entity.

### Priority 4: AI-enhanced notifications

Local inference with Ollama on the Mac Mini. Model: `llama3.2:3b` (fast, low memory). Use case: summarise calendar events into a natural language "here's your day" push to the notification bell at 8am. Classify notification urgency (is this a door opening at 3am worth waking the panel?).

Architecture:

```
Inngest scheduled fn (8am)
  -> Ollama REST API (Mac Mini local)
    -> summary text
      -> notification.emit({ type: 'info', title: "Your morning briefing", body: summary })
        -> iPad SSE + Slack
```

No cloud dependency. No API cost. Runs on existing hardware.

### Priority 5: Multi-panel support

The architecture already supports it. The API is network-accessible. A second iPad would need:
- Per-client notification delivery (SSE connections tracked by client ID)
- Panel-specific card layouts (different grid config per panel ID)
- A `panelId` concept in the card registry

Implementation: add `panelId` to SSE subscription input. Route notifications to specific panels or broadcast to all. Store panel-specific config in `panel_configs` table.

### Priority 6: Voice control (#92)

iPad microphone access via Capacitor + Web Speech API (`SpeechRecognition`). On-device speech-to-text (no cloud). Send transcript to API. Inngest function routes intents to the right integration:

```
"turn off the lights" -> ha.execute("turn_all_off", {})
"what's the weather" -> weather.execute("current", {})
"play something relaxing" -> sonos.execute("search_play", { query: "relaxing" })
```

For intent parsing: Ollama on Mac Mini with a small model for classification. Not LLM-level reasoning needed, just pattern matching against a known intent set.

### Priority 7: Advanced art clock states

The clock carousel is the visual centrepiece. Ideas for new states that are technically interesting:

- **Live HA heatmap**: visualise temperature sensor data as an ambient heatmap (requires a few sensors in different rooms)
- **Spotify audio visualiser**: beat-sync animation using Spotify's audio features API
- **Day/night earth**: real-time sun position overlay on a globe (Three.js + SunCalc library)
- **Presence history**: a 24-hour ring showing when the room was occupied — home-made personal analytics

---

## 7. Recommended Build Order

### What to build first for maximum leverage

```
Phase 1: Foundation (unlock everything else)
├── Fix PostgreSQL/SQLite inconsistency
├── Structured logging (pino) + Loki integration
├── Notification bus + persistence + SSE delivery
└── HA WebSocket relay (kill polling)

Phase 2: Integrations (the features people see)
├── Smart plugs #141 (HA entity class, already have HA integration)
├── Weather (Open-Meteo — free, no auth, easy)
├── Calendar (CalDAV — iCloud, Google, works via standard protocol)
└── Webhook ingestion #79 (HMAC-verified endpoint -> Inngest)

Phase 3: Intelligence
├── Notification Slack delivery via Evee #124
├── Daily backup Inngest function #119
├── Grafana/Loki dashboards #120
└── AI morning briefing (Ollama, local)

Phase 4: Next-level
├── Voice control #92
├── Stocks + banking read-only #85 #84
├── Multi-panel support
└── Advanced clock states
```

**Why this order:** Phases 1 and 2 multiply the value of everything else. Real-time HA data + notifications means every card gets better without touching card code. The integrations in Phase 2 are low-auth-friction (Open-Meteo needs no key, CalDAV uses standard protocol). Phase 3 is polish that makes the system feel professional. Phase 4 is the showcase features — worth building once the foundation is solid.

---

## 8. Architecture Diagrams

### Target architecture (post Phase 1+2)

```
┌──────────────────────────────────────────────────────────────────┐
│                    iPad (Capacitor WKWebView)                     │
│                                                                   │
│  React PWA                                                        │
│  ├── TanStack Query (cache layer)                                 │
│  ├── tRPC client (HTTP batch + SSE)                               │
│  └── Zustand (card state, theme, navigation)                      │
│                                                                   │
│  Cards: clock, weather, calendar, lights, music,                  │
│         notifications, countdown, timer, plugs, ...               │
└───────────────────────────┬──────────────────────────────────────┘
                            │ tRPC over HTTPS (Tailscale)
                            │ SSE for subscriptions
┌───────────────────────────▼──────────────────────────────────────┐
│                    Mac Mini (homelab)                             │
│                                                                   │
│  Bun API (apps/api)                                               │
│  ├── tRPC routers (thin wrappers)                                 │
│  ├── Services (business logic)                                    │
│  ├── Notification bus (in-process EventEmitter)                   │
│  ├── Integration registry                                         │
│  │   ├── HomeAssistant (WebSocket relay)                          │
│  │   ├── Calendar (CalDAV)                                        │
│  │   ├── Weather (Open-Meteo)                                     │
│  │   ├── SmartPlugs (HA entity class)                             │
│  │   └── ...                                                      │
│  └── Inngest handler (/api/inngest)                               │
│                                                                   │
│  PostgreSQL                                                       │
│  ├── countdown_events                                             │
│  ├── notifications                                                │
│  ├── panel_configs                                                │
│  └── system_info                                                  │
│                                                                   │
│  Inngest (Docker)                                                 │
│  ├── backup/daily                                                 │
│  ├── notification/deliver                                         │
│  ├── ai/morning-briefing                                          │
│  └── ha/state-enricher                                            │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       Home Assistant   Open-Meteo     CalDAV
       (WebSocket)      (REST)         (REST)
```

### Notification flow

```
Source                   Bus              Consumers
──────                   ───              ─────────
HA event ───────────────►│               ┌► PostgreSQL (persist)
Calendar reminder ───────► emit()   ────►│► SSE → iPad (real-time)
Inngest fn ─────────────►│               └► Slack/Evee (alert only)
Webhook ─────────────────►
```

### Card plugin registration (target state)

```
card-registry.ts                card-overlay.tsx
     │                               │
     └── CARD_CONFIGS[]              └── EXPANDED_VIEWS{}
           ↑                               ↑
           └── card.registerCard({         └── same registration
                 id, gridPos,               call, passing
                 colorScheme,               expandedComponent
                 hasExpandedView            alongside config
               })
```

The goal: touching one file per card, not two. `registerCard` in `card-registry.ts` accepts both the layout config and an optional `expandedComponent`. `CardOverlay` reads from the registry instead of a parallel hardcoded object.

---

## 9. Specific Gaps to Address Before Building

These are pre-conditions for the above to work cleanly:

1. **Resolve DB driver mismatch.** `schema.ts` imports `pg-core` but there are SQLite migration files. Pick one. The env default points to PostgreSQL — commit to it, drop the SQLite migrations, re-run `db:generate`.

2. **Add `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` to env schema.** Notification Slack delivery needs these. They're already in 1Password (Evee credentials).

3. **Register at least one Inngest function.** The `functions: []` in `server.ts` means Inngest is a running but empty engine. The daily backup job is a good first function — low risk, high value.

4. **`tsc --noEmit` on `apps/api/src/trpc/routers/index.ts` shows `@repo/api/trpc` re-export.** Verify this export exists and is consumed correctly by `apps/web/src/lib/trpc.ts`. The circular concern here is worth auditing before adding more routers.

5. **Card overlay refactor.** Before adding new cards (smart plugs, notifications, stocks), consolidate the `EXPANDED_VIEWS` record into the card registry. One-time refactor, then every new card is one file.
