# Square Grid + Scrolling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix rectangular-looking tiles by making them truly square, expand the grid from 6×4 to 6×10 with a scrollable container, and keep the background placeholder grid visible in every empty 1×1 slot.

**Architecture:** Root cause of rectangular tiles is a double-padding-subtraction bug in `computeCellSize` (it receives `contentRect.width` which already excludes padding, then subtracts padding again). Fix computes cell size from gaps only. Grid expands to 10 rows; the outer `hub-container` div becomes the scroll viewport (`h-full overflow-y-auto`) while `#root` stays clipped to the iPad viewport. Background placeholders already render `GRID_COLS * GRID_ROWS` cells, so bumping `GRID_ROWS` automatically fills the full grid — app cards render after placeholders in the same CSS Grid, so they naturally sit on top of the 2×2/1×2/etc. placeholder squares they occupy.

**Tech Stack:** React 19, TypeScript, CSS Grid, Tailwind v4, Vitest + Testing Library, Playwright E2E.

**Target resolution:** iPad Pro 12.9" 4th gen (2020) — 2732×2048 physical, 1366×1024 CSS points in landscape.

---

## File Structure

**Files modified:**
- `apps/web/src/components/hub/widget-grid.tsx` — the core component. Fix `computeCellSize`, bump `GRID_ROWS`, make `hub-container` scrollable.
- `apps/web/src/__tests__/widget-grid.test.tsx` — update assertions for 60 placeholders (6×10), scrolling class, drop obsolete `min-h-full` assertion on inner grid.

**Files NOT changed:**
- `apps/web/src/styles/globals.css` — `#root` stays `overflow: hidden` (clips to iPad viewport); scrolling happens inside.
- `apps/web/src/components/hub/register-cards.ts` — existing card positions (all within rows 1-4) stay valid in the new 10-row grid.
- `apps/web/src/routes/index.tsx` — no change.
- `e2e/dashboard-grid.spec.ts` — still passes (6-column assertion unchanged, all cards still visible).

---

## Task 1: Update unit tests for new grid shape (TDD red)

Update `widget-grid.test.tsx` assertions to expect the new structure. These will fail until Task 2.

**Files:**
- Modify: `apps/web/src/__tests__/widget-grid.test.tsx:140-163`

- [ ] **Step 1.1: Replace the 24-placeholders assertion with 60**

Change lines 140-145 from:

```typescript
  it("renders 24 placeholder background cells", () => {
    render(<WidgetGrid />);

    const placeholders = screen.getAllByTestId(/^grid-placeholder-/);
    expect(placeholders).toHaveLength(24);
  });
```

to:

```typescript
  it("renders 60 placeholder background cells (6 cols x 10 rows)", () => {
    render(<WidgetGrid />);

    const placeholders = screen.getAllByTestId(/^grid-placeholder-/);
    expect(placeholders).toHaveLength(60);
  });
```

- [ ] **Step 1.2: Replace the `min-h-full` inner-grid assertion with a scroll-container assertion**

Change lines 156-163 from:

```typescript
  it("grid container uses min-h-full not fixed h-full", () => {
    render(<WidgetGrid />);

    const grid = screen.getByTestId("widget-grid");
    const classes = grid.className.split(" ");
    expect(classes).toContain("min-h-full");
    expect(classes).not.toContain("h-full");
  });
```

to:

```typescript
  it("hub-container is a vertical scroll viewport", () => {
    render(<WidgetGrid />);

    const hub = screen.getByTestId("hub-container");
    const classes = hub.className.split(" ");
    expect(classes).toContain("h-full");
    expect(classes).toContain("overflow-y-auto");
  });
```

- [ ] **Step 1.3: Run tests, confirm failures**

Run: `cd apps/web && bunx vitest run src/__tests__/widget-grid.test.tsx`

Expected: 2 failing tests — "renders 60 placeholder background cells" (receives 24) and "hub-container is a vertical scroll viewport" (missing `overflow-y-auto`). Other tests still pass.

- [ ] **Step 1.4: Commit the failing tests**

```bash
git add apps/web/src/__tests__/widget-grid.test.tsx
git commit -m "test(web): expect 6x10 grid and scrollable hub-container"
```

---

## Task 2: Fix cell-size calc, bump to 10 rows, add scroll

Make the production code match the new assertions.

**Files:**
- Modify: `apps/web/src/components/hub/widget-grid.tsx:14-22` (constants + `computeCellSize`)
- Modify: `apps/web/src/components/hub/widget-grid.tsx:64-72` (container classes)

- [ ] **Step 2.1: Bump GRID_ROWS from 4 to 10**

At line 15, change:

```typescript
const GRID_ROWS = 4;
```

to:

```typescript
const GRID_ROWS = 10;
```

- [ ] **Step 2.2: Fix computeCellSize — remove double-subtracted padding**

