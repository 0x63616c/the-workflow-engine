import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@grafana/faro-web-sdk", () => ({
  initializeFaro: vi.fn(() => ({
    api: {
      pushError: vi.fn(),
      pushLog: vi.fn(),
    },
  })),
  getWebInstrumentations: vi.fn(() => []),
}));

vi.mock("@grafana/faro-react", () => ({
  ReactIntegration: vi.fn(),
}));

describe("faro", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initFaro returns a faro instance when URL is provided", async () => {
    const { initializeFaro } = await import("@grafana/faro-web-sdk");
    const { initFaro } = await import("@/lib/faro");

    const faro = initFaro("https://example.com/api/collect", "test-app", "1.0.0");

    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/api/collect",
        app: expect.objectContaining({
          name: "test-app",
          version: "1.0.0",
        }),
      }),
    );
    expect(faro).toBeDefined();
  });

  it("initFaro returns null when url is empty", async () => {
    const { initFaro } = await import("@/lib/faro");

    const faro = initFaro("", "test-app", "1.0.0");

    expect(faro).toBeNull();
  });
});

describe("dedup", () => {
  it("deduplicates identical errors within the window", async () => {
    vi.resetModules();
    const { _isDuplicate, _recentErrors } = await import("@/lib/faro");
    _recentErrors.clear();

    const first = _isDuplicate("test-key");
    const second = _isDuplicate("test-key");

    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it("allows the same error after the dedup window expires", async () => {
    vi.resetModules();
    const { _isDuplicate, _recentErrors } = await import("@/lib/faro");
    _recentErrors.clear();

    _recentErrors.set("test-key", Date.now() - 61_000);
    const result = _isDuplicate("test-key");

    expect(result).toBe(false);
  });
});
