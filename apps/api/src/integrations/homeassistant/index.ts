import { env } from "../../env";
import type { Integration } from "../types";
import { type HaEntity, HaError } from "./types";

export class HomeAssistantIntegration implements Integration {
  id = "homeassistant";
  name = "Home Assistant";

  private baseUrl = "";
  private token = "";
  private initialized = false;

  async init(): Promise<void> {
    this.baseUrl = env.HA_URL;
    this.token = env.HA_TOKEN;
    this.initialized = true;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("HomeAssistantIntegration: init() must be called before use");
    }
  }

  async getState(): Promise<Record<string, unknown>> {
    return { connected: true };
  }

  async execute(_command: string, _params: Record<string, unknown>): Promise<unknown> {
    return null;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          ...this.authHeaders(),
          ...(init?.headers ?? {}),
        },
      });
    } catch (err) {
      throw new HaError(0, `Network error: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new HaError(res.status, text);
    }
    return res.json() as Promise<T>;
  }

  async getEntities(domain: string): Promise<HaEntity[]> {
    this.assertInitialized();
    const all = await this.request<HaEntity[]>(`${this.baseUrl}/api/states`);
    return all.filter((e) => e.entity_id.startsWith(`${domain}.`));
  }

  async getEntity(entityId: string): Promise<HaEntity> {
    this.assertInitialized();
    return this.request<HaEntity>(`${this.baseUrl}/api/states/${entityId}`);
  }

  async callService(
    domain: string,
    service: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    this.assertInitialized();
    await this.request(`${this.baseUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export const ha = new HomeAssistantIntegration();
// Eagerly initialize the singleton so env vars are read at startup.
// Tests that need a clean instance should construct HomeAssistantIntegration directly.
ha.init();
