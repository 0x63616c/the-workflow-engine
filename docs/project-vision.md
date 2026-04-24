Here's the compressed version:

# Project Vision: Evee

## What It Is

Wall-mounted iPad Pro smart home panel. Not dashboard. Living art, controls home. Default screen = live art clock. Swipe for controls, PIN pad for settings.

## Hardware

- **Display**: iPad Pro, wall-mounted, always-on, full-screen
- **Server**: Mac Mini (spare), runs backend + Home Assistant + Inngest via Docker
- **Audio**: All through Sonos. iPad = controller only, no audio output.
- **Power**: Wired, always connected
- **Kiosk**: Capacitor native shell wrapping PWA. MDM Single App Mode via Apple Configurator 2. No subscription.
- **Presence**: Motion sensor via Home Assistant (not camera). Triggers UI wake/sleep.
- **OLED**: Full black = pixels off. Acts as screen-off when idle.

## Design Vision

- Modern art aesthetic. No generic dashboard bullshit.
- Theme shifts throughout day: morning, afternoon, dinner, midnight. Smooth transitions, never sudden.
- Large border radius. Soft, modern.
- Muted bold accents: deep red, ocean blues, warm ambers. Never full saturation, always pulled back.
- Big touch targets. Breathing room. Scene-based layout.
- Default home = live art clock + date. Background: moon, nature, native wallpaper integration.
- Geist font. Dark base.

## Tech Stack (Locked In)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19 + Vite + TanStack Router + TanStack Query | Proven, typed, fast iteration |
| Backend | Bun + tRPC v11 (WebSocket subscriptions) | End-to-end types = guardrails for LLM dev |
| Database | SQLite via Drizzle ORM | Single user, single server. No Postgres overhead. |
| Styling | Tailwind CSS v4 + shadcn/ui | CSS-first config, composable components |
| Events | Inngest (self-hosted, open source) | Durable workflows, retries, cron. Replaces separate worker service. |
| Device Layer | Home Assistant (REST + WebSocket API) | Unified API for all devices |
| Local Dev | Tilt | Orchestrates Inngest + API + Web with hot reload |
| Prod | Docker Compose on Mac Mini | Simple. HA + Inngest + API. |
| Auth | PIN code, hashed, long-lived token | Single user. Not overkill. |
| AI | Undecided. Could be Claude, OpenRouter/Gemma, something free. Design for swappable LLM provider. | |
| Native Shell | Capacitor | Wraps PWA in native iOS shell for kiosk mode |
| Fonts | Geist via @fontsource-variable | Variable font, works with Vite |

## Core Systems (The Platform)

Features plug into these. New integration = write plugin, not rewire app.

### 1. Notification System
- Central bus. Any plugin pushes notifications.
- Type, priority, title, body, optional action, TTL.
- Real-time push to iPad via tRPC WebSocket subscription.
- Persisted to SQLite for history.

### 2. Theme Engine
- Time-of-day aware (morning, afternoon, evening, night).
- Exposes palette, mood, background visuals to all UI components.
- Pluggable: later driven by weather, music mood, calendar events.
- Smooth art-like transitions.

### 3. Integration Hub
- Plugin interface: `init()`, `getState()`, `execute(action)`, `subscribe(callback)`.
- Core manages lifecycle, health checks, reconnection.
- Plugins register capabilities.

### 4. Scene/Layout System
- Different views: home control, music player, ambient art, notification feed.
- Swipe/tap to switch. Auto-rotate on idle.

## Feature Ideas (Not Committed, Just Captured)

- Philips Hue light control
- Dreame vacuum control
- Sonos speaker control + music playback (Spotify, YouTube, downloaded)
- Calendar sync (Google and/or Apple, undecided)
- Weather display + alerts
- Package delivery tracking (AI-parsed from email)
- Custom push messages from phone/other devices
- GitHub / work notifications (PR reviews, CI failures)
- AI system parsing emails for smart notifications
- Messages/quotes throughout day

## Architecture Principles

### Clean Architecture
- Services = business logic. tRPC routes and Inngest functions = thin wrappers.
- Import boundaries enforced via pre-commit hook:
  - `db/` → only drizzle-orm, bun:sqlite, @repo/shared
  - `services/` → db/, integrations/types, @repo/shared
  - `trpc/routers/` → services/, @repo/shared
  - `inngest/functions/` → services/, @repo/shared
  - `integrations/` → @repo/shared, own types

### Extensibility Over Scale
- "Scalable" = easy to extend, not serving 100M users.
- Plugin architecture: new integration = new folder, new Inngest functions, register with hub. No core changes.

## Development Workflow

- TDD always. Red/green cycle. No exceptions.
- Phased build: tooling first, test tooling, solidify, then features.
- Agent teams for parallel work. Each teammate owns area.
- Agents use git worktrees for isolated dev. PORT_OFFSET for port isolation.
- Agents plan and present back before executing. No blind implementation.
- Pre-commit hooks: Biome lint, tsc, vitest, import boundaries, block .env commits.

## What's Set Up (As Of 2026-04-11)

- Monorepo with Bun workspaces: apps/api, apps/web, libs/shared
- API: tRPC + Drizzle + SQLite + Inngest client + health endpoint
- Web: React 19 + Vite + TanStack Router + Tailwind v4 + Geist font + hello world
- Tilt + Docker Compose orchestrating all services
- Pre-commit hooks via Lefthook
- Import boundary checker
- Agent skills for frontend/api/testing
- Architecture and plugin docs

## What's Next

First feature: implement one core system. Notification System or Theme Engine likely first.
Capacitor setup for native iPad shell when ready to deploy.