`ResizeObserver.contentRect.width` already excludes padding (it's the content-box width). Subtracting `GRID_PADDING_PX` again makes rows ~7px shorter than columns. Also delete `GRID_PADDING_PX` since nothing else uses it.

At lines 16-22, change:

```typescript
const GRID_PADDING_PX = 40; // p-5 = 20px each side
const GRID_GAP_PX = 12; // gap-3 = 12px

function computeCellSize(containerWidth: number): number {
  const totalGaps = (GRID_COLS - 1) * GRID_GAP_PX;
  return (containerWidth - GRID_PADDING_PX - totalGaps) / GRID_COLS;
}
```

to:

```typescript
const GRID_GAP_PX = 12; // gap-3 = 12px

// contentWidth is the content-box width from ResizeObserver (padding already excluded).
// Column width is therefore (contentWidth - gaps) / cols — which is exactly what 1fr resolves to.
function computeCellSize(contentWidth: number): number {
  const totalGaps = (GRID_COLS - 1) * GRID_GAP_PX;
  return (contentWidth - totalGaps) / GRID_COLS;
}
```

- [ ] **Step 2.3: Make hub-container the scroll viewport**

At line 64, change:

```tsx
    <div data-testid="hub-container" className="relative min-h-full bg-background">
```

to:

```tsx
    <div data-testid="hub-container" className="relative h-full overflow-y-auto bg-background">
```

- [ ] **Step 2.4: Remove `min-h-full` from the inner grid so it sizes to its contents**

At line 68, change:

```tsx
        className="relative grid gap-3 p-5 min-h-full"
```

to:

```tsx
        className="relative grid gap-3 p-5"
```

- [ ] **Step 2.5: Run the unit tests, confirm green**

Run: `cd apps/web && bunx vitest run src/__tests__/widget-grid.test.tsx`

Expected: all tests pass, including the two from Task 1.

- [ ] **Step 2.6: Run full web test suite**

Run: `cd apps/web && bun run test`

Expected: all tests pass. If any card-expand / card-overlay tests break because the expanded-view layer relied on the old container height, note it and address before proceeding — no changes expected.

- [ ] **Step 2.7: Typecheck + lint**

Run: `bun run typecheck && bun run lint:fix`

Expected: zero type errors; Biome may auto-fix trivial formatting.

- [ ] **Step 2.8: Commit the implementation**

```bash
git add apps/web/src/components/hub/widget-grid.tsx
git commit -m "fix(web): square tiles + 10-row scrollable grid

- Fix computeCellSize double-subtracting padding (contentRect.width
  already excludes it). Tiles were ~7px shorter than wide at iPad
  resolution (1366x1024). Now rows match 1fr column width exactly.
- Bump GRID_ROWS 4 -> 10; hub-container becomes the vertical scroll
  viewport (h-full overflow-y-auto). #root stays clipped to iPad
  viewport so only the grid scrolls.
- Background placeholders now fill all 60 cells (6x10); app cards
  render on top in the same CSS Grid, so empty 1x1 slots show the
  placeholder pattern."
```

---

## Task 3: Visual verification at iPad resolution

Run the dev stack and capture a screenshot at iPad resolution to confirm tiles are visually square and the grid scrolls.

**Files:** none modified.

- [ ] **Step 3.1: Start Tilt with a port offset for this worktree**

From the worktree root:

```bash
PORT_OFFSET=10 tilt up
```

Expected: Tilt brings up Inngest, API (port 4211), web (port 4210). Wait until the "web" resource shows green.

- [ ] **Step 3.2: Load the app in agent-browser at iPad resolution**

Run:

```bash
agent-browser --headless --viewport 1366x1024 --screenshot docs/screenshots/square-grid-top.png http://localhost:4210/
```

Expected: screenshot saved. Tiles under Lights / Fan / Climate / Settings / Stocks should appear visually square (width == height).

- [ ] **Step 3.3: Measure a tile programmatically**

Run in a small script via agent-browser eval (or add a quick Playwright check):

```bash
agent-browser --headless --viewport 1366x1024 --eval "
  const el = document.querySelector('[data-testid=widget-card-lights]');
  const r = el.getBoundingClientRect();
  console.log(JSON.stringify({ w: r.width, h: r.height, ratio: r.width / r.height }));
" http://localhost:4210/
```

Expected: `ratio` is `1.00` (or within ±0.02). If it's >1.03 or <0.97, the cell-size calc is still off — revisit Step 2.2.

- [ ] **Step 3.4: Verify scroll works (grid extends below the fold)**

Run:

```bash
agent-browser --headless --viewport 1366x1024 --eval "
  const hub = document.querySelector('[data-testid=hub-container]');
  console.log(JSON.stringify({
    scrollHeight: hub.scrollHeight,
    clientHeight: hub.clientHeight,
    canScroll: hub.scrollHeight > hub.clientHeight
  }));
" http://localhost:4210/
```

Expected: `canScroll: true`. `scrollHeight` is roughly 10 * cellSize + 9 * 12 + 40 ≈ 2258px; `clientHeight` ≈ 1024px.

- [ ] **Step 3.5: Capture a scrolled screenshot**

```bash
agent-browser --headless --viewport 1366x1024 --eval "
  document.querySelector('[data-testid=hub-container]').scrollTop = 800;
" --screenshot docs/screenshots/square-grid-scrolled.png http://localhost:4210/
```

Expected: the screenshot shows the lower placeholder rows (no app tiles), proving the background grid pattern continues down.

- [ ] **Step 3.6: Commit screenshots**

```bash
git add docs/screenshots/square-grid-top.png docs/screenshots/square-grid-scrolled.png
git commit -m "docs(web): add screenshots of square 6x10 grid"
```

---

## Task 4: E2E test for scroll + square tile

Add one Playwright test that locks in the square-tile + scroll behaviour so a regression can't silently reintroduce the old bug.

**Files:**
- Modify: `e2e/dashboard-grid.spec.ts` (append two tests at the end of the `describe` block)

- [ ] **Step 4.1: Write the failing test (before running anything)**

Append inside the `describe` block at `e2e/dashboard-grid.spec.ts`, before the closing `});` on line 69:

```typescript
  test("tiles are square at iPad resolution", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    const box = await page.getByTestId("widget-card-lights").boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(Math.abs(box.width - box.height)).toBeLessThan(2);
  });

  test("hub-container is scrollable with 10 rows", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    const metrics = await page.getByTestId("hub-container").evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  });
```

- [ ] **Step 4.2: Run only these new tests**

```bash
bun run test:e2e -- e2e/dashboard-grid.spec.ts
```

Expected: all tests in the file pass, including the two new ones. If the square-tile test fails with `|w - h| > 2`, the cell-size fix didn't land — go back to Task 2.

- [ ] **Step 4.3: Commit E2E additions**

```bash
git add e2e/dashboard-grid.spec.ts
git commit -m "test(e2e): lock in square tiles + scrollable 10-row grid"
```

---

## Task 5: Ship it

- [ ] **Step 5.1: Push the branch**

```bash
git push -u origin feat/square-grid-scroll
```

- [ ] **Step 5.2: Open a PR**

```bash
gh pr create --title "fix(web): square tiles + scrollable 6x10 grid" --body "$(cat <<'EOF'
## Summary
- Fix double-subtracted padding in `computeCellSize` so tiles are truly square at iPad resolution (1366x1024).
- Expand grid from 6x4 to 6x10; inner `hub-container` becomes the vertical scroll viewport.
- Background placeholder grid now covers all 60 cells; app cards sit on top in the same CSS Grid, so empty slots show the placeholder pattern at 1x1 granularity.

## Test plan
- [x] Unit tests updated (`widget-grid.test.tsx`): 60 placeholders, scrollable hub-container.
- [x] E2E tests added (`dashboard-grid.spec.ts`): square-tile assertion + scroll assertion at iPad viewport.
- [x] Visual verification at 1366x1024 via agent-browser (screenshots in `docs/screenshots/`).
EOF
)"
```

Expected: PR URL printed. Copy it into the next response.

---

## Self-Review

**Spec coverage:**
- "Square tiles" → Task 2.2 (fix `computeCellSize`), Task 3.3 (measurement), Task 4.1 (E2E lock-in). ✅
- "Scrolling" → Task 2.3-2.4 (`overflow-y-auto`, drop `min-h-full`), Task 3.4 (verify canScroll), Task 4.1 (E2E). ✅
- "10 rows down" → Task 2.1 (`GRID_ROWS = 10`), Task 1.1 (expect 60 placeholders). ✅
- "Background placeholder on every square; app tiles on top" → existing render order in `widget-grid.tsx:74-98` already does this; Task 1.1 raises the placeholder count assertion to 60 to prove coverage. ✅
- "Run the app" → Task 3.1-3.5. ✅

**Placeholder scan:** no TBDs, no "handle edge cases", every step has exact code or exact commands.

**Type consistency:** `GRID_COLS`, `GRID_ROWS`, `GRID_GAP_PX`, `computeCellSize`, `hub-container`, `widget-grid` used identically across tasks.

**Risk notes:**
- `use-idle-timeout` listens for pointer/key events — scrolling the hub-container will count as activity (expected). If we later want a scrolled dashboard to still trigger the clock, that's a follow-up, not in this plan.
- `use-screen-dimming` dims the root when idle; scrolling shouldn't affect it.
- Card overlays (expanded views) portal out of the grid — scroll position inside hub-container doesn't affect them. No change needed.
