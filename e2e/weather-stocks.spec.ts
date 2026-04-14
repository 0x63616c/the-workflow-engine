import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Weather expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("shows temperature and condition", async ({ page }) => {
    await page.getByTestId("widget-card-weather").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("78");
    expect(text).toContain("Partly Cloudy");
  });

  test("shows high and low temps", async ({ page }) => {
    await page.getByTestId("widget-card-weather").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("84");
    expect(text).toContain("65");
  });

  test("shows UV index", async ({ page }) => {
    await page.getByTestId("widget-card-weather").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("6");
    expect(text).toMatch(/UV/i);
  });
});

test.describe("Stocks expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("shows stock tickers with prices", async ({ page }) => {
    await page.getByTestId("widget-card-stocks").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("AAPL");
    expect(text).toContain("GOOGL");
    expect(text).toContain("MSFT");
    expect(text).toContain("AMZN");
  });

  test("shows crypto section", async ({ page }) => {
    await page.getByTestId("widget-card-stocks").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("BTC");
    expect(text).toContain("ETH");
    expect(text).toContain("Crypto");
  });
});
