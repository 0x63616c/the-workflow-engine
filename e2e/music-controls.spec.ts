import { expect, test } from "@playwright/test";
import { expandCard, overlayText, setupDashboard } from "./helpers";

test.describe("Music expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "music");
  });

  test("shows track info from mock data", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toContain("Midnight City");
    expect(text).toContain("M83");
  });

  test("displays playback controls", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const buttons = content.getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("displays speaker with volume control", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toContain("Living Room");
  });
});
