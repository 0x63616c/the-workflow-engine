import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeAssistantIntegration, ha } from "../../integrations/homeassistant";
import { HaError } from "../../integrations/homeassistant/types";

const MOCK_URL = "http://ha.local:8123";
const MOCK_TOKEN = "test-token-abc";

vi.mock("../../env", () => ({
  env: {
    HA_URL: "http://ha.local:8123",
    HA_TOKEN: "test-token-abc",
  },
}));

describe("HomeAssistantIntegration", () => {
  let client: HomeAssistantIntegration;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    client = new HomeAssistantIntegration();
    await client.init();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("init()", () => {
    it("sets integration id to 'homeassistant'", () => {
      expect(client.id).toBe("homeassistant");
    });

    it("sets integration name", () => {
      expect(client.name).toBe("Home Assistant");
    });
  });

  describe("getState()", () => {
    it("returns connected true after init", async () => {
      const state = await client.getState();
      expect(state).toEqual({ connected: true });
    });
  });

  describe("getEntities(domain)", () => {
    it("returns only entities matching the domain", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            entity_id: "light.living_room",
            state: "on",
            attributes: {},
            last_updated: "2026-01-01T00:00:00Z",
          },
          {
            entity_id: "light.bedroom",
            state: "off",
            attributes: {},
            last_updated: "2026-01-01T00:00:00Z",
          },
          {
            entity_id: "media_player.sonos",
            state: "playing",
            attributes: {},
            last_updated: "2026-01-01T00:00:00Z",
          },
        ],
      });

      const lights = await client.getEntities("light");
      expect(lights).toHaveLength(2);
      expect(lights[0].entity_id).toBe("light.living_room");
      expect(lights[1].entity_id).toBe("light.bedroom");
    });

    it("calls GET /api/states with Authorization header", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

      await client.getEntities("light");

      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_URL}/api/states`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        }),
      );
    });

    it("throws HaError on non-2xx response", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "Unauthorized" });

      await expect(client.getEntities("light")).rejects.toThrow(HaError);
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "Unauthorized" });
      await expect(client.getEntities("light")).rejects.toMatchObject({ status: 401 });
    });

    it("throws HaError when fetch throws (network error)", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getEntities("light")).rejects.toThrow(HaError);
    });
  });

  describe("getEntity(entityId)", () => {
    it("calls GET /api/states/<entity_id>", async () => {
      const mockEntity = {
        entity_id: "light.living_room",
        state: "on",
        attributes: {},
        last_updated: "",
      };
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => mockEntity });

      const result = await client.getEntity("light.living_room");
      expect(result.entity_id).toBe("light.living_room");
      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_URL}/api/states/light.living_room`,
        expect.anything(),
      );
    });
  });

  describe("callService(domain, service, params)", () => {
    it("calls POST /api/services/<domain>/<service> with JSON body", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

      await client.callService("light", "turn_on", { entity_id: "all" });

      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_URL}/api/services/light/turn_on`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ entity_id: "all" }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("throws HaError on non-2xx response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => "Service Unavailable",
      });

      await expect(client.callService("light", "turn_on", {})).rejects.toThrow(HaError);
    });
  });
});

describe("ha singleton", () => {
  it("is an instance of HomeAssistantIntegration", () => {
    expect(ha).toBeInstanceOf(HomeAssistantIntegration);
  });
});

describe("HomeAssistantIntegration init guard", () => {
  it("throws if getEntities called before init", async () => {
    const client = new HomeAssistantIntegration();
    await expect(client.getEntities("light")).rejects.toThrow(
      "HomeAssistantIntegration: init() must be called before use",
    );
  });

  it("throws if getEntity called before init", async () => {
    const client = new HomeAssistantIntegration();
    await expect(client.getEntity("light.test")).rejects.toThrow(
      "HomeAssistantIntegration: init() must be called before use",
    );
  });

  it("throws if callService called before init", async () => {
    const client = new HomeAssistantIntegration();
    await expect(client.callService("light", "turn_on", {})).rejects.toThrow(
      "HomeAssistantIntegration: init() must be called before use",
    );
  });

  it("does not throw after init is called", async () => {
    const client = new HomeAssistantIntegration();
    await client.init();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    await expect(client.getEntities("light")).resolves.toEqual([]);
    vi.unstubAllGlobals();
  });
});
