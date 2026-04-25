# Evee

[![CI](https://github.com/0x63616c/evee/actions/workflows/ci.yml/badge.svg)](https://github.com/0x63616c/evee/actions/workflows/ci.yml)
[![Deploy](https://github.com/0x63616c/evee/actions/workflows/deploy.yml/badge.svg)](https://github.com/0x63616c/evee/actions/workflows/deploy.yml)
[![iOS Build](https://github.com/0x63616c/evee/actions/workflows/ios-build.yml/badge.svg)](https://github.com/0x63616c/evee/actions/workflows/ios-build.yml)

Wall-mounted iPad Pro smart home panel. Living art that controls home. Also the Slack bot of the same name.

## Stack

- **Frontend**: React 19, TypeScript, TanStack Router, Tailwind v4, shadcn/ui, Three.js, Framer Motion
- **Backend**: Bun, tRPC v11, PostgreSQL (Drizzle ORM)
- **Bot**: `@slack/bolt` (Socket Mode), Vercel AI SDK, OpenRouter (Gemma)
- **Infra**: Home Assistant, Kamal on Mac Mini, Grafana/Loki/Alloy, Capacitor for iOS

## Development

```bash
scripts/run-dev     # Start full stack (web, api, postgres) on auto-picked ports
scripts/stop-dev    # Tear it down
```

Open the printed Web URL. Multiple parallel sessions are supported via `PORT_OFFSET`.

## Layout

```
apps/web/      # React PWA (iPad panel)
apps/api/      # Bun tRPC backend + Slack bot
infra/         # Kamal accessory dirs (postgres, loki, alloy, grafana, evee)
scripts/       # Dev, deploy, and automation scripts
docs/          # Architecture notes + screenshots
.kamal/        # Kamal deploy config + hooks
config/        # Kamal deploy.yml
```

## Deploy

CI deploys on push to `main` via Kamal. See `CLAUDE.md` for the gitops conventions.
