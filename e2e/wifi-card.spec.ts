import { expect, test } from "@playwright/test";
import { setupDashboard } from "./helpers";

test.describe("WiFi card flip interaction", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("front side shows SSID and tap to share", async ({ page }) => {
    const text = await page.getByTestId("widget-card-wifi").textContent();
    expect(text).toContain("tap to share");
  });

  test("tapping flips to show QR code", async ({ page }) => {
    await page.getByTestId("widget-card-wifi-front").click();
    await expect(page.getByTestId("qr-container")).toBeVisible();
  });
});
