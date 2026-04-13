// Set required env vars for tests before any module is loaded
process.env.HA_TOKEN = process.env.HA_TOKEN ?? "test-token";
process.env.HA_URL = process.env.HA_URL ?? "http://homeassistant.local:8123";
process.env.SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? "xoxb-test-token";
process.env.SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN ?? "xapp-test-token";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "test-openrouter-key";
