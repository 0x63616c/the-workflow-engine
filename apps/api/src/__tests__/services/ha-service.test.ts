import { beforeEach, describe, expect, it, vi } from "vitest";
import { ha } from "../../integrations/homeassistant";
import {
  getLightsState,
  getMediaPlayers,
  mediaPlayerCommand,
  setVolume,
  turnAllLightsOff,
  turnAllLightsOn,
} from "../../services/ha-service";

vi.mock("../../integrations/homeassistant", () => ({
  ha: {
    getEntities: vi.fn(),
    getEntity: vi.fn(),
    callService: vi.fn(),
    init: vi.fn(),
  },
}));

const mockGetEntities = vi.mocked(ha.getEntities);
const mockGetEntity = vi.mocked(ha.getEntity);
const mockCallService = vi.mocked(ha.callService);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLightsState()", () => {
  it("counts on and total entities", async () => {
    mockGetEntities.mockResolvedValueOnce([
      { entity_id: "light.a", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.b", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.c", state: "off", attributes: {}, last_updated: "" },
      { entity_id: "light.d", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.e", state: "off", attributes: {}, last_updated: "" },
    ]);

    const result = await getLightsState();
    expect(result).toEqual({ onCount: 3, totalCount: 5 });
  });

  it("returns zero counts when no lights", async () => {
    mockGetEntities.mockResolvedValueOnce([]);
    const result = await getLightsState();
    expect(result).toEqual({ onCount: 0, totalCount: 0 });
  });

  it("excludes unavailable entities from both onCount and totalCount", async () => {
    mockGetEntities.mockResolvedValueOnce([
      { entity_id: "light.a", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.b", state: "on", attributes: {}, last_updated: "" },
      { entity_id: "light.c", state: "off", attributes: {}, last_updated: "" },
      { entity_id: "light.d", state: "unavailable", attributes: {}, last_updated: "" },
      { entity_id: "light.e", state: "unavailable", attributes: {}, last_updated: "" },
    ]);

    const result = await getLightsState();
    expect(result).toEqual({ onCount: 2, totalCount: 3 });
  });
});

describe("turnAllLightsOn()", () => {
  it("calls callService with light, turn_on, entity_id all", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnAllLightsOn();
    expect(mockCallService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "all" });
  });
});

describe("turnAllLightsOff()", () => {
  it("calls callService with light, turn_off, entity_id all", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await turnAllLightsOff();
    expect(mockCallService).toHaveBeenCalledWith("light", "turn_off", { entity_id: "all" });
  });
});

describe("getMediaPlayers()", () => {
  it("maps HA entity attributes to MediaPlayer shape", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "media_player.living_room",
        state: "playing",
        attributes: {
          friendly_name: "Living Room",
          media_title: "Song A",
          media_artist: "Artist A",
          media_album_name: "Album A",
          entity_picture: "/api/media_player_proxy/abc",
          volume_level: 0.6,
          shuffle: true,
          repeat: "off",
          media_position: 30,
          media_duration: 180,
          media_position_updated_at: "2026-01-01T00:00:30Z",
        },
        last_updated: "",
      },
    ]);

    const players = await getMediaPlayers();
    expect(players).toHaveLength(1);
    const p = players[0];
    expect(p.entityId).toBe("media_player.living_room");
    expect(p.friendlyName).toBe("Living Room");
    expect(p.state).toBe("playing");
    expect(p.attributes.volume).toBe(60);
    expect(p.attributes.shuffle).toBe(true);
    expect(p.attributes.repeat).toBe("off");
    expect(p.attributes.mediaTitle).toBe("Song A");
    expect(p.attributes.mediaArtist).toBe("Artist A");
    expect(p.attributes.mediaPosition).toBe(30);
    expect(p.attributes.mediaDuration).toBe(180);
    expect(p.attributes.albumArtUrl).toContain("/api/media_player_proxy/abc");
  });

  it("handles missing optional attributes gracefully", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "media_player.bedroom",
        state: "off",
        attributes: { friendly_name: "Bedroom", volume_level: 0.3 },
        last_updated: "",
      },
    ]);

    const players = await getMediaPlayers();
    const p = players[0];
    expect(p.attributes.mediaTitle).toBeUndefined();
    expect(p.attributes.albumArtUrl).toBeUndefined();
    expect(p.attributes.volume).toBe(30);
  });

  it("sorts players alphabetically by friendlyName", async () => {
    mockGetEntities.mockResolvedValueOnce([
      {
        entity_id: "media_player.z",
        state: "off",
        attributes: { friendly_name: "Zebra", volume_level: 0 },
        last_updated: "",
      },
      {
        entity_id: "media_player.a",
        state: "off",
        attributes: { friendly_name: "Apple", volume_level: 0 },
        last_updated: "",
      },
    ]);

    const players = await getMediaPlayers();
    expect(players[0].friendlyName).toBe("Apple");
    expect(players[1].friendlyName).toBe("Zebra");
  });
});

describe("mediaPlayerCommand()", () => {
  it("maps 'play' to media_player.media_play", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "play");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_play", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'pause' to media_player.media_pause", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "pause");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_pause", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'next' to media_player.media_next_track", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "next");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_next_track", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'previous' to media_player.media_previous_track", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await mediaPlayerCommand("media_player.living_room", "previous");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "media_previous_track", {
      entity_id: "media_player.living_room",
    });
  });

  it("maps 'shuffle' to media_player.shuffle_set and toggles current value", async () => {
    mockGetEntity.mockResolvedValueOnce({
      entity_id: "media_player.living_room",
      state: "playing",
      attributes: { shuffle: false },
      last_updated: "",
    });
    mockCallService.mockResolvedValueOnce(undefined);

    await mediaPlayerCommand("media_player.living_room", "shuffle");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "shuffle_set", {
      entity_id: "media_player.living_room",
      shuffle: true,
    });
  });

  it("maps 'repeat' to media_player.repeat_set and cycles off->one->all->off", async () => {
    mockGetEntity.mockResolvedValueOnce({
      entity_id: "media_player.living_room",
      state: "playing",
      attributes: { repeat: "off" },
      last_updated: "",
    });
    mockCallService.mockResolvedValueOnce(undefined);

    await mediaPlayerCommand("media_player.living_room", "repeat");
    expect(mockCallService).toHaveBeenCalledWith("media_player", "repeat_set", {
      entity_id: "media_player.living_room",
      repeat: "one",
    });
  });
});

describe("setVolume()", () => {
  it("scales integer 0-100 to float 0.0-1.0", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await setVolume("media_player.living_room", 60);
    expect(mockCallService).toHaveBeenCalledWith("media_player", "volume_set", {
      entity_id: "media_player.living_room",
      volume_level: 0.6,
    });
  });

  it("handles volume 0", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await setVolume("media_player.living_room", 0);
    expect(mockCallService).toHaveBeenCalledWith("media_player", "volume_set", {
      entity_id: "media_player.living_room",
      volume_level: 0,
    });
  });

  it("handles volume 100", async () => {
    mockCallService.mockResolvedValueOnce(undefined);
    await setVolume("media_player.living_room", 100);
    expect(mockCallService).toHaveBeenCalledWith("media_player", "volume_set", {
      entity_id: "media_player.living_room",
      volume_level: 1,
    });
  });
});
