# Testing Skill

## Test Runner

Both apps use Vitest (`bun run test` in each app directory). The root `bun run test` runs tests across all workspaces.

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

- For endpoints that don't need db, pass `{} as never` as context.
- For endpoints that need db, create a test SQLite database or mock the context.
- `bun:sqlite` is aliased to a mock in `vitest.config.ts` so imports resolve in Node.

**API test caveats:**
- Vitest runs in Node, not Bun. Bun-specific APIs (`Bun.serve`, `bun:sqlite`) need mocks.
- The `__mocks__/bun-sqlite.ts` provides a stub `Database` class for import resolution.

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

- Environment is jsdom (configured in `apps/web/vitest.config.ts`).
- `@testing-library/jest-dom` matchers are available via `src/test-setup.ts`.
- For components that use tRPC hooks, wrap in the tRPC + QueryClient providers or mock the hooks.

## TDD Workflow

1. Write a failing test (red).
2. Implement the minimum code to pass (green).
3. Refactor while keeping tests green.
4. Run `bun run test` to verify.

## Browser Testing

For E2E and visual verification, use `agent-browser` (installed locally, do not use bunx).

```bash
agent-browser                          # Interactive mode
agent-browser "navigate to localhost:4200 and verify the page loads"
```

For screenshot verification without stealing focus:
- Get window IDs via Swift/CoreGraphics (not osascript UI scripting).
- Capture with `screencapture -x -l <windowID>` to avoid stealing focus.
- Save screenshots to `docs/screenshots/` in the repo.

## Import Boundary Tests

Run from repo root:
```bash
bun run check:boundaries
```

This verifies that API layers respect their import rules (db, services, routers, inngest, integrations). See `scripts/check-boundaries.ts` for the full rule set.

## Running All Checks

```bash
bun run typecheck          # Type-check all workspaces
bun run lint               # Biome lint all files
bun run test               # Vitest in all workspaces
bun run check:boundaries   # Import boundary enforcement
```
