import { useClimate } from "@/hooks/use-climate";
import { trpc } from "@/lib/trpc";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      devices: {
        climate: { invalidate: vi.fn() },
      },
    })),
    devices: {
      climate: {
        useQuery: vi.fn(),
      },
      fanOn: {
        useMutation: vi.fn(),
      },
      fanOff: {
        useMutation: vi.fn(),
      },
      setTemperature: {
        useMutation: vi.fn(),
      },
      onStateChange: {
        useSubscription: vi.fn(),
      },
    },
  },
}));

const mockClimateQuery = vi.mocked(trpc.devices.climate.useQuery);
const mockFanOnMutation = vi.mocked(trpc.devices.fanOn.useMutation);
const mockFanOffMutation = vi.mocked(trpc.devices.fanOff.useMutation);
const mockSetTempMutation = vi.mocked(trpc.devices.setTemperature.useMutation);
const mockOnStateChange = vi.mocked(trpc.devices.onStateChange.useSubscription);

function setupMocks({
  queryData = undefined as
    | {
        entityId: string;
        friendlyName: string;
        currentTemp: number | null;
        tempUnit: "F" | "C";
        hvacMode: string;
        hvacAction: string | null;
        fanOn: boolean;
        targetTemp: number | null;
      }
    | { error: string }
    | undefined,
  isLoading = false,
  isError = false,
} = {}) {
  const fanOnMutate = vi.fn();
  const fanOffMutate = vi.fn();
  const setTempMutate = vi.fn();
  mockClimateQuery.mockReturnValue({ data: queryData, isLoading, isError } as never);
  mockFanOnMutation.mockReturnValue({ mutate: fanOnMutate } as never);
  mockFanOffMutation.mockReturnValue({ mutate: fanOffMutate } as never);
  mockSetTempMutation.mockReturnValue({ mutate: setTempMutate } as never);
  mockOnStateChange.mockReturnValue(undefined as never);
  return { fanOnMutate, fanOffMutate, setTempMutate };
}

describe("useClimate", () => {
  it("returns null values when loading", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useClimate());
    expect(result.current.entityId).toBeNull();
    expect(result.current.currentTemp).toBeNull();
    expect(result.current.targetTemp).toBeNull();
    expect(result.current.fanOn).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns climate data when query succeeds", () => {
    setupMocks({
      queryData: {
        entityId: "climate.living_room",
        friendlyName: "Living Room AC",
        currentTemp: 72,
        tempUnit: "F",
        hvacMode: "cool",
        hvacAction: "cooling",
        fanOn: false,
        targetTemp: 72,
      },
    });
    const { result } = renderHook(() => useClimate());
    expect(result.current.entityId).toBe("climate.living_room");
    expect(result.current.currentTemp).toBe(72);
    expect(result.current.targetTemp).toBe(72);
    expect(result.current.tempUnit).toBe("F");
    expect(result.current.hvacMode).toBe("cool");
    expect(result.current.fanOn).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("returns isError true when query fails", () => {
    setupMocks({ isError: true });
    const { result } = renderHook(() => useClimate());
    expect(result.current.isError).toBe(true);
  });

  it("returns isError true when data contains error field", () => {
    setupMocks({ queryData: { error: "HA unavailable" } });
    const { result } = renderHook(() => useClimate());
    expect(result.current.isError).toBe(true);
  });

  it("turnFanOn calls fanOn mutation with entityId", () => {
    const { fanOnMutate } = setupMocks();
    const { result } = renderHook(() => useClimate());
    result.current.turnFanOn("climate.lr");
    expect(fanOnMutate).toHaveBeenCalledWith({ entityId: "climate.lr" });
  });

  it("turnFanOff calls fanOff mutation with entityId", () => {
    const { fanOffMutate } = setupMocks();
    const { result } = renderHook(() => useClimate());
    result.current.turnFanOff("climate.lr");
    expect(fanOffMutate).toHaveBeenCalledWith({ entityId: "climate.lr" });
  });

  it("setTemperature calls setTemperature mutation", () => {
    const { setTempMutate } = setupMocks();
    const { result } = renderHook(() => useClimate());
    result.current.setTemperature("climate.lr", 74);
    expect(setTempMutate).toHaveBeenCalledWith({ entityId: "climate.lr", temperature: 74 });
  });

  it("subscribes to climate and fan domain state changes", () => {
    setupMocks();
    renderHook(() => useClimate());
    expect(mockOnStateChange).toHaveBeenCalledWith(
      { domains: ["climate", "fan"] },
      expect.objectContaining({ onData: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("onData callback invalidates climate query cache", () => {
    const invalidate = vi.fn();
    vi.mocked(trpc.useUtils).mockReturnValue({
      devices: { climate: { invalidate } },
    } as never);

    let capturedOnData: (() => void) | undefined;
    mockOnStateChange.mockImplementation((_input, opts) => {
      capturedOnData = (opts as { onData?: () => void }).onData;
      return undefined as never;
    });

    // Set up remaining mocks without overriding useUtils
    const mutateFn = vi.fn();
    mockClimateQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);
    mockFanOnMutation.mockReturnValue({ mutate: mutateFn } as never);
    mockFanOffMutation.mockReturnValue({ mutate: mutateFn } as never);
    mockSetTempMutation.mockReturnValue({ mutate: mutateFn } as never);

    renderHook(() => useClimate());
    capturedOnData?.();
    expect(invalidate).toHaveBeenCalled();
  });
});
