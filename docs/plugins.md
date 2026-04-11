# Writing an Integration Plugin

Integration plugins connect external services (Home Assistant, weather APIs, music services) to the Workflow Engine.

## Plugin Interface

Every plugin implements the `Integration` interface from `apps/api/src/integrations/types.ts`:

```ts
export interface Integration {
  id: string;
  name: string;
  init(): Promise<void>;
  getState(): Promise<Record<string, unknown>>;
  execute(command: string, params: Record<string, unknown>): Promise<unknown>;
  subscribe?(callback: (event: unknown) => void): () => void;
}
```

## Steps

### 1. Create the integration folder

```
apps/api/src/integrations/<name>/
  index.ts    # Integration implementation
```

```ts
// apps/api/src/integrations/weather/index.ts
import type { Integration } from "../types";

export class WeatherIntegration implements Integration {
  id = "weather";
  name = "Weather";

  async init() {
    // Set up API client, validate credentials
  }

  async getState() {
    // Return current weather data
    return { temp: 22, condition: "clear" };
  }

  async execute(command: string, params: Record<string, unknown>) {
    // Handle commands (e.g., "refresh")
    switch (command) {
      case "refresh":
        return this.getState();
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  subscribe(callback: (event: unknown) => void) {
    // Optional: push real-time updates
    const interval = setInterval(async () => {
      callback(await this.getState());
    }, 60_000);
    return () => clearInterval(interval);
  }
}
```

### 2. Create Inngest functions for async work

```ts
// apps/api/src/inngest/functions/poll-weather.ts
import { inngest } from "../client";
import { WeatherService } from "../../services/weather";

export const pollWeather = inngest.createFunction(
  { id: "poll-weather" },
  { cron: "*/15 * * * *" },  // Every 15 minutes
  async ({ step }) => {
    await step.run("fetch-weather", async () => {
      return WeatherService.fetchAndStore();
    });
  },
);
```

Register in `src/server.ts`:

```ts
import { pollWeather } from "./inngest/functions/poll-weather";

const inngestHandler = serve({
  client: inngest,
  functions: [pollWeather],
});
```

### 3. Create a service for business logic

```ts
// apps/api/src/services/weather.ts
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type * as schema from "../db/schema";

export const WeatherService = {
  async fetchAndStore() {
    // Fetch from external API, store in DB
  },
  async getCurrent(db: BunSQLiteDatabase<typeof schema>) {
    // Read current weather from DB
  },
};
```

### 4. Create a tRPC router for API endpoints

```ts
// apps/api/src/trpc/routers/weather.ts
import { publicProcedure, router } from "../init";
import { WeatherService } from "../../services/weather";

export const weatherRouter = router({
  current: publicProcedure.query(async ({ ctx }) => {
    return WeatherService.getCurrent(ctx.db);
  }),
});
```

Register in `src/trpc/routers/index.ts`:

```ts
import { weatherRouter } from "./weather";

export const appRouter = router({
  health: healthRouter,
  weather: weatherRouter,
});
```

### 5. Register with the Integration Hub

Once the Integration Hub core system is built, register the plugin:

```ts
import { WeatherIntegration } from "../integrations/weather";

hub.register(new WeatherIntegration());
```

## Import Rules

Plugins must respect the import boundary rules:

- `integrations/<name>/` can only import from shared types (`integrations/types.ts`)
- `services/` can import from `db/` and `integrations/types`
- `trpc/routers/` can only import from `services/`
- `inngest/functions/` can only import from `services/` and `inngest/client`

Never import tRPC, Inngest, or HTTP concerns into the integration implementation itself.
