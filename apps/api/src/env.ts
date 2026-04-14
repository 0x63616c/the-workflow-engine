import { z } from "zod";

const INNGEST_DEV_EVENT_KEY = "local-dev-event-key-00000000";
const INNGEST_DEV_SIGNING_KEY = "signing-key-0000000000000000";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().default(4201),
    PORT_OFFSET: z.coerce.number().int().min(0).max(99).default(0),
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://workflow:workflow@localhost:5432/workflow_engine"),
    BUILD_HASH: z.string().default("dev"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
    INNGEST_EVENT_KEY: z.string().default(INNGEST_DEV_EVENT_KEY),
    INNGEST_SIGNING_KEY: z.string().default(INNGEST_DEV_SIGNING_KEY),
    INNGEST_DEV: z.coerce.number().int().default(1),
    HA_URL: z.string().url().default("http://homeassistant.local:8123"),
    HA_TOKEN: z.string().min(1),
    SLACK_BOT_TOKEN: z.string().min(1).startsWith("xoxb-"),
    SLACK_APP_TOKEN: z.string().min(1).startsWith("xapp-"),
    OPENROUTER_API_KEY: z.string().min(1),
    ALLOY_URL: z.string().default("http://workflow-engine-alloy:12346"),
  })
  .refine(
    (data) => data.NODE_ENV !== "production" || data.INNGEST_EVENT_KEY !== INNGEST_DEV_EVENT_KEY,
    { message: "INNGEST_EVENT_KEY must be set in production", path: ["INNGEST_EVENT_KEY"] },
  )
  .refine(
    (data) =>
      data.NODE_ENV !== "production" || data.INNGEST_SIGNING_KEY !== INNGEST_DEV_SIGNING_KEY,
    { message: "INNGEST_SIGNING_KEY must be set in production", path: ["INNGEST_SIGNING_KEY"] },
  );

export const env = envSchema.parse(process.env);
export const EFFECTIVE_PORT = env.PORT + env.PORT_OFFSET;
