# Architecture

## System Diagram

![System Architecture](screenshots/architecture-system.png)

<details>
<summary>Mermaid source</summary>

```mermaid
graph TB
    subgraph iPad["iPad Pro 12.9&quot; (Wall-Mounted)"]
        PWA["React PWA<br/>Vite + TanStack Router + React 19"]
        Zustand["Zustand Stores<br/>theme, cards, nav, timer"]
        TQ["TanStack Query<br/>server state"]
        PWA --> Zustand
        PWA --> TQ
    end

    subgraph Mac["Mac Mini (homelab, Tailscale)"]
        subgraph Kamal["Kamal-Managed Containers"]
            subgraph App["App Container (Bun, :4301)"]
                Server["Bun.serve"]
                TRPC["/trpc endpoint"]
                InngestH["/api/inngest"]
                SPA["/assets/* SPA"]

                subgraph Routers
                    R_Dev["devices"]
                    R_Count["countdownEvents"]
                    R_Conf["appConfig"]
                    R_HP["health"]
                end

                subgraph Services
                    HASvc["ha-service.ts"]
                    WSRelay["HaWebSocketRelay<br/>(SSE subscriptions)"]
                end

                subgraph Evee["Evee (Slack Bot)"]
                    Bolt["Slack Bolt<br/>Socket Mode"]
                    AISDK["Vercel AI SDK<br/>generateText()"]
                    Tools["Tools<br/>dateTime, rollDice"]
                    Thread["Thread Context<br/>conversations.replies"]
                    Bolt --> Thread --> AISDK
                    AISDK --> Tools
                end

                Server --> TRPC & InngestH & SPA
                TRPC --> R_Dev & R_Count & R_Conf & R_HP
                R_Dev --> HASvc & WSRelay
            end

            PG["PostgreSQL<br/>Drizzle ORM"]
            Inngest["Inngest<br/>:8288"]

            subgraph Logging["Logging Stack"]
                Grafana["Grafana"]
                Loki["Loki"]
                Alloy["Alloy"]
                Alloy --> Loki --> Grafana
            end
        end

        TRPC --> PG
        InngestH --> Inngest
    end

    subgraph HA["Home Assistant (QEMU VM)"]
        REST["REST API<br/>/api/states, /api/services"]
        WS["WebSocket API<br/>state_changed events"]
        Lights["Lights"]
        Climate["Climate"]
        Media["Media Players"]
        Fans["Fans / Switches"]
        REST --- Lights & Climate & Media & Fans
        WS --- Lights & Climate & Media & Fans
    end

    subgraph Ext["External Services"]
        GHCR["GHCR<br/>Container Registry"]
        GHA["GitHub Actions<br/>CI/CD"]
        Slack["Slack<br/>World Wide Webb"]
        OR["OpenRouter API"]
        OP["1Password<br/>Homelab vault"]
    end

    %% Frontend to Backend
    TQ -- "HTTP batch<br/>(queries, mutations)" --> TRPC
    TQ -. "HTTP SSE<br/>(subscriptions)" .-> TRPC

    %% Backend to HA
    HASvc -- "REST calls" --> REST
    WSRelay -- "Persistent WebSocket" --> WS

    %% Evee
    Bolt -- "Socket Mode" --> Slack
    AISDK -- "OpenRouter provider<br/>Gemma 4 31B" --> OR

    %% CI/CD
    GHA -- "docker push" --> GHCR
    GHA -- "kamal deploy<br/>via Tailscale" --> Server
    GHA -- "notifications" --> Slack
    OP -. "secrets" .-> GHA
```

</details>

## Real-Time HA State Flow

![HA State Flow](screenshots/architecture-ha-flow.png)

<details>
<summary>Mermaid source</summary>

```mermaid
sequenceDiagram
    participant HA as Home Assistant
    participant Relay as HaWebSocketRelay
    participant Router as devices router
    participant Client as TanStack Query
    participant UI as React UI

    HA->>Relay: WebSocket state_changed
    Relay->>Relay: Filter allowed domains<br/>(light, climate, media_player, fan, switch)
    Relay->>Router: EventEmitter "stateChanged"
    Router-->>Client: HTTP SSE (tRPC subscription)
    Client->>Client: Invalidate queries
    Client->>UI: Re-render with new state
```

</details>

## CI/CD Pipeline

![CI/CD Pipeline](screenshots/architecture-cicd.png)

<details>
<summary>Mermaid source</summary>

```mermaid
flowchart LR
    Push["Push to main"] --> CI

    subgraph CI["CI Checks (parallel)"]
        Lint
        Typecheck
        Test
        Boundaries
        Docker["Docker Build"]
        Shell["ShellCheck + shfmt"]
        Migrate["DB Migrations"]
    end

    CI --> Deploy

    subgraph Deploy
        TS["Tailscale VPN"] --> SSH["SSH to homelab"]
        SSH --> KD["kamal deploy"]
        KD --> Health["GET /up"]
    end

    Deploy --> Notify["Slack notification"]
```

</details>

## Monorepo Structure

```
the-workflow-engine/
  apps/
    web/         React SPA (Vite, TanStack Router, tRPC client)
    api/         tRPC API server (Bun, Drizzle ORM, Inngest, Evee)
  libs/
    shared/      Shared types and Zod schemas (@repo/shared)
  scripts/       Dev helpers, boundary checker, deploy
  docs/          Architecture, screenshots
  infra/         Kamal config, Evee manifest, logging
```

Workspace packages: `@repo/web`, `@repo/api`, `@repo/shared`.

## API Layers

The API enforces a layered architecture with strict import boundaries:

1. **db/**: Database schema and Drizzle client. Only imports `drizzle-orm`, `@repo/shared`.
2. **services/**: Business logic. Imports `db/`, `integrations/types`, `@repo/shared`.
3. **trpc/routers/**: HTTP endpoint definitions. Imports `services/`, `@trpc/*`, `zod`, tRPC init/context.
4. **inngest/functions/**: Background jobs. Imports `services/`, `inngest`, `@repo/shared`.
5. **integrations/**: Plugin implementations. Only imports `@repo/shared` and own files.

Boundaries enforced by `scripts/check-boundaries.ts` in pre-commit hooks and CI.

## Port Scheme

| Service  | Default Port | With PORT_OFFSET=N |
|----------|-------------|--------------------|
| Web      | 4200        | 4200 + N           |
| API      | 4201        | 4201 + N           |
| Inngest  | 8288        | 8288 + N           |

`PORT_OFFSET` (0-99) allows multiple instances to run side-by-side for parallel development.

## Local Development

Tilt orchestrates all services:

```bash
tilt up                        # Start everything
PORT_OFFSET=10 tilt up         # Start on offset ports
tilt down                      # Stop everything
```

Tilt starts: Docker Compose (Inngest + Postgres) -> API (bun --watch) -> Web (vite dev).
Secrets loaded from 1Password at dev start (HA_TOKEN, Slack tokens, OpenRouter key).

## Integration Plugin System

Plugins implement the `Integration` interface (`src/integrations/types.ts`):

- `init()`: One-time setup/authentication.
- `getState()`: Returns current state snapshot.
- `execute(command, params)`: Runs a command against the integration.
- `subscribe?(callback)`: Optional event stream, returns unsubscribe function.

Plugins are isolated: they may only import `@repo/shared` and their own files.
