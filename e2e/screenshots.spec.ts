import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const SCREENSHOT_DIR = "e2e/screenshots";
const SETTLE_DELAY_MS = 1_000;

test.describe("PR Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
  });

  test("home dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-dashboard.png`,
      fullPage: true,
    });
  });

  test("clock expanded", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    const clockCard = page.getByTestId("widget-card-clock");
    if (await clockCard.isVisible()) {
      await clockCard.click();
      await page.waitForTimeout(SETTLE_DELAY_MS);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-clock-expanded.png`,
      fullPage: true,
    });
  });

  test("settings expanded", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    const settingsCard = page.getByTestId("widget-card-settings");
    if (await settingsCard.isVisible()) {
      await settingsCard.click();
      await page.waitForTimeout(SETTLE_DELAY_MS);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-settings-expanded.png`,
      fullPage: true,
    });
  });
});
