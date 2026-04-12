# The Workflow Engine

[![CI](https://github.com/0x63616c/the-workflow-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/0x63616c/the-workflow-engine/actions/workflows/ci.yml)
[![Deploy](https://github.com/0x63616c/the-workflow-engine/actions/workflows/deploy.yml/badge.svg)](https://github.com/0x63616c/the-workflow-engine/actions/workflows/deploy.yml)

Wall-mounted iPad Pro smart home panel. Living art that controls your home.

## Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Router, Tailwind CSS, shadcn/ui
- **Backend**: Bun, tRPC v11, SQLite (Drizzle ORM)
- **Infrastructure**: Capacitor (native iOS shell), Home Assistant, Inngest, Kamal
- **Slack Bot**: Evee (deploy notifications, workspace: World Wide Webb)

## Development

```bash
tilt up    # Start all services (Home Assistant, API, web dev server)
tilt down  # Stop all services
```

## Architecture

```
apps/web/   # React PWA (iPad panel UI)
apps/api/   # tRPC backend (Bun + SQLite)
libs/       # Shared internal libraries
infra/      # Docker Compose, Tilt config
```
