import { describe, expect, it } from "vitest";

const SLACK_DEFAULTS = {
  SLACK_BOT_TOKEN: "xoxb-test-token",
  SLACK_APP_TOKEN: "xapp-test-token",
  OPENROUTER_API_KEY: "test-openrouter-key",
};

describe("env schema", () => {
  it("parses HA_URL with valid URL", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      HA_URL: "http://homeassistant.local:8123",
      HA_TOKEN: "abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.HA_URL).toBe("http://homeassistant.local:8123");
    }
  });

  it("uses default HA_URL when not set", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      HA_URL: undefined,
      HA_TOKEN: "abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.HA_URL).toBe("http://homeassistant.local:8123");
    }
  });

  it("fails when HA_TOKEN is missing", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      HA_URL: "http://homeassistant.local:8123",
      HA_TOKEN: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("fails when HA_TOKEN is empty string", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      HA_URL: "http://homeassistant.local:8123",
      HA_TOKEN: "",
    });
    expect(result.success).toBe(false);
  });

  it("fails in production when INNGEST_EVENT_KEY is the dev default", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      NODE_ENV: "production",
      HA_TOKEN: "real-token",
      INNGEST_EVENT_KEY: "local-dev-event-key-00000000",
      INNGEST_SIGNING_KEY: "real-signing-key-1234567890",
    });
    expect(result.success).toBe(false);
  });

  it("fails in production when INNGEST_SIGNING_KEY is the dev default", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      NODE_ENV: "production",
      HA_TOKEN: "real-token",
      INNGEST_EVENT_KEY: "real-event-key-1234567890",
      INNGEST_SIGNING_KEY: "signing-key-0000000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("succeeds in production with real Inngest keys", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      NODE_ENV: "production",
      HA_TOKEN: "real-token",
      INNGEST_EVENT_KEY: "real-event-key-1234567890",
      INNGEST_SIGNING_KEY: "real-signing-key-1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("dev defaults are allowed in development", async () => {
    const { envSchema } = await import("../env");
    const result = envSchema.safeParse({
      ...process.env,
      ...SLACK_DEFAULTS,
      NODE_ENV: "development",
      HA_TOKEN: "any-token",
    });
    expect(result.success).toBe(true);
  });
});
