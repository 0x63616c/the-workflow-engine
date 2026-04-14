import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

test.describe("Dashboard grid renders all cards", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  const EXPECTED_CARDS = [
    "clock",
    "countdown",
    "music",
    "lights",
    "fan",
    "climate",
    "wifi",
    "settings",
    "weather",
    "stocks",
  ];

  for (const cardId of EXPECTED_CARDS) {
    test(`${cardId} card is visible`, async ({ page }) => {
      const card = page.getByTestId(`widget-card-${cardId}`);
      await expect(card).toBeVisible();
    });
  }

  test("grid has correct 6-column layout", async ({ page }) => {
    const grid = page.getByTestId("widget-grid");
    await expect(grid).toBeVisible();

    const style = await grid.getAttribute("style");
    expect(style).toContain("repeat(6, 1fr)");
  });

  test("clock card shows current time", async ({ page }) => {
    const clockCard = page.getByTestId("widget-card-clock");
    const text = await clockCard.textContent();
    // Should contain AM or PM
    expect(text).toMatch(/AM|PM/i);
  });

  test("countdown card shows mock events", async ({ page }) => {
    const countdownCard = page.getByTestId("widget-card-countdown");
    const text = await countdownCard.textContent();
    expect(text).toContain("Zero's Birthday");
    expect(text).toContain("Apartment Renewal");
  });

  test("lights card shows state from mock data", async ({ page }) => {
    const lightsCard = page.getByTestId("widget-card-lights");
    const text = await lightsCard.textContent();
    // 3 of 7 on, majority OFF
    expect(text).toContain("OFF");
  });

  test("climate card shows temperature from mock data", async ({ page }) => {
    const climateCard = page.getByTestId("widget-card-climate");
    const text = await climateCard.textContent();
    expect(text).toContain("72");
  });

  test("music card shows track from mock data", async ({ page }) => {
    const musicCard = page.getByTestId("widget-card-music");
    const text = await musicCard.textContent();
    expect(text).toContain("Midnight City");
  });

  test("weather card shows temperature from mock data", async ({ page }) => {
    const weatherCard = page.getByTestId("widget-card-weather");
    const text = await weatherCard.textContent();
    expect(text).toContain("78");
  });

  test("stocks card shows ticker data from mock data", async ({ page }) => {
    const stocksCard = page.getByTestId("widget-card-stocks");
    const text = await stocksCard.textContent();
    expect(text).toContain("AAPL");
  });
});
