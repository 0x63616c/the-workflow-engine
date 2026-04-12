import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HaStateChangedEvent } from "../../integrations/homeassistant/ws-relay";
import { HaWebSocketRelay } from "../../integrations/homeassistant/ws-relay";

// Minimal mock WebSocket that simulates the HA server-side protocol
// Supports both addEventListener (browser-style) and on (Node-style)
class MockWebSocket extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  sentMessages: string[] = [];

  constructor(url: string) {
    super();
    this.url = url;
  }

  // Alias addEventListener/removeEventListener to on/off for compatibility
  addEventListener(event: string, listener: (...args: unknown[]) => void) {
    this.on(event, listener);
  }

  removeEventListener(event: string, listener: (...args: unknown[]) => void) {
    this.off(event, listener);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close", { code: 1000, reason: "" });
  }

  // Helpers to simulate server messages
  simulateMessage(data: object) {
    this.emit("message", { data: JSON.stringify(data) });
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.emit("open");
  }

  simulateError(err: Error) {
    this.emit("error", err);
  }
}

// Track which MockWebSocket instance was created so tests can drive it
let createdSocket: MockWebSocket | null = null;

const MockWebSocketConstructor = Object.assign(
  vi.fn().mockImplementation((url: string) => {
    createdSocket = new MockWebSocket(url);
    return createdSocket;
  }),
  {
    CONNECTING: MockWebSocket.CONNECTING,
    OPEN: MockWebSocket.OPEN,
    CLOSING: MockWebSocket.CLOSING,
    CLOSED: MockWebSocket.CLOSED,
  },
);

vi.stubGlobal("WebSocket", MockWebSocketConstructor);

function makeRelay(opts?: { haUrl?: string; haToken?: string }) {
  return new HaWebSocketRelay({
    haUrl: opts?.haUrl ?? "http://homeassistant.local:8123",
    haToken: opts?.haToken ?? "test-token",
  });
}

async function connectAndAuth(relay: HaWebSocketRelay) {
  relay.connect();
  await vi.waitFor(() => createdSocket !== null);
  if (!createdSocket) throw new Error("No WebSocket created");
  const ws = createdSocket;

  ws.simulateOpen();
  ws.simulateMessage({ type: "auth_required", ha_version: "2024.1.0" });

  // Relay sends auth message
  await vi.waitFor(() => ws.sentMessages.length >= 1);
  expect(JSON.parse(ws.sentMessages[0])).toMatchObject({
    type: "auth",
    access_token: "test-token",
  });

  // Server confirms auth ok
  ws.simulateMessage({ type: "auth_ok", ha_version: "2024.1.0" });

  // Relay subscribes to events
  await vi.waitFor(() => ws.sentMessages.length >= 2);
  const subMsg = JSON.parse(ws.sentMessages[1]);
  expect(subMsg).toMatchObject({
    type: "subscribe_events",
    event_type: "state_changed",
  });

  // Server confirms subscription
  ws.simulateMessage({ type: "result", id: subMsg.id, success: true, result: null });

  return ws;
}

