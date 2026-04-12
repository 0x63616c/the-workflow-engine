export function setup() {
  process.env.HA_TOKEN = process.env.HA_TOKEN ?? "test-token";
  process.env.HA_URL = process.env.HA_URL ?? "http://homeassistant.local:8123";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    "postgresql://workflow:workflow@localhost:5432/workflow_engine_test";
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
}
