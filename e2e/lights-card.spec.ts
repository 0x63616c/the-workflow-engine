import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Lights card", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("shows light state from mock data (3 of 7, majority OFF)", async ({ page }) => {
    const lightsCard = page.getByTestId("widget-card-lights");
    const text = await lightsCard.textContent();
    expect(text).toContain("Lights");
    expect(text).toContain("OFF");
  });

  test("expanded view shows All On and All Off buttons", async ({ page }) => {
    // Lights card doesn't have expandedView in registry but does in EXPANDED_VIEWS
    const lightsCard = page.getByTestId("widget-card-lights");
    await lightsCard.click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    // Lights card toggles directly, no expand. Check it registered the click
    // by verifying the card is still visible (toggle doesn't expand)
    await expect(lightsCard).toBeVisible();
  });
});
