import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Card expand and collapse", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("tapping a card opens the overlay", async ({ page }) => {
    const musicCard = page.getByTestId("widget-card-music");
    await expect(musicCard).toBeVisible();

    await musicCard.click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay");
    await expect(overlay).toBeVisible();

    const content = page.getByTestId("card-overlay-content");
    await expect(content).toBeVisible();
  });

  test("tapping the backdrop dismisses the overlay", async ({ page }) => {
    const musicCard = page.getByTestId("widget-card-music");
    await musicCard.click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    await expect(page.getByTestId("card-overlay")).toBeVisible();

    const backdrop = page.getByTestId("card-overlay-backdrop");
    await backdrop.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    await expect(page.getByTestId("card-overlay")).not.toBeVisible();
  });

  test("clock card expands to full-screen overlay", async ({ page }) => {
    const clockCard = page.getByTestId("widget-card-clock");
    await clockCard.click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay");
    await expect(overlay).toBeVisible();

    // Clock overlay has no backdrop, click on content dismisses
    const content = page.getByTestId("card-overlay-content");
    await expect(content).toBeVisible();
  });

  test("clock overlay dismisses on click", async ({ page }) => {
    const clockCard = page.getByTestId("widget-card-clock");
    await clockCard.click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    await expect(page.getByTestId("card-overlay")).toBeVisible();

    // Click on the clock content area to dismiss
    await page.getByTestId("card-overlay-content").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    await expect(page.getByTestId("card-overlay")).not.toBeVisible();
  });

  for (const cardId of ["countdown", "music", "settings", "weather", "stocks"]) {
    test(`${cardId} card expands and shows content`, async ({ page }) => {
      const card = page.getByTestId(`widget-card-${cardId}`);
      await card.click();
      await page.waitForTimeout(ANIMATION_DELAY_MS);

      const content = page.getByTestId("card-overlay-content");
      await expect(content).toBeVisible();

      // Verify the expanded view has actual content (not empty)
      const text = await content.textContent();
      expect(text?.length).toBeGreaterThan(0);
    });
  }
});
