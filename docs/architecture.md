# Architecture

## Overview

The Workflow Engine is a wall-mounted iPad Pro smart home panel. It serves as living art that also controls the home.

```
iPad Pro (PWA/Capacitor)
  |
  |-- HTTP (tRPC queries/mutations)
  |-- WebSocket (tRPC subscriptions, real-time)
  v
API Server (Bun + tRPC)
  |
  |-- SQLite (Drizzle ORM) - local state, config, notifications
  |-- Inngest (event-driven functions) - async work, cron, orchestration
  |-- Home Assistant (REST + WebSocket) - device control, state
  v
Home Assistant -> Physical Devices
```

## Core Systems

**1. Notification System**
Central bus for all notifications. Any system can push notifications. Persisted to SQLite. Displayed on the panel UI with dismiss/action support.

**2. Theme Engine**
Controls palette, visuals, and transitions. Driven by time-of-day by default. Extensible to react to weather, music, calendar, or other signals. Smooth animated transitions between states.

**3. Integration Hub**
Plugin registry for device integrations. Each integration implements a standard interface (`init`, `getState`, `execute`, `subscribe`). Home Assistant is the primary integration. New integrations = new folder, no core changes.

**4. Scene/Layout System**
Swipeable views on the iPad: home control, music, ambient art, notifications. Each scene is a self-contained layout that can be composed from widgets.

## Directory Structure

```
apps/
  web/          # React PWA (iPad panel UI)
    src/
      routes/       # TanStack Router file-based routes
      components/   # React components (ui/ for shadcn)
      stores/       # Zustand client state
      lib/          # Utilities, tRPC client
      styles/       # Tailwind CSS globals
  api/          # tRPC backend (Bun + SQLite)
    src/
      trpc/         # tRPC router definitions
        routers/    # Individual route files
        init.ts     # tRPC instance setup
        context.ts  # Request context (DB injection)
      services/     # Business logic layer
      db/           # Drizzle schema, client, migrations
      inngest/      # Event-driven functions
        functions/  # Individual Inngest function files
        client.ts   # Inngest client instance
      integrations/ # Plugin implementations
        types.ts    # Integration interface
      middleware/   # HTTP middleware
      env.ts        # Zod-validated environment config
      server.ts     # HTTP + WebSocket server entry
libs/           # Shared internal libraries
infra/          # Docker Compose, Tilt config
docs/           # Documentation, screenshots
```

## Import Boundaries

```
         +------------------+
         |  integrations/   |  (shared types only)
         +------------------+
                  |
         +------------------+
         |    services/     |  (business logic)
         +------------------+
            /           \
  +-----------+   +-----------+
  | trpc/     |   | inngest/  |   (thin wrappers)
  | routers/  |   | functions/|
  +-----------+   +-----------+

  db/ is accessed only by services/ (via dependency injection)
```

Dependencies point inward: infrastructure -> services -> domain. Never reverse.

## Ports

| Service        | Default Port | With PORT_OFFSET=N |
| -------------- | ------------ | ------------------ |
| web (Vite)     | 4200         | 4200 + N           |
| api (HTTP)     | 4201         | 4201 + N           |
| api (WS)       | 4202         | 4202 + N           |
| Home Assistant | 8123         | 8123               |

`PORT_OFFSET` allows multiple worktree instances to run simultaneously without conflicts.

## Data Flow

**Synchronous (user actions)**
iPad UI -> tRPC mutation -> service -> DB/Home Assistant -> response -> UI update

**Real-time (state changes)**
Home Assistant event -> Inngest function -> service -> DB update -> tRPC subscription -> WebSocket push -> UI update

**Background (scheduled)**
Inngest cron -> function -> service -> poll Home Assistant / process data -> DB update -> subscription notification
