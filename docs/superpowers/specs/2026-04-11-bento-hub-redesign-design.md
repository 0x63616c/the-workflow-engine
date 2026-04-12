# Bento Hub Redesign

## Summary

Redesign hub page from uniform 2x3 card grid to bento-style layout with uniquely styled per-widget cards. Add light/dark mode toggle and WiFi sharing feature.

## Layout

4:3 iPad (2732x2048). CSS Grid with named areas:

```
"weather  weather  clock"
"wifi     lights   lights"
"calendar music    theme"
```

3 columns, 3 rows. Weather spans 2 cols. Lights spans 2 cols. Everything else 1x1.

## Card Base Styling

- `rounded-2xl` corners
- Subtle `backdrop-blur-sm` 
- Light mode: white bg + soft box-shadow, no hard border
- Dark mode: `bg-white/5` + faint `border-white/10`
- Active/tap state: slight scale down (0.97) + shadow change
- Transition: 150ms ease on all properties

## Per-Card Designs

### Weather (large, 2-col span)
- Gradient background: warm amber tones (sunny), cool blue (rain/cloud)
- Large temperature number (text-5xl, font-light)
- Small condition text + icon below temp
- Hi/Lo temps in muted text, bottom-right

### Clock (1x1)
- Oversized monospace digits (text-4xl)
- Pulsing colon animation (reuse existing keyframe)
- AM/PM small text
- Date below in muted smaller text

### WiFi (1x1, expandable)
- Default: signal bars icon (animated fill based on strength), network name, green/red dot
- "tap to share" hint text in muted
- Tapped: expands to overlay ~2x2 area with:
  - Network name (SSID)
  - Password field (masked, eye toggle to reveal)
  - Copy password button
  - QR code (generated from WIFI: URI format)
  - Close X button
- Expand animation: scale + opacity, 200ms
- WiFi details: hardcoded constants for now (SSID, password)
- QR: use `qrcode` package to generate SVG

### Lights (wide, 2-col span)
- Row of small circles (one per "room"), lit ones glow with accent color
- Unlit circles: muted/dim
- "3 of 5 on" text
- Placeholder data for now

### Calendar (1x1)
- Colored left border bar (4px, accent color)
- Next event name (truncated)
- Relative time: "in 2h" or "No events"
- Placeholder data

### Music (1x1)
- Mini equalizer bars (3-4 bars, CSS animation when "playing")
- Track name (truncated, scrolling if long)
- Artist below in muted
- Play/pause icon bottom-right
- Placeholder: "Not playing" state with static bars

### Theme Toggle (1x1)
- Sun icon (light mode) / Moon icon (dark mode)
- Icon rotates 180deg on toggle (CSS transition)
- Label: "Light" / "Dark"
- Background subtly different from other cards (slightly more opaque)

## Theme System

### Dark palette (existing "midnight")
Keep current colors. Minor tweaks:
- Card bg: `rgba(255,255,255,0.05)` instead of `#0a0a0a`

### Light palette (new "daylight")
- background: `#ffffff` (pure white)
- foreground: `#1a1a1a`
- card: `#ffffff`
- border: `#e0dcd6`
- muted: `#e8e5e0`
- mutedForeground: `#737068`
- accent: `#d4a574` (same warm bronze)
- primary: `#1a1a1a`
- primaryForeground: `#f5f2ee`
- secondary: `#e8e5e0`
- secondaryForeground: `#1a1a1a`

### Toggle behavior
- Store preference in localStorage (`theme-mode`)
- On load: read localStorage, default to dark
- CSS transitions on `--color-*` variables (300ms)
- ThemeProvider injects CSS vars on `:root`

## Files

### New
- `apps/web/src/components/hub/bento-card.tsx` - base card wrapper (shared styling)
- `apps/web/src/components/hub/weather-card.tsx`
- `apps/web/src/components/hub/clock-card.tsx`
- `apps/web/src/components/hub/wifi-card.tsx`
- `apps/web/src/components/hub/lights-card.tsx`
- `apps/web/src/components/hub/calendar-card.tsx`
- `apps/web/src/components/hub/music-card.tsx`
- `apps/web/src/components/hub/theme-toggle-card.tsx`

### Modified
- `apps/web/src/components/hub/widget-grid.tsx` - replace with bento layout
- `apps/web/src/styles/globals.css` - add light theme, transitions
- `apps/web/src/stores/theme-store.ts` - add daylight palette, localStorage persistence

### Removed
- `apps/web/src/components/hub/widget-card.tsx` - replaced by per-widget cards

## Dependencies
- `qrcode` package for WiFi QR generation (SVG output)
