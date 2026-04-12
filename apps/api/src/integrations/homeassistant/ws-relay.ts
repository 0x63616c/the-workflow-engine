import { EventEmitter } from "node:events";

export interface HaStateChangedEvent {
  entityId: string;
  domain: string;
  state: string;
  attributes: Record<string, unknown>;
  lastUpdated: string;
}

interface HaWebSocketRelayOptions {
  haUrl: string;
  haToken: string;
}

const ALLOWED_DOMAINS = new Set(["light", "climate", "media_player", "fan", "switch"]);

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class HaWebSocketRelay extends EventEmitter {
  private readonly haUrl: string;
  private readonly haToken: string;
  private ws: WebSocket | null = null;
  private msgId = 1;
  private destroyed = false;
  private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: HaWebSocketRelayOptions) {
    super();
    this.haUrl = opts.haUrl;
    this.haToken = opts.haToken;
  }

  connect(): void {
    if (this.destroyed) return;

    const wsUrl = this.haUrl
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://")
      .replace(/\/?$/, "/api/websocket");

    this.ws = new WebSocket(wsUrl);
    this.ws.addEventListener("open", this.onOpen);
    this.ws.addEventListener("message", this.onMessage);
    this.ws.addEventListener("error", this.onError);
    this.ws.addEventListener("close", this.onClose);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private readonly onOpen = (): void => {
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  };

  private readonly onMessage = (evt: MessageEvent): void => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(evt.data as string) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = msg.type as string;

    if (type === "auth_required") {
      this.send({ type: "auth", access_token: this.haToken });
      return;
    }

    if (type === "auth_ok") {
      const id = this.msgId++;
      this.send({ type: "subscribe_events", id, event_type: "state_changed" });
      return;
    }

    if (type === "event") {
      this.handleEvent(msg);
      return;
    }
  };

  private handleEvent(msg: Record<string, unknown>): void {
    const event = msg.event as Record<string, unknown> | undefined;
    if (!event) return;

    const data = event.data as Record<string, unknown> | undefined;
    if (!data) return;

    const newState = data.new_state as Record<string, unknown> | null | undefined;
    if (!newState) return;

    const entityId = newState.entity_id as string;
    const domain = entityId.split(".")[0];

    if (!ALLOWED_DOMAINS.has(domain)) return;

    const stateChangedEvent: HaStateChangedEvent = {
      entityId,
      domain,
      state: newState.state as string,
      attributes: (newState.attributes as Record<string, unknown>) ?? {},
      lastUpdated: newState.last_updated as string,
    };

    this.emit("stateChanged", stateChangedEvent);
  }

  private readonly onError = (evt: Event): void => {
    const err = evt as ErrorEvent;
    console.error(`[HaWebSocketRelay] WebSocket error: ${err.message ?? "unknown error"}`);
  };

  private readonly onClose = (): void => {
    if (this.destroyed) return;

    console.warn(`[HaWebSocketRelay] Connection closed. Reconnecting in ${this.reconnectDelay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  };

  private send(data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const haRelay = new HaWebSocketRelay({
  haUrl: process.env.HA_URL ?? "http://homeassistant.local:8123",
  haToken: process.env.HA_TOKEN ?? "",
});
