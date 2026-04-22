import { test } from "@playwright/test";
import { expandCard, setupDashboard } from "./helpers";

const SCREENSHOT_DIR = "e2e/screenshots";
const SETTLE_DELAY_MS = 1_000;

function datePrefix(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

test.describe("PR Screenshots", () => {
  test("home dashboard", async ({ page }) => {
    await setupDashboard(page);
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${datePrefix()}-dashboard.png`,
      fullPage: true,
    });
  });

  test("clock expanded", async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "clock");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${datePrefix()}-clock-expanded.png`,
      fullPage: true,
    });
  });

  test("settings expanded", async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "settings");
    await page.waitForTimeout(SETTLE_DELAY_MS);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${datePrefix()}-settings-expanded.png`,
      fullPage: true,
    });
  });
});
