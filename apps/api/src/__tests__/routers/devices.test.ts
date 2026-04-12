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
}));

const caller = appRouter.createCaller({} as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("devices.lights", () => {
  it("returns LightsState on success", async () => {
    vi.mocked(haService.getLightsState).mockResolvedValueOnce({ onCount: 3, totalCount: 5 });
    const result = await caller.devices.lights();
    expect(result).toEqual({ onCount: 3, totalCount: 5 });
  });

  it("returns error object when HaError thrown", async () => {
    vi.mocked(haService.getLightsState).mockRejectedValueOnce(new HaError(503, "Unavailable"));
    const result = await caller.devices.lights();
    expect(result).toHaveProperty("error");
  });
});

describe("devices.lightsOn", () => {
  it("calls turnAllLightsOn", async () => {
    vi.mocked(haService.turnAllLightsOn).mockResolvedValueOnce(undefined);
    await caller.devices.lightsOn();
    expect(haService.turnAllLightsOn).toHaveBeenCalledOnce();
  });
});

describe("devices.lightsOff", () => {
  it("calls turnAllLightsOff", async () => {
    vi.mocked(haService.turnAllLightsOff).mockResolvedValueOnce(undefined);
    await caller.devices.lightsOff();
    expect(haService.turnAllLightsOff).toHaveBeenCalledOnce();
  });
});

describe("devices.mediaPlayers", () => {
  it("returns array of MediaPlayer on success", async () => {
    const mockPlayers = [
      {
        entityId: "media_player.living_room",
        friendlyName: "Living Room",
        state: "playing" as const,
        attributes: {
          volume: 60,
          shuffle: false,
          repeat: "off" as const,
        },
      },
    ];
    vi.mocked(haService.getMediaPlayers).mockResolvedValueOnce(mockPlayers);
    const result = await caller.devices.mediaPlayers();
    expect(result).toEqual(mockPlayers);
  });

  it("returns error object when HaError thrown", async () => {
    vi.mocked(haService.getMediaPlayers).mockRejectedValueOnce(new HaError(401, "Auth failed"));
    const result = await caller.devices.mediaPlayers();
    expect(result).toHaveProperty("error");
  });
});

describe("devices.mediaPlayerCommand", () => {
  it("calls mediaPlayerCommand with correct args", async () => {
    vi.mocked(haService.mediaPlayerCommand).mockResolvedValueOnce(undefined);
    await caller.devices.mediaPlayerCommand({ entityId: "media_player.lr", command: "play" });
    expect(haService.mediaPlayerCommand).toHaveBeenCalledWith("media_player.lr", "play");
  });

  it("rejects invalid command via Zod", async () => {
    await expect(
      caller.devices.mediaPlayerCommand({ entityId: "x", command: "invalid" as never }),
    ).rejects.toThrow();
  });
});

describe("devices.setVolume", () => {
  it("calls setVolume with correct args", async () => {
    vi.mocked(haService.setVolume).mockResolvedValueOnce(undefined);
    await caller.devices.setVolume({ entityId: "media_player.lr", volumeLevel: 75 });
    expect(haService.setVolume).toHaveBeenCalledWith("media_player.lr", 75);
  });

  it("rejects volume > 100 via Zod", async () => {
    await expect(caller.devices.setVolume({ entityId: "x", volumeLevel: 101 })).rejects.toThrow();
  });

  it("rejects volume < 0 via Zod", async () => {
    await expect(caller.devices.setVolume({ entityId: "x", volumeLevel: -1 })).rejects.toThrow();
  });
});
