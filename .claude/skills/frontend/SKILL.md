# Frontend Skill (apps/web)

## Stack

- React 19, TypeScript, Vite
- TanStack Router (file-based routing via Vite plugin)
- TanStack Query + tRPC React Query for server state
- Zustand for client state (stores in `src/stores/`)
- Tailwind CSS v4, shadcn/ui (style: new-york, base: neutral)
- Icons: `lucide-react`
- Fonts: Geist (`geist` package)
- Testing: Vitest + Testing Library

## Directory Layout

```
apps/web/src/
  routes/         File-based routes (TanStack Router)
  components/ui/  shadcn/ui primitives
  components/     App-level components
  hooks/          Custom React hooks
  stores/         Zustand stores
  lib/            Utilities (trpc client, cn helper)
  styles/         globals.css, theme.ts
  __tests__/      Test files
```

## Routing

Routes in `src/routes/`. TanStack Router Vite plugin auto-generates `routeTree.gen.ts` on dev/build. Never hand-edit that file.

- `__root.tsx` = root layout. Wrap providers here.
- `index.tsx` maps to `/`.
- Nested: `workflows/index.tsx` → `/workflows`, `workflows/$id.tsx` → `/workflows/:id`.

## tRPC Client

Configured in `src/lib/trpc.ts` using `@trpc/react-query`. Uses `splitLink` to route subscriptions over SSE, queries/mutations over HTTP batch.

```tsx
import { trpc } from "../lib/trpc";

// In a component:
const { data } = trpc.health.ping.useQuery();
```

API type from `@repo/api/trpc` (workspace import). Web app proxies `/trpc` to API via Vite config.

## Zustand Stores

Create in `src/stores/`. Use slice pattern for complex state.

```ts
import { create } from "zustand";

interface CounterStore {
  count: number;
  increment: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
```

## Styling

- Tailwind v4: config in `globals.css` using `@theme`, not `tailwind.config.js`.
- Theme tokens: `--color-background`, `--color-foreground`, `--color-primary`, etc. in `src/styles/globals.css`.
- `cn()` from `src/lib/utils.ts` for conditional class merging (clsx + tailwind-merge).
- Add shadcn components: `bunx shadcn@latest add <component> --cwd apps/web`

## Testing

- **Vitest** unit tests in `src/__tests__/`. Run: `bun run test` from `apps/web/`.
- **Playwright E2E** tests in `e2e/` (repo root). Run: `bun run test:e2e` from repo root.
- jsdom environment for Vitest (configured in `vitest.config.ts`).

### E2E Tests (MANDATORY for frontend changes)

Every frontend PR MUST include Playwright E2E tests. Write them in the same PR as the feature code.

- **New card?** Add to `e2e/dashboard-grid.spec.ts` (visibility), `e2e/card-expand-collapse.spec.ts` (expand), and a card-specific spec file.
- **New tRPC query?** Add mock response to `e2e/mock-trpc.ts`.
- **New interaction?** Add edge case tests to `e2e/edge-cases.spec.ts`.
- **New expanded view?** Add content verification tests.
- Run `bun run test:e2e` before pushing. Run `bun run screenshots` for visual verification.
- No `waitForTimeout` for arbitrary delays. Use `expect(locator).toBeVisible()`, `waitForLoadState`, or `toPass()` polling.

## Commands

```bash
bun run dev        # Vite dev server on port 4200
bun run build      # Type-check + production build
bun run test       # Vitest unit tests
bun run test:e2e   # Playwright E2E tests (from repo root)
bun run screenshots # PR screenshots (from repo root)
bun run typecheck  # tsc --noEmit
bun run lint:fix   # Biome
```

## Rules

- Never hand-edit `routeTree.gen.ts`.
- `@repo/shared` imports allowed. `@repo/api/trpc` allowed (type-only for AppRouter).
- No importing API internals (db, services, inngest) from web app.
- `bun` / `bunx` only, never `npm` / `npx`.
