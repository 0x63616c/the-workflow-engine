# Testing Skill

## Test Runner

Both apps use Vitest (`bun run test` in each app dir). Root `bun run test` runs all workspaces.

## API Tests

Location: `apps/api/src/__tests__/`

**Pattern: tRPC createCaller**

```ts
import { describe, expect, it } from "vitest";
import { appRouter } from "../trpc/routers";

describe("my router", () => {
  it("does something", async () => {
    const caller = appRouter.createCaller({} as never);
    const result = await caller.my.list();
    expect(result).toEqual([]);
  });
});
```

- No db needed: pass `{} as never` as context.
- Needs db: create test SQLite DB or mock context.
- `bun:sqlite` aliased to mock in `vitest.config.ts` so imports resolve in Node.

**API test caveats:**
- Vitest runs in Node, not Bun. Bun-specific APIs (`Bun.serve`, `bun:sqlite`) need mocks.
- `__mocks__/bun-sqlite.ts` provides stub `Database` class for import resolution.

## Frontend Tests

Location: `apps/web/src/__tests__/`

**Pattern: Testing Library + Vitest**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "../components/my-component";

describe("MyComponent", () => {
  it("renders text", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

- jsdom environment (configured in `apps/web/vitest.config.ts`).
- `@testing-library/jest-dom` matchers via `src/test-setup.ts`.
- Components using tRPC hooks: wrap in tRPC + QueryClient providers or mock hooks.

## TDD Workflow

1. Write failing test (red).
2. Implement minimum code to pass (green).
3. Refactor while keeping tests green.
4. Run `bun run test` to verify.

## Browser Testing

For E2E and visual verification, use `agent-browser` (installed locally, do not use bunx).

```bash
agent-browser                          # Interactive mode
agent-browser "navigate to localhost:4200 and verify the page loads"
```

Screenshot verification without stealing focus:
- Get window IDs via Swift/CoreGraphics (not osascript UI scripting).
- Capture with `screencapture -x -l <windowID>`.
- Save to `docs/screenshots/` in repo.

## Import Boundary Tests

```bash
bun run check:boundaries
```

Verifies API layers respect import rules. See `scripts/check-boundaries.ts` for full rule set.

## Running All Checks

```bash
bun run typecheck          # Type-check all workspaces
bun run lint               # Biome lint all files
bun run test               # Vitest in all workspaces
bun run check:boundaries   # Import boundary enforcement
```
