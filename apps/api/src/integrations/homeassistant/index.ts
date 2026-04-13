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
    if (!this.initialized) {
      throw new HaError(0, "HomeAssistant integration not initialized — call init() first");
    }
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
    const all = await this.request<HaEntity[]>(`${this.baseUrl}/api/states`);
    return all.filter((e) => e.entity_id.startsWith(`${domain}.`));
  }

  async getEntity(entityId: string): Promise<HaEntity> {
    return this.request<HaEntity>(`${this.baseUrl}/api/states/${entityId}`);
  }

  async callService(
    domain: string,
    service: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`${this.baseUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export const ha = new HomeAssistantIntegration();
