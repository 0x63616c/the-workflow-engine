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
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: {
              friendly_name: "Living Room AC",
              current_temperature: 72,
              temperature_unit: "F",
              hvac_action: "cooling",
            },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result).toEqual({
      entityId: "climate.living_room",
      friendlyName: "Living Room AC",
      currentTemp: 72,
      tempUnit: "F",
      hvacMode: "cool",
      hvacAction: "cooling",
      fanOn: false,
      fanEntityId: null,
    });
  });

  it("returns null when no climate entities", async () => {
    mockGetEntities.mockResolvedValue([]);
    const result = await getClimateState();
    expect(result).toBeNull();
  });

  it("picks first entity alphabetically by entity_id", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.z_bedroom",
            state: "off",
            attributes: {
              friendly_name: "Bedroom",
              current_temperature: 68,
              temperature_unit: "F",
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
            },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.entityId).toBe("climate.a_living_room");
  });

  it("fanOn true when hvac_mode is fan_only", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "fan_only",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanOn).toBe(true);
  });

  it("fanOn true when hvac_action is fan", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F", hvac_action: "fan" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanOn).toBe(true);
  });

  it("fanOn false when cooling", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F", hvac_action: "cooling" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanOn).toBe(false);
  });

  it("handles missing current_temperature", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "off",
            attributes: { temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.currentTemp).toBeNull();
  });

  it("detects Celsius unit", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 22, temperature_unit: "\u00b0C" },
            last_updated: "",
          },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.tempUnit).toBe("C");
  });

  it("sets fanEntityId when exact fan match exists", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      if (domain === "fan") {
        return [{ entity_id: "fan.living_room", state: "off", attributes: {}, last_updated: "" }];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanEntityId).toBe("fan.living_room");
  });

  it("sets fanEntityId null when no fan match", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      if (domain === "fan") {
        return [];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanEntityId).toBeNull();
  });

  it("does not match fan entity with partial name", async () => {
    mockGetEntities.mockImplementation(async (domain: string) => {
      if (domain === "climate") {
        return [
          {
            entity_id: "climate.living_room",
            state: "cool",
            attributes: { current_temperature: 72, temperature_unit: "F" },
            last_updated: "",
          },
        ];
      }
      if (domain === "fan") {
        return [
          { entity_id: "fan.living_room_ceiling", state: "off", attributes: {}, last_updated: "" },
        ];
      }
      return [];
    });

    const result = await getClimateState();
    expect(result?.fanEntityId).toBeNull();
  });
});

const mockCallService = vi.mocked(ha.callService);

describe("turnFanOn()", () => {
  it("uses climate.set_hvac_mode fan_only when fanEntityId null", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOn("climate.living_room", null);
    expect(mockCallService).toHaveBeenCalledWith("climate", "set_hvac_mode", {
      entity_id: "climate.living_room",
      hvac_mode: "fan_only",
    });
  });

  it("uses fan.turn_on when fanEntityId provided", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOn("climate.living_room", "fan.living_room");
    expect(mockCallService).toHaveBeenCalledWith("fan", "turn_on", {
      entity_id: "fan.living_room",
    });
  });
});

describe("turnFanOff()", () => {
  it("uses climate.set_hvac_mode off when fanEntityId null", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOff("climate.living_room", null);
    expect(mockCallService).toHaveBeenCalledWith("climate", "set_hvac_mode", {
      entity_id: "climate.living_room",
      hvac_mode: "off",
    });
  });

  it("uses fan.turn_off when fanEntityId provided", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnFanOff("climate.living_room", "fan.living_room");
    expect(mockCallService).toHaveBeenCalledWith("fan", "turn_off", {
      entity_id: "fan.living_room",
    });
  });
});
