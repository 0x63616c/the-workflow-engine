# Theme Engine + Art Clock - Alignment

## Approved Approach

Build the frontend foundation: Theme Engine (Zustand store + CSS variable system) and Art Clock (home scene). First real UI for the wall-mounted iPad panel.

## Key Decisions (User-Approved)

1. **Zustand** for theme store (not React Context). Already a dep, simpler API.
2. **CSS variables** approach for theming. Smooth transitions, future theme-switching ready.
3. **Single palette for now.** No time-of-day switching yet. Structure supports it for later.
4. **No shadcn/ui.** Custom components from scratch. Unique, opinionated, art-forward design. shadcn looks boring for this use case.
5. **Art Clock replaces current hello-world** index route.
6. **Pure frontend.** No backend dependency. Time from device clock.
7. **Super modern clock.** Art-gallery aesthetic, not a dashboard widget.

## Design Direction

- True black (#000) background (OLED iPad, pixels off = screen off)
- Muted warm accents (pulled-back ambers, soft whites)
- Large border radius, generous spacing, breathing room
- Typography-driven: Geist Variable, large font weights, prominent
- Museum exhibit feel, not a dashboard
- Touch targets sized for wall-mounted use
- Super modern clock design

## Palette (Single, Refined)

- Background: #000000 (true black)
- Foreground: #fafafa (soft white)
- Accent: warm amber, muted (exact value TBD by architect)
- Muted: dark grays for secondary elements
- All via CSS variables for future theme-switching

## Scope

### IN
- Theme engine (Zustand store, single palette, CSS variable injection)
- CSS variable system structured for future multi-palette support
- Art Clock component (time + date display, super modern aesthetic)
- Custom component foundation (no shadcn/ui)
- Unit tests for theme logic + clock formatting
- Visual E2E verification

### OUT
- Time-of-day theme switching (future PR)
- shadcn/ui (removed from project direction)
- Background visuals/art (separate PR)
- Scene/swipe navigation (separate PR)
- Backend theme persistence

## Constraints

- Must look stunning on iPad Pro 12.9" (2732x2048, 4:3 aspect ratio)
- OLED-friendly: true black backgrounds
- Geist Variable font (already installed)
- Existing AppShell + root route structure must be preserved
- Tailwind CSS v4 with CSS-first config
