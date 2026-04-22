# Claude Design Prompt — The Workflow Engine

> Paste this into claude.ai's design tool for a ground-up redesign.

---

I want you to design a wall-mounted smart home iPad panel app called **The Workflow Engine**. This runs 24/7 on an iPad Pro 12.9" in landscape mode, mounted on a wall in my apartment. It's always on — it's living art as much as it is a control panel.

**Please design 3 distinct visual concepts** — each with a different aesthetic direction. Show the main dashboard view for each concept.

---

## DEVICE & CANVAS

- Display: iPad Pro 12.9" landscape
- Viewport: 1366 × 1024px
- Touch-only (no mouse/hover states)
- Status bar hidden. Safe areas on left/right edges.
- Always landscape. Never rotates.
- Viewed from across the room — most important info must be readable at 6 feet.

---

## WHAT IT DOES — All Dashboard Cards

The dashboard is a grid of interactive cards. Each card shows live data and is tappable for more detail or direct control.

**Control Cards**
1. **Clock** — Current time + date. The hero/anchor of the dashboard. When idle (45s), expands to full-screen animated art (constellation maps, particle fields, waveforms, solar system orbits, etc.)
2. **Lights** — Philips Hue: tap to toggle all lights on/off. Shows count of lights currently on.
3. **Fan** — Simple on/off toggle for a smart fan.
4. **Climate** — Current thermostat temp, tap +/- to adjust by 1°.
5. **Shelly Switch** — Smart electrical switch: on/off control with power draw.

**Media**
6. **Music** — Sonos speaker control: album art, song + artist, play/pause, skip, volume.

**Information Cards**
7. **Weather** — Current temp, condition (sunny/cloudy/rain), UV index, today's high/low.
8. **Stocks** — Live stock + crypto prices with % change, color-coded green/red.
9. **Banking / Net Worth** — Total net worth, account balances, recent transactions.
10. **OpenRouter Costs** — Live AI API spend tracking (daily/monthly).

**Lifestyle Cards**
11. **Zero** — Virtual pet: my dog Zero lives on the panel. Animated, reacts to the time of day, has moods.
12. **Tesla** — Car status: battery %, range, charging state, locked/unlocked, climate on/off.
13. **Calendar** — Next upcoming event with time and title.
14. **Countdown** — Tracks upcoming personal events with days remaining (trips, birthdays, etc.).
15. **Event Lineup** — Concert/festival schedule with set times (music festival timetable).
16. **Event Log** — Live feed of home activity (lights turned on, motion detected, door opened, etc.).

**Utility**
17. **WiFi** — Tap to reveal QR code + password (blurred by default, tap to reveal).
18. **Hey Evee** — Voice assistant card: tap to activate, shows listening state, last query/response.
19. **Smart Plugs** — Control individual smart plugs with on/off state per plug.

---

## DESIGN CONCEPTS

Please create **3 distinct concepts**. Each should be a full 1366×1024px dashboard layout. You decide how to arrange, group, or size the cards — the layout is part of the design.

### Concept A: "Glass & Depth"

Frosted glass cards, layered depth, subtle blur backgrounds, light-catching borders. Think visionOS meets high-end audio equipment UI. Dark background, cards float above with translucency. Soft glows, gradient borders. Feels premium and tactile even on glass.

### Concept B: "Live Tiles"

Cards are alive. Each tile is actively animating its own data — the clock face ticks in real-time, the weather card has a subtle animated sky gradient, the music card pulses with a beat visualizer, the stocks card streams tickers. Inspired by Windows Phone live tiles but modern and dark. Cards feel like little living windows into data. The dashboard breathes.

### Concept C: "Apple-Native App"

Design this as if Apple built it — following iPadOS HIG conventions. Feels like a first-party Apple app: SF Pro typography, familiar navigation patterns, clean whitespace, system-style controls. Think: what if the Home app, Weather app, and Music app merged into one beautifully organised panel? Should feel instantly familiar and effortless. This concept is deliberately more "product" than "art" — optimised for developers building with SwiftUI conventions in mind.

---

## CONSTRAINTS (all concepts)

- Dark mode only (wall-mounted at night — light mode is blinding)
- The clock must be the visual anchor/hero element
- Touch targets: minimum 60×60px tap areas
- Settings is a utility (small gear icon only, not a featured card)
- Every card should have a clear "resting" state (glanceable) and an "active/tapped" state
- Design for ambient viewing — most of the time nobody is actively interacting with it

---

## DELIVERABLES

For each concept:
1. Full dashboard layout at 1366×1024px with cards placed (you decide the grid/layout)
2. One expanded card detail view (pick the most interesting one for that concept)
3. A one-line description of the core design idea

No scrollbars, no off-screen content — everything fits in one screen. No tabs, sidebars, or navigation chrome.
