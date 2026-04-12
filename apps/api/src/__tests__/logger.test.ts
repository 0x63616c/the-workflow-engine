import { describe, expect, it, vi } from "vitest";

describe("logger", () => {
  it("exports a pino logger instance", async () => {
    const { log } = await import("../lib/logger");
    expect(log).toBeDefined();
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.debug).toBe("function");
  });

  it("respects LOG_LEVEL env var", async () => {
    // Reset modules to pick up the env var
    vi.resetModules();
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "warn";

    const { log } = await import("../lib/logger");
    expect(log.level).toBe("warn");

    process.env.LOG_LEVEL = originalLevel;
    vi.resetModules();
  });

  it("defaults to info level", async () => {
    vi.resetModules();
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = undefined;

    const { log } = await import("../lib/logger");
    expect(log.level).toBe("info");

    process.env.LOG_LEVEL = originalLevel;
    vi.resetModules();
  });

  it("structured log calls do not throw", async () => {
    const { log } = await import("../lib/logger");
    expect(() => log.info({ port: 4201, env: "test" }, "server started")).not.toThrow();
    expect(() =>
      log.error(
        { path: "/trpc/health", code: "INTERNAL_SERVER_ERROR", error: "oops" },
        "tRPC error",
      ),
    ).not.toThrow();
    expect(() => log.warn({ status: 429 }, "rate limited")).not.toThrow();
  });

  it("child logger retains parent level", async () => {
    const { log } = await import("../lib/logger");
    const child = log.child({ service: "ha-service" });
    expect(child.level).toBe(log.level);
    expect(typeof child.info).toBe("function");
  });
});
