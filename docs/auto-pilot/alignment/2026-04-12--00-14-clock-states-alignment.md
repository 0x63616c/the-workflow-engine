# Clock States & Ambient Visualizations - Alignment

## What We're Building

A swipe-navigable clock state machine for the wall-mounted iPad panel. The idle screen cycles through 9 ambient visual states via left/right swipe gestures. Each state is a full-screen generative visualization with the time displayed. Thin white lines on black, ultra-minimal aesthetic throughout.

## Approved Approach

- **Swipe-only navigation** between states (no auto-timer)
- **Butter-smooth animations** are critical: finger-tracking transitions, spring physics on release, momentum-based settle
- **Framer Motion** for gesture handling + spring animations (replaces current basic swipe hook for state transitions)
- **Three.js (@react-three/fiber + @react-three/drei)** for 3D states (globe, constellation)
- **Canvas 2D** for 2D generative states (contours, pendulum, waveform, particles, black hole, radar)
- Each state is its own React component, mounted/unmounted by the state machine
- Tap-to-hub still works from any state (existing behavior preserved)

## States

### State 1: Default Clock (existing)
Time centered, large, ultra-thin Geist font. As it exists now. The "home base" state.

### State 2: Wireframe Globe (World Clock)
- Rotating wireframe earth with thin white lat/long grid lines
- No texture, no fill, just wireframe geometry
- 5 city pins: London, Shanghai, Barcelona, New York, Los Angeles
- Each pin has a floating label: "CITY NAME HH:MM AM/PM" in Geist, weight 200-300, wide tracking
- Labels billboard toward viewer (always face camera/user)
- Labels connected to pin positions by thin lines
- Slow rotation ~1 revolution per 60 seconds
- Time text slides to bottom third of screen
- Globe occupies upper two-thirds
- No user interaction with globe itself (no drag/zoom)

### State 3: Constellation Map
- Slowly rotating star field with actual constellations
- Stars as tiny white dots, constellation lines drawn thin between them
- Major constellation names in ultra-thin small caps (e.g., ORION, CASSIOPEIA)
- Hardcode 8-10 recognizable constellations (not full sky catalog)
- Sky rotates to show celestial movement (accelerated for visible motion)
- Time text positioned top or bottom

### State 4: Topographic Contours
- Procedurally generated contour lines from Perlin/simplex noise field
- Rendered as isolines at regular elevation intervals
- Lines slowly drift as noise field evolves over time
- Thin white lines, varying slightly in opacity by elevation
- Time text floats centered
- No labels, pure abstract generative art

### State 5: Pendulum
- Single ultra-thin vertical line pivoting from top center of screen
- Slow physics-accurate swing (~4 second period)
- Trail of 5-8 previous positions at decreasing opacity (fan effect)
- Time text at pivot point (top center)
- Swing amplitude slowly decays and rebuilds over minutes (breathing quality)
- Pure CSS/canvas, no 3D needed

### State 6: Waveform Pulse
- Horizontal thin line spanning full screen width, vertically centered
- Sine wave propagates along it, amplitude modulating slowly
- Sometimes nearly flat (calm), sometimes larger waves (active)
- Multiple harmonics layered for organic feel
- Time text centered above the line
- Afterglow trail on the wave

### State 7: Particle Drift
- 200-400 tiny white dots drifting slowly in random directions
- When two dots pass within threshold distance, thin line connects them
- Forms and dissolves triangular meshes (Plexus effect)
- Dots wrap around screen edges
- Density varies subtly over time
- Time text floats centered, particles drift behind it
- Canvas 2D for performance

### State 8: Black Hole
- Wireframe black hole at center
- Mesh grid behind it with gravitational lensing (lines warp toward singularity)
- Accretion disk as thin concentric ellipses at an angle
- Particles streak along disk with motion blur
- Disk slowly rotates
- Grid lines near event horizon curve and compress
- Time text above, slightly distorted near hole's influence
- Pure geometry, no fill

### State 9: Radar (Hidden)
- Not visible in normal swipe order, placed at the end (swipe past state 8)
- Circular radar grid centered on screen
- Thin concentric range rings, crosshair lines
- Sweep line rotates from center, bright trail that fades
- Phantom blips appear and decay along sweep
- Faint coordinate text at cardinal points
- Time displayed at center in monospace
- Stays until user swipes away

## Key Decisions (User-Approved)

1. **Swipe-only**: No auto-timer. User controls state via left/right swipe.
2. **Smooth animations are critical**: Finger-tracking, spring physics, momentum. Must feel incredible on iPad.
3. **Thin-line B&W aesthetic**: All states use thin white lines/dots on black. Matches existing font-weight-100 clock style.
4. **Radar is hidden**: Last in swipe order, not advertised. Easter egg.
5. **No globe interaction**: Globe rotates on its own, no touch/drag/zoom.
6. **Existing behavior preserved**: Tap still opens hub from any clock state.

## Scope

**IN:**
- Clock state machine with swipe navigation
- 9 state components (1 existing + 8 new)
- Smooth gesture-driven transitions (framer-motion)
- State indicator (subtle dots or similar)
- All generative visualizations listed above

**OUT:**
- Settings UI for state order/timing
- Dynamic city list for globe
- Weather/calendar data integration
- Additional states beyond these 9
- Auto-cycling timer (explicitly rejected)

## Constraints

- iPad Pro 12.9" 4th gen (2020), 2732x2048, 4:3 aspect ratio
- Must be performant (always-on display, no battery drain concerns but smooth 60fps)
- Existing tech: React 19, Vite, Tailwind v4, Zustand, Geist font
- New deps allowed: @react-three/fiber, @react-three/drei, three, framer-motion
- All agents use sonnet model
