import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4201),
  PORT_OFFSET: z.coerce.number().int().min(0).max(99).default(0),
  DATABASE_URL: z.string().url().default("postgresql://evee:evee@localhost:5432/evee"),
  BUILD_HASH: z.string().default("dev"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  HA_URL: z.string().url().default("http://homeassistant.local:8123"),
  HA_TOKEN: z.string().min(1),
  SLACK_BOT_TOKEN: z.string().min(1).startsWith("xoxb-"),
  SLACK_APP_TOKEN: z.string().min(1).startsWith("xapp-"),
  OPENROUTER_API_KEY: z.string().min(1),
  ALLOY_URL: z.string().default("http://evee-alloy:12346"),
});

export const env = envSchema.parse(process.env);
export const EFFECTIVE_PORT = env.PORT + env.PORT_OFFSET;
