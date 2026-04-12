# Bento Hub Redesign - Alignment Doc

**Approved by:** Calum
**Date:** 2026-04-11

## What We're Building

Complete hub grid overhaul for wall-mounted iPad Pro smart home panel. Transform uniform 3x3 grid into varied bento layout with mixed card sizes, unique shapes, distinct color identities. Add countdown events as first fully-wired feature. Add placeholder cards for future features. Unify all interaction through expand/contract card pattern.

## Approved Approach

### Grid Layout
- Varied bento grid (5-6 column base) with mixed card sizes (1x1, 2x1, 1x2, 2x2)
- Some cards get unique shape treatments (different border radius, inset effects)
- Each card has its own color identity/palette
- Dense but breathable spacing
- Target: iPad Pro 12.9" 4:3 (2732x2048)

### Unified Card Interaction Model
- **Every card** follows same pattern: mini preview on grid, tap to expand overlay
- Expanded view = modal/overlay that scales up from card position
- Dismiss by swipe down or tap outside
- Grid stays visible underneath (dimmed)
- No route navigation, feels like touching a living surface
- **Clock is a card, not a separate view.** Mini live clock preview on grid, expands to full-screen art clock on tap. Contracts back on 45s idle timeout or dismiss. Replaces current `useNavigationStore` view toggle.
- This means `navigation-store.ts` view state ("clock" | "hub") goes away entirely. Hub is always the base. Card expansion state replaces it.

### Countdown Events (Full Stack)
- New `countdownEvents` SQLite table (id, title, date, createdAt, updatedAt)
- tRPC router with CRUD, service layer, Zod validation
- Hub card shows next upcoming event with days remaining
- Expanded view: scrollable list, upcoming first
- Past events accessible via toggle (not shown by default)
- Add/edit/delete from expanded view
- Seed all 44 existing events from Calum's countdown app

### New Placeholder Cards
- Email: unread count + latest subject (placeholder data)
- Photo frame: static image or gradient placeholder
- Quote: quote of the day (hardcoded rotating)
- System status: uptime/connection status

### Existing Cards (Visual Refresh)
- Weather (gradient by condition)
- Clock (live mini preview, expands to full art clock)
- WiFi (keep 3D flip on hub card)
- Lights (colored dots)
- Calendar
- Music (equalizer bars)
- Theme toggle (sun/moon)

## Key Decisions (User-Approved)

1. **Varied bento layout** over uniform grid or dense mosaic
2. **Modal/overlay expansion** over route-based navigation
3. **Clock as expandable card** over separate view state - unifies interaction model
4. **Upcoming events by default**, past events via toggle
5. **Flat event list** (no categories/tags)
6. **Per-card color identity** over uniform theme colors
7. **Unique card shapes allowed** (varied border radius, inset effects)

## Scope

**IN:**
- Grid layout redesign (CSS Grid, varied sizes)
- Card expansion/overlay system (animation, dismiss, timeout)
- Clock card unification (remove view state, clock = expandable card)
- Countdown feature full stack (DB, API, service, UI, seed data)
- 4 new placeholder cards (email, photo, quote, system status)
- Visual refresh of all existing cards (colors, shapes)
- BentoCard component update for variant sizes/shapes/colors

**OUT:**
- Real data for placeholder cards (email, photo, quote)
- Calendar sync / external integrations
- Categories or tags for countdown events
- Route-based navigation
- Capacitor native features

## Seed Data (44 Events)

### Upcoming (from 2026-04-11)
1. Coachella W2 - 2026-04-16
2. SF - SoFi Codathon - 2026-04-26
3. Disco Lines - 2026-05-02
4. SF - Temporal Replay - 2026-05-04
5. 5 Year Anniversary Of Green Card - 2026-05-06
6. EDC - 2026-05-14
7. LIB - 2026-05-21
8. Gorgon City - 2026-05-30
9. Chris Lake Day 1 & 2 - 2026-06-19
10. DayTrip - 2026-06-27
11. Beltran Day 1 & 2 - 2026-07-11
12. Hard Summer - 2026-08-01
13. Head Trip - 2026-10-10
14. My Birthday - 2026-11-02
15. EDC Sea - 2027-01-26

### Past
16. Beyond 26 - 2026-03-27
17. CRSSD - 2026-03-14
18. Skyline - 2026-02-28
19. Eligible for Naturalization - 2026-02-08
20. Mochakk + Beltran Hollywood Take... - 2025-12-13
21. Matroda: DTLA - 2025-12-05
22. Biscits - Gudfella - 2025-11-07
23. Escape 25 - 2025-10-31
24. Worship: Red Rocks - 2025-10-30
25. Martin Garrix - 2025-10-23
26. Mau P - 2025-10-10
27. Sidepiece - San Diego - 2025-10-04
28. CRSSD San Diego - 2025-09-27
29. Nocturnal Wonderland - 2025-09-13
30. Chris Lake: Red Rocks - 2025-08-30
31. Sidepiece: Day Trip - 2025-08-16
32. Chris Lake: San Diego - 2025-08-02
33. Lost In Dreams 25 - 2025-07-11
34. Martin Garrix - 2025-06-27
35. EDCLV 25 - 2025-05-16
36. Shaun in LA - 2025-05-10
37. Coachella 25 - 2025-04-18
38. Armin Van Buuren 25 - 2025-04-04
39. Beyond Wonderland 25 - 2025-03-28
40. NoFap - 2025-03-23
41. Rezz Cow Palace 25 - 2025-03-01
42. John Summit Vail 25 - 2025-02-15
43. Aeon:MODE LA 25 - 2025-02-07
44. Chyl 25 - 2025-01-25

## Constraints
- Tech: React 19, TypeScript, Tailwind v4, shadcn/ui, lucide-react, Zustand, tRPC v11, Drizzle ORM, SQLite, Zod, Vitest, Biome
- Use bun/bunx, never npm/npx
- TDD mandatory
- Clean architecture: services hold logic, routers thin, import boundaries enforced
- Conventional commits, small focused, push after each
