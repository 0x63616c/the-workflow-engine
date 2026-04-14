import { defineConfig, devices } from "@playwright/test";

const VITE_PORT = 4210;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/results",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${VITE_PORT}`,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  projects: [
    {
      name: "iPad Pro 12.9",
      use: {
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: `bun run --filter @repo/web dev -- --port ${VITE_PORT}`,
    port: VITE_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
