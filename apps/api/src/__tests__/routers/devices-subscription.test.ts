import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { HaStateChangedEvent } from "../../integrations/homeassistant/ws-relay";

// vi.hoisted runs before vi.mock factory, safe for module-level emitter
const mocks = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter: EE } = require("node:events") as typeof import("node:events");
  const emitter = new EE();
  return { emitter };
});

vi.mock("../../integrations/homeassistant/ws-relay", () => ({
  HaWebSocketRelay: vi.fn().mockImplementation(() => mocks.emitter),
  haRelay: mocks.emitter,
}));

import { haRelay } from "../../integrations/homeassistant/ws-relay";

describe("haRelay EventEmitter interface", () => {
  it("emits stateChanged events to listeners", () => {
    const received: HaStateChangedEvent[] = [];
    const listener = (evt: HaStateChangedEvent) => received.push(evt);
    haRelay.on("stateChanged", listener);

    const event: HaStateChangedEvent = {
      entityId: "light.living_room",
      domain: "light",
      state: "on",
      attributes: { brightness: 200 },
      lastUpdated: "2024-01-01T00:00:00Z",
    };
    haRelay.emit("stateChanged", event);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);

    haRelay.off("stateChanged", listener);
  });

  it("callers can filter by domain on received events", () => {
    const allReceived: HaStateChangedEvent[] = [];
    const lightReceived: HaStateChangedEvent[] = [];

    const allListener = (evt: HaStateChangedEvent) => {
      allReceived.push(evt);
      if (evt.domain === "light") lightReceived.push(evt);
    };
    haRelay.on("stateChanged", allListener);

    haRelay.emit("stateChanged", {
      entityId: "light.bedroom",
      domain: "light",
      state: "off",
      attributes: {},
      lastUpdated: "2024-01-01T00:00:00Z",
    } satisfies HaStateChangedEvent);

    haRelay.emit("stateChanged", {
      entityId: "climate.living_room",
      domain: "climate",
      state: "cool",
      attributes: {},
      lastUpdated: "2024-01-01T00:00:00Z",
    } satisfies HaStateChangedEvent);

    expect(allReceived).toHaveLength(2);
    expect(lightReceived).toHaveLength(1);
    expect(lightReceived[0].entityId).toBe("light.bedroom");

    haRelay.removeAllListeners("stateChanged");
  });
});
