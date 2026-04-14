import { expect, test } from "@playwright/test";
import { expandCard, overlayText, setupDashboard } from "./helpers";

test.describe("Weather expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("shows temperature and condition", async ({ page }) => {
    await expandCard(page, "weather");
    const text = await overlayText(page);
    expect(text).toContain("78");
    expect(text).toContain("Partly Cloudy");
  });

  test("shows high and low temps", async ({ page }) => {
    await expandCard(page, "weather");
    const text = await overlayText(page);
    expect(text).toContain("84");
    expect(text).toContain("65");
  });

  test("shows UV index", async ({ page }) => {
    await expandCard(page, "weather");
    const text = await overlayText(page);
    expect(text).toContain("6");
    expect(text).toMatch(/UV/i);
  });
});

test.describe("Stocks expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("shows stock tickers with prices", async ({ page }) => {
    await expandCard(page, "stocks");
    const text = await overlayText(page);
    expect(text).toContain("AAPL");
    expect(text).toContain("GOOGL");
    expect(text).toContain("MSFT");
    expect(text).toContain("AMZN");
  });

  test("shows crypto section", async ({ page }) => {
    await expandCard(page, "stocks");
    const text = await overlayText(page);
    expect(text).toContain("BTC");
    expect(text).toContain("ETH");
    expect(text).toContain("Crypto");
  });
});
