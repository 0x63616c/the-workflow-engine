# Product Features

Current feature inventory for The Workflow Engine, a wall-mounted iPad Pro smart home panel.

## Dashboard

- **6x4 Bento Grid** - main view with 13 card widgets in a responsive CSS grid
- **Card Overlay** - tap any expandable card to open fullscreen view, swipe down to dismiss
- **Idle Auto-Clock** - 45-second inactivity timeout auto-expands clock card, countdown shown in corner
- **Connection Status** - visual indicator for server connectivity
- **Error Boundary** - global error handling with fallback UI
- **Auto-Reload on Deploy** - detects new build hash from API, reloads app automatically

## Cards

### Clock
- Live HH:MM AM/PM display with pulsing colon animation
- Current date display
- Expands into Art Clock carousel (see Art Clock section)

### Countdown Events
- Database-backed countdown event manager
- Create new events with title and target date
- "Upcoming" and "Past" tabs
- Shows days remaining or days since
- Delete events
- Mini card shows next upcoming event

### Timer
- Custom duration input (minutes and seconds)
- 4 preset buttons: 1m, 5m, 10m, 15m
- SVG progress ring visualization
- Start, pause, resume, reset controls
- Color changes: white (running), gray (paused), red (done)
- Full-screen flash effect on completion
- Mini card shows active countdown or "Done!"

### Lights (Home Assistant)
- Live count of lights on vs total
- "All On" and "All Off" bulk toggle buttons
- 5-second polling interval
- Loading and error states

### Music / Sonos
- Now playing: track title, artist, album art
- Animated equalizer bars when playing
- Play/pause toggle on mini card
- Expanded view:
  - Full playback controls (play/pause, previous, next)
  - Shuffle toggle
  - Repeat cycle (off, one, all)
  - Progress bar with elapsed/total time
  - Speaker list with per-speaker volume sliders
- 5-second polling interval

### WiFi
- 3D flip card animation (front/back)
- Front: WiFi icon and network name
- Back: QR code for auto-connect, password with copy button
- Auto-flips back to front after 5 minutes

### Theme Toggle
- Dark/light mode switcher
- Sun/moon icons with rotation animation
- Persists preference to localStorage

### Weather (Placeholder)
- Temperature, condition, high/low display
- Gradient backgrounds based on weather condition
- Not yet wired to real data

### Calendar (Placeholder)
- Next upcoming event display
- Color-coded event indicator
- Not yet wired to real data

### Email (Placeholder)
- Unread email count display
- Not yet wired to real data

### System Status (Placeholder)
- Health indicator with status dot
- Not yet wired to real data

### Quote (Placeholder)
- Inspirational quote with attribution
- Not yet wired to real data

### Photo (Placeholder)
- Photo frame display
- Not yet wired to real data

## Art Clock

9 animated visualizations in a carousel with dot navigation:

1. **Digital Clock** - standard HH:MM AM/PM with date
2. **Wireframe Globe** - rotating 3D wireframe sphere (Three.js)
3. **Constellation Map** - star and constellation visualization
4. **Topographic Contours** - animated topographic map lines
5. **Pendulum** - physics-based swinging pendulum
6. **Waveform Pulse** - audio waveform animation
7. **Particle Drift** - floating particle field
8. **Black Hole** - particle vortex animation
9. **Radar** - rotating radar sweep

All states are time-driven and update continuously.

## Theming

- Two palettes: **Midnight** (dark) and **Daylight** (light)
- CSS custom properties applied dynamically via ThemeProvider
- Full color system: background, foreground, muted, border, accent, card, destructive
- Consistent accent color (#d4a574 tan/bronze) across both palettes
- Smooth transitions between themes

## Home Assistant Integration

- REST API client with bearer token authentication
- **Lights**: query entity states, bulk on/off control
- **Media Players**: full Sonos control
  - Play, pause, next, previous
  - Shuffle toggle, repeat cycle
  - Volume control (0-100 scale, converted to HA 0-1)
  - Now playing metadata: title, artist, album art URL

## Backend API (tRPC)

- **Health**: ping (status + timestamp), build hash (deployment tracking)
- **Countdown Events**: list upcoming, list past, get by ID, create, update, delete
- **Devices**: light states, lights on/off, media player states, media player commands, set volume

## Database

- SQLite via Drizzle ORM
- **countdown_events**: id, title, date, createdAt, updatedAt
- **system_info**: id, key, value (system configuration storage)

## Infrastructure

- Inngest background job queue (initialized, no functions registered yet)
- Environment validation via Zod (HA_URL, HA_TOKEN, BUILD_HASH)
- Bun runtime for API server
- Vite dev server for frontend
- Tilt for local development orchestration
- Docker Compose on Mac Mini for production (Kamal deploy)
