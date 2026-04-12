# Timer App - Alignment

## Approved Approach

Single countdown timer accessible from hub widget card. Tap card to expand into full-screen timer panel (like Sonos pattern). Pure frontend, no backend needed.

## Key Decisions

- **Single timer v1** (not multiple timers)
- **Expandable panel**: tap timer widget card on hub -> full-screen timer panel, opacity fade like Sonos
- **Navigation store**: add "timer" as view state (`"clock" | "hub" | "sonos" | "timer"`)
- **Timer state**: Zustand store with remaining_MS, status (idle/running/paused/done), duration_MS
- **Presets**: Quick buttons for 1min, 5min, 10min, 15min
- **Custom time**: Scroll/tap to set custom minutes and seconds
- **Controls**: Start, Pause, Reset
- **Alert**: Screen flash (full-screen white/red pulse animation) when timer hits 0. No audio (wall-mounted iPad).
- **Widget card**: Shows timer status - "No timer" when idle, countdown when running, "Done!" when complete
- **No backend**: Pure client-side. Timer runs in browser via setInterval.

## Scope

**IN:**
- Timer Zustand store (state, actions)
- Timer widget card on hub (replaces placeholder or adds new card)
- Timer panel (full-screen expandable view)
- Preset buttons (1m, 5m, 10m, 15m)
- Custom time picker (minutes + seconds)
- Start / Pause / Reset controls
- Visual countdown (large digits)
- Screen flash alert on completion
- Circular progress ring around countdown

**OUT:**
- Multiple simultaneous timers
- Named/saved timers
- Backend persistence
- Audio alerts
- Stopwatch mode
- Timer history

## Constraints

- iPad Pro 12.9" wall panel, touch-only
- Dark theme, art aesthetic
- Follow existing patterns: Sonos panel, navigation store, opacity fade
- Pure frontend (no API changes)
