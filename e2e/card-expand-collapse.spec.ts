import { expect, test } from "@playwright/test";
import { dismissOverlay, expandCard, overlayText, setupDashboard } from "./helpers";

test.describe("Card expand and collapse", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("tapping a card opens the overlay", async ({ page }) => {
    await expandCard(page, "music");

    await expect(page.getByTestId("card-overlay")).toBeVisible();
    await expect(page.getByTestId("card-overlay-content")).toBeVisible();
  });

  test("tapping the backdrop dismisses the overlay", async ({ page }) => {
    await expandCard(page, "music");
    await dismissOverlay(page);

    await expect(page.getByTestId("card-overlay")).not.toBeVisible();
  });

  test("clock card expands to full-screen overlay", async ({ page }) => {
    await expandCard(page, "clock");

    await expect(page.getByTestId("card-overlay")).toBeVisible();
    await expect(page.getByTestId("card-overlay-content")).toBeVisible();
  });

  test("clock overlay dismisses on click", async ({ page }) => {
    await expandCard(page, "clock");
    await dismissOverlay(page);

    await expect(page.getByTestId("card-overlay")).not.toBeVisible();
  });

  for (const cardId of ["countdown", "music", "settings", "weather", "stocks"]) {
    test(`${cardId} card expands and shows content`, async ({ page }) => {
      await expandCard(page, cardId);

      const text = await overlayText(page);
      expect(text?.length).toBeGreaterThan(0);
    });
  }
});
