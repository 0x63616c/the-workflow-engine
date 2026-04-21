import { expect, test } from "@playwright/test";
import { setupDashboard } from "./helpers";

test.describe("WiFi card flip interaction", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("front side shows Wi-Fi label and SSID", async ({ page }) => {
    const text = await page.getByTestId("widget-card-wifi").textContent();
    expect(text).toContain("Wi-Fi");
    expect(text).toContain("HomeNet");
  });

  test("tapping reveals QR code (unblurs)", async ({ page }) => {
    await page.getByTestId("widget-card-wifi").click();
    await expect(page.getByTestId("qr-container")).toBeVisible();
  });
});
