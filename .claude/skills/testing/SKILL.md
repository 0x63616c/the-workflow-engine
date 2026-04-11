---
name: testing
description: Guide for test-driven development workflow covering API tests, frontend tests, and E2E visual verification
user_invocable: false
---

# Testing Workflow

## TDD Cycle

Every feature follows red/green/refactor:

1. **Red**: Write a failing test that describes the expected behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up while keeping tests green

No task is "done" until tests pass AND visual verification confirms the feature works.

## API Testing

### Router tests (unit)

Use `createCaller` to test tRPC routers without HTTP:

```ts
import { describe, expect, it } from "vitest";
import { appRouter } from "../trpc/routers";
import { createContext } from "../trpc/context";

describe("health router", () => {
  it("returns ok status", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.health.ping();
    expect(result.status).toBe("ok");
  });
});
```

### Integration tests

Use `fetch` or `curl` against a running server for full-stack validation:

```ts
const res = await fetch("http://localhost:4201/trpc/health.ping");
const json = await res.json();
expect(json.result.data.status).toBe("ok");
```

### Service tests

Test services directly with a test DB instance:

```ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";

const testDb = drizzle({ client: new Database(":memory:"), schema });
// Run migrations on testDb, then test service methods
```

## Frontend Testing

### Component tests (Vitest + Testing Library)

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyComponent } from "../components/MyComponent";

describe("MyComponent", () => {
  it("renders the title", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Visual verification (E2E)

After any UI change, run the dev server and verify visually:

```bash
bun run dev  # Start on port 4200
```

Use browser automation (`agent-browser` CLI) to navigate and verify. Never skip this step for UI work.

## Test File Location

Tests are co-located with source in `src/__tests__/` directories:

```
apps/api/src/__tests__/health.test.ts
apps/web/src/__tests__/App.test.tsx
```

## Running Tests

```bash
# Per app
cd apps/api && bun run test
cd apps/web && bun run test

# Watch mode (during development)
cd apps/api && bun run test -- --watch
```

## What "Done" Means

1. All unit tests pass (`bun run test`)
2. Linting passes (`bun run lint:fix`)
3. TypeScript compiles (`tsc --noEmit`)
4. For UI: visually verified in browser
5. For API: tested with curl/fetch against running server
