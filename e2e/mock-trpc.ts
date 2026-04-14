/**
 * Mock tRPC responses for Playwright screenshot tests.
 *
 * The Vite dev server proxies /trpc to the API. Since we don't run the API
 * during screenshot tests, we intercept these requests at the Playwright
 * route level and return realistic mock data so the dashboard renders fully.
 */
import type { Page } from "@playwright/test";

const MOCK_DATA: Record<string, unknown> = {
  "health.ping": { status: "ok", timestamp: Date.now() },
  "health.buildHash": { hash: "abc1234", deployedAt: new Date().toISOString() },

  "countdownEvents.listUpcoming": [
    { id: 1, title: "Zero's Birthday", date: "2026-06-15" },
    { id: 2, title: "Apartment Renewal", date: "2026-09-01" },
  ],
  "countdownEvents.listPast": [{ id: 3, title: "Launch Day", date: "2026-01-10" }],

  "devices.lights": { onCount: 3, totalCount: 7 },

  "devices.mediaPlayers": [
    {
      entityId: "media_player.living_room",
      friendlyName: "Living Room",
      state: "playing",
      attributes: {
        mediaTitle: "Midnight City",
        mediaArtist: "M83",
        mediaAlbumName: "Hurry Up, We're Dreaming",
        volume: 42,
        shuffle: false,
        repeat: "off",
        mediaDuration: 243,
        mediaPosition: 87,
      },
    },
  ],

  "devices.climate": {
    entityId: "climate.living_room",
    friendlyName: "Living Room",
    currentTemp: 72,
    tempUnit: "F",
    hvacMode: "cool",
    hvacAction: "cooling",
    fanOn: false,
    targetTemp: 70,
  },

  "weather.current": {
    temperature: 78,
    condition: "Partly Cloudy",
    conditionCode: "partly-cloudy",
    highTemp: 84,
    lowTemp: 65,
    uvIndex: 6,
  },

  "stocks.quotes": {
    stocks: [
      { symbol: "AAPL", name: "Apple Inc.", price: 198.52, change: 2.34, changePercent: 1.19 },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: 174.21, change: -0.87, changePercent: -0.5 },
      { symbol: "MSFT", name: "Microsoft Corp.", price: 428.15, change: 5.12, changePercent: 1.21 },
      { symbol: "AMZN", name: "Amazon.com", price: 185.67, change: -1.23, changePercent: -0.66 },
    ],
    crypto: [
      { symbol: "BTC", name: "Bitcoin", price: 68425.0, change: 1250.0, changePercent: 1.86 },
      { symbol: "ETH", name: "Ethereum", price: 3842.5, change: -45.3, changePercent: -1.16 },
    ],
  },

  "appConfig.getAll": [],
};

/**
 * Intercept tRPC batch requests and return mock data.
 *
 * tRPC HTTP batch sends: GET /trpc/proc1,proc2?batch=1&input={...}
 * Response: [{result:{data:...}}, {result:{data:...}}]
 */
export async function mockTrpcRoutes(page: Page): Promise<void> {
  await page.route("**/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^\/trpc\//, "");
    const procedures = pathname.split(",");

    const results = procedures.map((proc) => {
      const data = MOCK_DATA[proc];
      if (data !== undefined) {
        return { result: { data } };
      }
      // Return null for unknown procedures (subscriptions, mutations)
      return { result: { data: null } };
    });

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(results),
    });
  });
}
