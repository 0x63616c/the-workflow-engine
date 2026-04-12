import { useAppConfig } from "@/hooks/use-app-config";
import { trpc } from "@/lib/trpc";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    appConfig: {
      getAll: {
        useQuery: vi.fn(),
      },
      set: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const mockGetAll = vi.mocked(trpc.appConfig.getAll.useQuery);
const mockSet = vi.mocked(trpc.appConfig.set.useMutation);

function setupMocks({ data = {} as Record<string, unknown>, isLoading = false } = {}) {
  const mutateFn = vi.fn();
  mockGetAll.mockReturnValue({ data, isLoading } as never);
  mockSet.mockReturnValue({ mutate: mutateFn } as never);
  return mutateFn;
}

describe("useAppConfig", () => {
  it("returns isLoading true while fetching", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useAppConfig());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns config values from query data", () => {
    setupMocks({
      data: { "theme.activePaletteId": "midnight", "display.idleTimeout_MS": 45000 },
    });
    const { result } = renderHook(() => useAppConfig());
    expect(result.current.get("theme.activePaletteId")).toBe("midnight");
    expect(result.current.get("display.idleTimeout_MS")).toBe(45000);
  });

  it("returns null for missing key", () => {
    setupMocks({ data: {} });
    const { result } = renderHook(() => useAppConfig());
    expect(result.current.get("nonexistent.key")).toBeNull();
  });

  it("set calls mutation with key and value", () => {
    const mutateFn = setupMocks();
    const { result } = renderHook(() => useAppConfig());
    result.current.set("theme.activePaletteId", "daylight");
    expect(mutateFn).toHaveBeenCalledWith({ key: "theme.activePaletteId", value: "daylight" });
  });

  it("returns null values when data is undefined (loading)", () => {
    setupMocks({ isLoading: true, data: undefined as never });
    const { result } = renderHook(() => useAppConfig());
    expect(result.current.get("any.key")).toBeNull();
  });
});
