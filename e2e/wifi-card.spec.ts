import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

test.describe("WiFi card flip interaction", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("front side shows SSID and tap to share", async ({ page }) => {
    const wifiCard = page.getByTestId("widget-card-wifi");
    const text = await wifiCard.textContent();
    expect(text).toContain("tap to share");
  });

  test("tapping flips to show QR code", async ({ page }) => {
    const front = page.getByTestId("widget-card-wifi-front");
    await front.click();
    await page.waitForTimeout(800); // flip animation

    const qrContainer = page.getByTestId("qr-container");
    await expect(qrContainer).toBeVisible();
  });
});
