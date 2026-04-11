---
name: frontend
description: Guide for working on the React PWA frontend in apps/web (routing, components, state, styling, testing)
user_invocable: false
---

# Frontend Development (apps/web)

## Routing

TanStack Router with file-based routing via the Vite plugin. Add new routes as files in `src/routes/`.

- `src/routes/__root.tsx` - root layout
- `src/routes/index.tsx` - home route (`/`)
- `src/routes/settings.tsx` - `/settings`
- `src/routes/settings/general.tsx` - `/settings/general`

`routeTree.gen.ts` is auto-generated on dev/build. Do not hand-edit it. It is committed to git.

## Components

**shadcn/ui** (style: new-york, base: neutral). Install new components:

```bash
bunx shadcn@latest add <component-name>
```

Components land in `src/components/ui/`. Do not edit these directly unless customising.

Custom components go in `src/components/` (not inside `ui/`).

## Styling

**Tailwind CSS v4** with CSS-first configuration. Theme tokens live in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.ts`.

```css
@theme {
  --color-primary: oklch(0.7 0.15 200);
}
```

Use Tailwind utility classes. For dark mode, the app runs on a wall-mounted iPad, so design for OLED black backgrounds.

## State Management

- **Server state**: TanStack Query via tRPC hooks (see `src/lib/trpc.ts`)
- **Client state**: Zustand stores in `src/stores/`, export typed hooks

```ts
// src/stores/theme.ts
import { create } from "zustand";

interface ThemeStore {
  mode: "light" | "dark";
  setMode: (mode: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: "dark",
  setMode: (mode) => set({ mode }),
}));
```

## tRPC Client

Import the typed client from `src/lib/trpc.ts`. Use TanStack Query hooks for data fetching:

```ts
import { trpc } from "@/lib/trpc";

const { data } = trpc.health.ping.useQuery();
```

## Icons

Use `lucide-react` for all icons:

```ts
import { Settings } from "lucide-react";
```

## Import Alias

`@/` maps to `src/`. Always use it:

```ts
import { Button } from "@/components/ui/button";
```

## Testing

- **Unit/component tests**: Vitest + @testing-library/react, co-located in `src/__tests__/`
- **E2E/visual**: Run `bun run dev` and use browser automation to verify visually
- Always verify UI changes visually after implementing them

## Commands

```bash
bun run dev        # Start dev server on port 4200
bun run build      # Type-check + production build
bun run test       # Run Vitest
bun run lint:fix   # Biome lint + auto-fix
```
