# Home Page Hub - Alignment

## Approved Approach

**Widget grid** layout. Tap the art clock to reveal a grid of cards/widgets. Each widget shows quick-glance info (weather, lights, music, calendar, notifications). Clock becomes one widget among many. The hub is a dashboard, not just a launcher.

## Key Decisions

- **Layout**: 2-column grid of widget cards, each showing summary state
- **Navigation to hub**: Tap anywhere on the art clock screen
- **Navigation back to clock**: All three methods:
  1. Swipe right returns to clock
  2. Tap any empty/idle space returns to clock
  3. Auto-return after timeout (30-60s of no interaction), fade back to clock
- **Clock as screensaver**: Clock is the idle/default state. Hub is the active/interactive state.

## Scope

**IN:**
- Home page route with widget grid layout
- Tap-to-navigate from clock to home
- Three return-to-clock mechanisms (swipe, tap idle, timeout)
- Placeholder/skeleton widgets (clock summary, weather, lights, music, calendar, notifications)
- Smooth transition between clock and hub
- Consistent with existing theme engine (midnight palette, art aesthetic)

**OUT:**
- Actual widget data fetching (Home Assistant, calendar APIs, etc.)
- Widget expand/detail views
- Widget configuration or customization
- New API endpoints
- Backend changes

## Constraints

- iPad Pro 12.9" wall panel, touch-only
- PWA running fullscreen
- OLED-friendly (dark theme, minimal bright elements)
- Must maintain art aesthetic
- Existing tech: React 19, TanStack Router, Zustand, Tailwind v4, Vite
- useSwipe hook already exists, reuse it
