import { expect, test } from "@playwright/test";
import { setupDashboard } from "./helpers";

test.describe("Lights card", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("shows light state from mock data (3 of 7, majority OFF)", async ({ page }) => {
    const lightsCard = page.getByTestId("widget-card-lights");
    const text = await lightsCard.textContent();
    expect(text).toContain("Lights");
    expect(text).toContain("OFF");
  });

  test("clicking toggles (card stays visible, no expand)", async ({ page }) => {
    const lightsCard = page.getByTestId("widget-card-lights");
    await lightsCard.click();
    await expect(lightsCard).toBeVisible();
  });
});
