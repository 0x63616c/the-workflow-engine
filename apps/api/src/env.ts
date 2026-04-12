import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4201),
  PORT_OFFSET: z.coerce.number().int().min(0).max(99).default(0),
  DATABASE_URL: z.string().default("./data.db"),
  BUILD_HASH: z.string().default("dev"),
  INNGEST_EVENT_KEY: z.string().default("local-dev-event-key-00000000"),
  INNGEST_SIGNING_KEY: z.string().default("signing-key-0000000000000000"),
  INNGEST_DEV: z.coerce.number().int().default(1),
  HA_URL: z.string().url().default("http://homeassistant.local:8123"),
  HA_TOKEN: z.string().min(1),
});

export const env = envSchema.parse(process.env);
export const EFFECTIVE_PORT = env.PORT + env.PORT_OFFSET;
