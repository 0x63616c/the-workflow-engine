import { useLights } from "@/hooks/use-lights";
import { trpc } from "@/lib/trpc";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      devices: {
        lights: { invalidate: vi.fn() },
      },
    })),
    devices: {
      lights: {
        useQuery: vi.fn(),
      },
      lightsOn: {
        useMutation: vi.fn(),
      },
      lightsOff: {
        useMutation: vi.fn(),
      },
      onStateChange: {
        useSubscription: vi.fn(),
      },
    },
  },
}));

const mockLightsQuery = vi.mocked(trpc.devices.lights.useQuery);
const mockLightsOnMutation = vi.mocked(trpc.devices.lightsOn.useMutation);
const mockLightsOffMutation = vi.mocked(trpc.devices.lightsOff.useMutation);
const mockOnStateChange = vi.mocked(trpc.devices.onStateChange.useSubscription);

function setupMocks({
  queryData = undefined as { onCount: number; totalCount: number } | { error: string } | undefined,
  isLoading = false,
  isError = false,
} = {}) {
  const mutateFn = vi.fn();
  mockLightsQuery.mockReturnValue({ data: queryData, isLoading, isError } as never);
  mockLightsOnMutation.mockReturnValue({ mutate: mutateFn } as never);
  mockLightsOffMutation.mockReturnValue({ mutate: mutateFn } as never);
  mockOnStateChange.mockReturnValue(undefined as never);
  return mutateFn;
}

describe("useLights", () => {
  it("returns zero counts when loading", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useLights());
    expect(result.current.onCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns counts when query succeeds", () => {
    setupMocks({ queryData: { onCount: 3, totalCount: 5 } });
    const { result } = renderHook(() => useLights());
    expect(result.current.onCount).toBe(3);
    expect(result.current.totalCount).toBe(5);
    expect(result.current.isError).toBe(false);
  });

  it("returns isError true when query fails", () => {
    setupMocks({ isError: true });
    const { result } = renderHook(() => useLights());
    expect(result.current.isError).toBe(true);
  });

  it("returns isError true when data contains error field", () => {
    setupMocks({ queryData: { error: "HA unavailable" } });
    const { result } = renderHook(() => useLights());
    expect(result.current.isError).toBe(true);
  });

  it("turnOn calls lightsOn mutation", () => {
    const mutateFn = setupMocks();
    const { result } = renderHook(() => useLights());
    result.current.turnOn();
    expect(mutateFn).toHaveBeenCalled();
  });

  it("turnOff calls lightsOff mutation", () => {
    const mutateFn = setupMocks();
    const { result } = renderHook(() => useLights());
    result.current.turnOff();
    expect(mutateFn).toHaveBeenCalled();
  });

  it("subscribes to light domain state changes", () => {
    setupMocks();
    renderHook(() => useLights());
    expect(mockOnStateChange).toHaveBeenCalledWith(
      { domains: ["light"] },
      expect.objectContaining({ onData: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("onData callback invalidates lights query cache", () => {
    const invalidate = vi.fn();
    vi.mocked(trpc.useUtils).mockReturnValue({
      devices: { lights: { invalidate } },
    } as never);

    let capturedOnData: (() => void) | undefined;
    mockOnStateChange.mockImplementation((_input, opts) => {
      capturedOnData = (opts as { onData?: () => void }).onData;
      return undefined as never;
    });

    // Set up remaining mocks without overriding useUtils
    const mutateFn = vi.fn();
    mockLightsQuery.mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    mockLightsOnMutation.mockReturnValue({ mutate: mutateFn } as never);
    mockLightsOffMutation.mockReturnValue({ mutate: mutateFn } as never);

    renderHook(() => useLights());
    capturedOnData?.();
    expect(invalidate).toHaveBeenCalled();
  });
});
