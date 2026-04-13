import { beforeEach, describe, expect, it, vi } from "vitest";
import { HaError } from "../../integrations/homeassistant/types";
import * as haService from "../../services/ha-service";
import { appRouter } from "../../trpc/routers";

vi.mock("../../services/ha-service", () => ({
  getLightsState: vi.fn(),
  turnAllLightsOn: vi.fn(),
  turnAllLightsOff: vi.fn(),
  getMediaPlayers: vi.fn(),
  mediaPlayerCommand: vi.fn(),
  setVolume: vi.fn(),
  getClimateState: vi.fn(),
  turnFanOn: vi.fn(),
  turnFanOff: vi.fn(),
  setTemperature: vi.fn(),
}));

const caller = appRouter.createCaller({} as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("devices.climate", () => {
  it("returns ClimateState on success", async () => {
    const mockState = {
      entityId: "climate.living_room",
      friendlyName: "Living Room AC",
      currentTemp: 72,
      tempUnit: "F" as const,
      hvacMode: "cool",
      hvacAction: "cooling",
      fanOn: false,
      targetTemp: 72,
    };
    vi.mocked(haService.getClimateState).mockResolvedValueOnce(mockState);
    const result = await caller.devices.climate();
    expect(result).toEqual(mockState);
  });

  it("returns error on HaError", async () => {
    vi.mocked(haService.getClimateState).mockRejectedValueOnce(new HaError(503, "Unavailable"));
    const result = await caller.devices.climate();
    expect(result).toHaveProperty("error");
  });

  it("returns null when no entities", async () => {
    vi.mocked(haService.getClimateState).mockResolvedValueOnce(null);
    const result = await caller.devices.climate();
    expect(result).toBeNull();
  });
});

describe("devices.fanOn", () => {
  it("calls turnFanOn with entityId", async () => {
    vi.mocked(haService.turnFanOn).mockResolvedValueOnce(undefined);
    await caller.devices.fanOn({ entityId: "climate.lr" });
    expect(haService.turnFanOn).toHaveBeenCalledWith("climate.lr");
  });

  it("returns error on HaError", async () => {
    vi.mocked(haService.turnFanOn).mockRejectedValueOnce(new HaError(503, "Unavailable"));
    const result = await caller.devices.fanOn({ entityId: "climate.lr" });
    expect(result).toHaveProperty("error");
  });
});

describe("devices.fanOff", () => {
  it("calls turnFanOff with entityId", async () => {
    vi.mocked(haService.turnFanOff).mockResolvedValueOnce(undefined);
    await caller.devices.fanOff({ entityId: "climate.lr" });
    expect(haService.turnFanOff).toHaveBeenCalledWith("climate.lr");
  });
});
