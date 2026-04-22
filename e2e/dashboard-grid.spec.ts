import { expect, test } from "@playwright/test";
import { setupDashboard } from "./helpers";

test.describe("Dashboard grid renders all cards", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
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
      await expect(page.getByTestId(`widget-card-${cardId}`)).toBeVisible();
    });
  }

  test("grid has correct 6-column layout", async ({ page }) => {
    const grid = page.getByTestId("widget-grid");
    const style = await grid.getAttribute("style");
    expect(style).toContain("repeat(6, 1fr)");
  });

  test("clock card shows current time", async ({ page }) => {
    const text = await page.getByTestId("widget-card-clock").textContent();
    expect(text).toMatch(/AM|PM/i);
  });

  test("countdown card shows mock events", async ({ page }) => {
    const text = await page.getByTestId("widget-card-countdown").textContent();
    expect(text).toContain("Zero's Birthday");
    expect(text).toContain("Apartment Renewal");
  });

  test("lights card shows state from mock data", async ({ page }) => {
    const text = await page.getByTestId("widget-card-lights").textContent();
    expect(text).toContain("OFF");
  });

  test("climate card shows temperature from mock data", async ({ page }) => {
    const text = await page.getByTestId("widget-card-climate").textContent();
    expect(text).toContain("72");
  });

  test("music card shows track from mock data", async ({ page }) => {
    const text = await page.getByTestId("widget-card-music").textContent();
    expect(text).toContain("Midnight City");
  });

  test("weather card shows temperature from mock data", async ({ page }) => {
    const text = await page.getByTestId("widget-card-weather").textContent();
    expect(text).toContain("78");
  });

  test("stocks card shows ticker data from mock data", async ({ page }) => {
    const text = await page.getByTestId("widget-card-stocks").textContent();
    expect(text).toContain("AAPL");
  });

  test("tiles are square at iPad resolution", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    const box = await page.getByTestId("widget-card-lights").boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(Math.abs(box.width - box.height)).toBeLessThan(2);
  });

  test("grid scrolls with 10 rows at iPad resolution", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    const metrics = await page.locator("main").evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  });
});
