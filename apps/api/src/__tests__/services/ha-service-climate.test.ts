import { beforeEach, describe, expect, it, vi } from "vitest";
import { ha } from "../../integrations/homeassistant";
import { getClimateState, turnFanOff, turnFanOn } from "../../services/ha-service";

vi.mock("../../integrations/homeassistant", () => ({
  ha: {
    getEntities: vi.fn(),
    getEntity: vi.fn(),
    callService: vi.fn(),
    init: vi.fn(),
  },
}));

const mockGetEntities = vi.mocked(ha.getEntities);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getClimateState()", () => {
  it("returns state for first climate entity", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.living_room",
        state: "cool",
        attributes: {
          friendly_name: "Living Room AC",
          current_temperature: 72,
          temperature_unit: "F",
          hvac_action: "cooling",
          fan_mode: "auto",
        },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result).toEqual({
      entityId: "climate.living_room",
      friendlyName: "Living Room AC",
      currentTemp: 72,
      tempUnit: "F",
      hvacMode: "cool",
      hvacAction: "cooling",
      fanOn: false,
      targetTemp: null,
    });
  });

  it("returns null when no climate entities", async () => {
    mockGetEntities.mockResolvedValue([]);
    const result = await getClimateState();
    expect(result).toBeNull();
  });

  it("picks first entity alphabetically by entity_id", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.z_bedroom",
        state: "off",
        attributes: {
          friendly_name: "Bedroom",
          current_temperature: 68,
          temperature_unit: "F",
          fan_mode: "auto",
        },
        last_updated: "",
      },
      {
        entity_id: "climate.a_living_room",
        state: "cool",
        attributes: {
          friendly_name: "Living Room",
          current_temperature: 72,
          temperature_unit: "F",
          fan_mode: "auto",
        },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result?.entityId).toBe("climate.a_living_room");
  });

  it("fanOn true when fan_mode is on", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.living_room",
        state: "off",
        attributes: { current_temperature: 72, temperature_unit: "F", fan_mode: "on" },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result?.fanOn).toBe(true);
  });

  it("fanOn false when fan_mode is auto", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.living_room",
        state: "cool",
        attributes: { current_temperature: 72, temperature_unit: "F", fan_mode: "auto" },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result?.fanOn).toBe(false);
  });

  it("fanOn false when fan_mode is missing", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.living_room",
        state: "cool",
        attributes: { current_temperature: 72, temperature_unit: "F" },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result?.fanOn).toBe(false);
  });

  it("handles missing current_temperature", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.living_room",
        state: "off",
        attributes: { temperature_unit: "F" },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result?.currentTemp).toBeNull();
  });

  it("detects Celsius unit", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "climate.living_room",
        state: "cool",
        attributes: { current_temperature: 22, temperature_unit: "\u00b0C" },
        last_updated: "",
      },
    ]);

    const result = await getClimateState();
    expect(result?.tempUnit).toBe("C");
  });
});

const mockCallService = vi.mocked(ha.callService);

describe("turnFanOn()", () => {
  it("calls climate.set_fan_mode with fan_mode on", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOn("climate.living_room");
    expect(mockCallService).toHaveBeenCalledWith("climate", "set_fan_mode", {
      entity_id: "climate.living_room",
      fan_mode: "on",
    });
  });
});

describe("turnFanOff()", () => {
  it("calls climate.set_fan_mode with fan_mode auto", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOff("climate.living_room");
    expect(mockCallService).toHaveBeenCalledWith("climate", "set_fan_mode", {
      entity_id: "climate.living_room",
      fan_mode: "auto",
    });
  });
});
