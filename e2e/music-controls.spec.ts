import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Music expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand music card
    await page.getByTestId("widget-card-music").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);
  });

  test("shows track info from mock data", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("Midnight City");
    expect(text).toContain("M83");
  });

  test("displays playback controls", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");

    // Should have play/pause, prev, next buttons
    const buttons = content.getByRole("button");
    const count = await buttons.count();
    // At minimum: shuffle, prev, play/pause, next, repeat = 5 controls
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("displays speaker with volume control", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("Living Room");
  });
});
