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

Routes live in `src/routes/`. The TanStack Router Vite plugin auto-generates `routeTree.gen.ts` on dev/build. Do not hand-edit that file.

- `__root.tsx` is the root layout. Wrap providers here.
- `index.tsx` maps to `/`.
- Nested routes: `workflows/index.tsx` maps to `/workflows`, `workflows/$id.tsx` maps to `/workflows/:id`.

## tRPC Client

The tRPC client is configured in `src/lib/trpc.ts` using `@trpc/react-query`. It uses `splitLink` to route subscriptions over SSE and queries/mutations over HTTP batch.

```tsx
import { trpc } from "../lib/trpc";

// In a component:
const { data } = trpc.health.ping.useQuery();
```

The API type comes from `@repo/api/trpc` (workspace import). The web app proxies `/trpc` to the API via Vite config.

## Zustand Stores

Create stores in `src/stores/`. Use the slice pattern for complex state.

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

- Tailwind v4: configuration is in `globals.css` using `@theme`, not `tailwind.config.js`.
- Theme tokens: `--color-background`, `--color-foreground`, `--color-primary`, etc. defined in `src/styles/globals.css`.
- Use `cn()` from `src/lib/utils.ts` for conditional class merging (clsx + tailwind-merge).
- Add shadcn components with: `bunx shadcn@latest add <component> --cwd apps/web`

## Testing

- Test files go in `src/__tests__/`.
- Use Vitest + `@testing-library/react`.
- The test environment is jsdom (configured in `vitest.config.ts`).
- Run tests: `bun run test` from `apps/web/`.

## Commands

```bash
bun run dev        # Vite dev server on port 4200
bun run build      # Type-check + production build
bun run test       # Vitest
bun run typecheck  # tsc --noEmit
bun run lint:fix   # Biome
```

## Rules

- Never hand-edit `routeTree.gen.ts`.
- Imports from `@repo/shared` are allowed. Imports from `@repo/api/trpc` are allowed (type-only for AppRouter).
- Do not import API internals (db, services, inngest) from the web app.
- Use `bun` / `bunx`, never `npm` / `npx`.
