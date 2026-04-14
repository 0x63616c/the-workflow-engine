import { test } from "@playwright/test";
import { expandCard, setupDashboard } from "./helpers";

const SCREENSHOT_DIR = "e2e/screenshots";
const SETTLE_DELAY_MS = 1_000;

test.describe("PR Screenshots", () => {
  test("home dashboard", async ({ page }) => {
    await setupDashboard(page);
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-dashboard.png`,
      fullPage: true,
    });
  });

  test("clock expanded", async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "clock");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-clock-expanded.png`,
      fullPage: true,
    });
  });

  test("settings expanded", async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "settings");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-settings-expanded.png`,
      fullPage: true,
    });
  });
});
