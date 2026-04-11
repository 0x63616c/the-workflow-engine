import { describe, expect, it } from "vitest";

import { appRouter } from "../trpc/routers";

describe("health router", () => {
  it("returns ok status", async () => {
    // Health endpoint doesn't use db, so pass empty context
    const caller = appRouter.createCaller({} as never);
    const result = await caller.health.ping();
    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeTypeOf("number");
  });
});
