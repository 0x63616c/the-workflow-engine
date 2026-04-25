# Writing an Integration Plugin

## Overview

Integration plugins connect external services (APIs, databases, message brokers, etc.) to the Evee. Each plugin implements the `Integration` interface and is isolated from other API layers.

## Interface

Defined in `apps/api/src/integrations/types.ts`:

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

## Methods

### `init()`

Called once when the plugin is loaded. Use this for authentication, connection setup, or loading configuration.

### `getState()`

Returns a snapshot of the plugin's current state. Used by the engine to inspect integration status and by the UI to display state.

### `execute(command, params)`

Runs a named command with the given parameters. This is the primary action interface. Commands are plugin-specific (e.g., `send-message`, `create-ticket`, `query-data`).

### `subscribe(callback)` (optional)

Registers a callback for real-time events from the integration. Returns an unsubscribe function. Useful for webhooks, websocket streams, or polling-based event sources.

## Example Plugin

```ts
// apps/api/src/integrations/example/index.ts

import type { Integration } from "../types";

export class ExampleIntegration implements Integration {
  id = "example";
  name = "Example Service";

  private apiKey: string | null = null;

  async init() {
    // Load credentials, establish connections
    this.apiKey = process.env.EXAMPLE_API_KEY ?? null;
  }

  async getState() {
    return {
      connected: this.apiKey !== null,
    };
  }

  async execute(command: string, params: Record<string, unknown>) {
    switch (command) {
      case "ping":
        return { pong: true };
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  subscribe(callback: (event: unknown) => void) {
    const interval = setInterval(() => {
      callback({ type: "heartbeat", timestamp: Date.now() });
    }, 30_000);

    return () => clearInterval(interval);
  }
}
```

## Import Rules

Plugins are isolated. A plugin file may only import:

- `@repo/shared` (shared types and schemas)
- Other files within the same integration directory
- Third-party packages specific to the integration

Plugins must **not** import from `db/`, `services/`, `trpc/`, or `inngest/`. The services layer calls into plugins, not the other way around.

## Registration

Plugins are registered and initialized by the services layer. The service layer is responsible for lifecycle management (init, teardown) and exposing plugin capabilities to tRPC routers and Inngest functions.

## Testing

Test plugins in isolation. Mock external APIs and verify that `execute()` returns expected results for each command.

```ts
import { describe, expect, it } from "vitest";
import { ExampleIntegration } from "../integrations/example";

describe("ExampleIntegration", () => {
  it("responds to ping", async () => {
    const plugin = new ExampleIntegration();
    await plugin.init();
    const result = await plugin.execute("ping", {});
    expect(result).toEqual({ pong: true });
  });
});
```