describe("HaWebSocketRelay", () => {
  beforeEach(() => {
    createdSocket = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    createdSocket = null;
  });

  describe("connection and authentication", () => {
    it("converts http HA_URL to ws URL", async () => {
      const relay = makeRelay({ haUrl: "http://homeassistant.local:8123" });
      relay.connect();
      await vi.waitFor(() => createdSocket !== null);
      expect(createdSocket?.url).toBe("ws://homeassistant.local:8123/api/websocket");
    });

    it("converts https HA_URL to wss URL", async () => {
      const relay = makeRelay({ haUrl: "https://ha.example.com" });
      relay.connect();
      await vi.waitFor(() => createdSocket !== null);
      expect(createdSocket?.url).toBe("wss://ha.example.com/api/websocket");
    });

    it("sends auth message on auth_required", async () => {
      const relay = makeRelay();
      relay.connect();
      await vi.waitFor(() => createdSocket !== null);
      if (!createdSocket) throw new Error("No WebSocket created");
      const ws = createdSocket;
      ws.simulateOpen();
      ws.simulateMessage({ type: "auth_required" });
      await vi.waitFor(() => ws.sentMessages.length >= 1);
      expect(JSON.parse(ws.sentMessages[0])).toEqual({
        type: "auth",
        access_token: "test-token",
      });
    });

    it("subscribes to state_changed after auth_ok", async () => {
      const relay = makeRelay();
      relay.connect();
      await vi.waitFor(() => createdSocket !== null);
      if (!createdSocket) throw new Error("No WebSocket created");
      const ws = createdSocket;
      ws.simulateOpen();
      ws.simulateMessage({ type: "auth_required" });
      await vi.waitFor(() => ws.sentMessages.length >= 1);
      ws.simulateMessage({ type: "auth_ok" });
      await vi.waitFor(() => ws.sentMessages.length >= 2);
      const subMsg = JSON.parse(ws.sentMessages[1]);
      expect(subMsg.type).toBe("subscribe_events");
      expect(subMsg.event_type).toBe("state_changed");
      expect(typeof subMsg.id).toBe("number");
    });
  });

  describe("event filtering and emission", () => {
    it("emits stateChanged for light domain events", async () => {
      const relay = makeRelay();
      const ws = await connectAndAuth(relay);

      const received: HaStateChangedEvent[] = [];
      relay.on("stateChanged", (evt: HaStateChangedEvent) => received.push(evt));

      ws.simulateMessage({
        type: "event",
        event: {
          event_type: "state_changed",
          data: {
            entity_id: "light.living_room",
            new_state: {
              entity_id: "light.living_room",
              state: "on",
              attributes: { brightness: 255 },
              last_updated: "2024-01-01T00:00:00Z",
            },
          },
        },
      });

      await vi.waitFor(() => received.length > 0);
      expect(received[0].entityId).toBe("light.living_room");
      expect(received[0].domain).toBe("light");
      expect(received[0].state).toBe("on");
      expect(received[0].attributes).toEqual({ brightness: 255 });
    });

    it("emits stateChanged for climate domain events", async () => {
      const relay = makeRelay();
      const ws = await connectAndAuth(relay);

      const received: HaStateChangedEvent[] = [];
      relay.on("stateChanged", (evt: HaStateChangedEvent) => received.push(evt));

      ws.simulateMessage({
        type: "event",
        event: {
          event_type: "state_changed",
          data: {
            entity_id: "climate.living_room",
            new_state: {
              entity_id: "climate.living_room",
              state: "cool",
              attributes: { current_temperature: 72 },
              last_updated: "2024-01-01T00:00:00Z",
            },
          },
        },
      });

      await vi.waitFor(() => received.length > 0);
      expect(received[0].domain).toBe("climate");
    });

    it("emits stateChanged for media_player domain events", async () => {
      const relay = makeRelay();
      const ws = await connectAndAuth(relay);

      const received: HaStateChangedEvent[] = [];
      relay.on("stateChanged", (evt: HaStateChangedEvent) => received.push(evt));

      ws.simulateMessage({
        type: "event",
        event: {
          event_type: "state_changed",
          data: {
            entity_id: "media_player.sonos",
            new_state: {
              entity_id: "media_player.sonos",
              state: "playing",
              attributes: {},
              last_updated: "2024-01-01T00:00:00Z",
            },
          },
        },
      });

      await vi.waitFor(() => received.length > 0);
      expect(received[0].domain).toBe("media_player");
    });

    it("filters out events not in allowed domains", async () => {
      const relay = makeRelay();
      const ws = await connectAndAuth(relay);

      const received: HaStateChangedEvent[] = [];
      relay.on("stateChanged", (evt: HaStateChangedEvent) => received.push(evt));

      ws.simulateMessage({
        type: "event",
        event: {
          event_type: "state_changed",
          data: {
            entity_id: "sensor.temperature",
            new_state: {
              entity_id: "sensor.temperature",
              state: "72",
              attributes: {},
              last_updated: "2024-01-01T00:00:00Z",
            },
          },
        },
      });

      // Give a moment to ensure no emission
      await new Promise((r) => setTimeout(r, 20));
      expect(received).toHaveLength(0);
    });

    it("ignores events with null new_state (entity removed)", async () => {
      const relay = makeRelay();
      const ws = await connectAndAuth(relay);

      const received: HaStateChangedEvent[] = [];
      relay.on("stateChanged", (evt: HaStateChangedEvent) => received.push(evt));

      ws.simulateMessage({
        type: "event",
        event: {
          event_type: "state_changed",
          data: {
            entity_id: "light.removed",
            new_state: null,
          },
        },
      });

      await new Promise((r) => setTimeout(r, 20));
      expect(received).toHaveLength(0);
    });
  });

  describe("domain filtering — all allowed domains", () => {
    const allowedDomains = ["light", "climate", "media_player", "fan", "switch"];

    for (const domain of allowedDomains) {
      it(`emits events for domain: ${domain}`, async () => {
        createdSocket = null;
        const relay = makeRelay();
        const ws = await connectAndAuth(relay);

        const received: HaStateChangedEvent[] = [];
        relay.on("stateChanged", (evt: HaStateChangedEvent) => received.push(evt));

        ws.simulateMessage({
          type: "event",
          event: {
            event_type: "state_changed",
            data: {
              entity_id: `${domain}.test_entity`,
              new_state: {
                entity_id: `${domain}.test_entity`,
                state: "on",
                attributes: {},
                last_updated: "2024-01-01T00:00:00Z",
              },
            },
          },
        });

        await vi.waitFor(() => received.length > 0);
        expect(received[0].domain).toBe(domain);
      });
    }
  });

  describe("graceful shutdown", () => {
    it("destroy closes the WebSocket", async () => {
      const relay = makeRelay();
      const ws = await connectAndAuth(relay);

      relay.destroy();
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });
  });
});
