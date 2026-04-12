// Set required env vars for tests before any module is loaded
process.env.HA_TOKEN = process.env.HA_TOKEN ?? "test-token";
process.env.HA_URL = process.env.HA_URL ?? "http://homeassistant.local:8123";
