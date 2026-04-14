import { type Page, expect } from "@playwright/test";

const DEFAULT_MOCK_DATA: Record<string, unknown> = {
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
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        price: 174.21,
        change: -0.87,
        changePercent: -0.5,
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        price: 428.15,
        change: 5.12,
        changePercent: 1.21,
      },
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
 * Set up tRPC route mocking with optional overrides per procedure.
 * Pass partial overrides to change specific mock responses.
 */
export async function mockTrpcRoutes(
  page: Page,
  overrides?: Record<string, unknown>,
): Promise<void> {
  const data = { ...DEFAULT_MOCK_DATA, ...overrides };

  await page.route("**/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^\/trpc\//, "");
    const procedures = pathname.split(",");

    const results = procedures.map((proc) => {
      const value = data[proc];
      if (value !== undefined) {
        return { result: { data: value } };
      }
      return { result: { data: null } };
    });

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(results),
    });
  });
}

/**
 * Mock routes, navigate to home, wait for the dashboard to render.
 * Returns after networkidle + grid is visible.
 */
export async function setupDashboard(
  page: Page,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await mockTrpcRoutes(page, overrides);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("widget-grid")).toBeVisible();
}

/**
 * Click a card and wait for the overlay to appear.
 */
export async function expandCard(page: Page, cardId: string): Promise<void> {
  await page.getByTestId(`widget-card-${cardId}`).click();
  await expect(page.getByTestId("card-overlay")).toBeVisible();
  await expect(page.getByTestId("card-overlay-content")).toBeVisible();
}

/**
 * Dismiss the overlay via backdrop click and wait for it to disappear.
 * For clock overlay (no backdrop), clicks the content area instead.
 */
export async function dismissOverlay(page: Page): Promise<void> {
  const backdrop = page.getByTestId("card-overlay-backdrop");
  if (await backdrop.isVisible()) {
    await backdrop.click({ position: { x: 10, y: 10 } });
  } else {
    await page.getByTestId("card-overlay-content").click();
  }
  await expect(page.getByTestId("card-overlay")).not.toBeVisible();
}

/**
 * Get text content from the overlay content area.
 */
export async function overlayText(page: Page): Promise<string> {
  return (await page.getByTestId("card-overlay-content").textContent()) ?? "";
}
