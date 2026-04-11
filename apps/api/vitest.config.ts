import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "bun:sqlite": new URL("./src/__mocks__/bun-sqlite.ts", import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
