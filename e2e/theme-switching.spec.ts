import { expect, test } from "@playwright/test";
import { expandCard, setupDashboard } from "./helpers";

test.describe("Theme switching", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("default theme is midnight (dark) in localStorage", async ({ page }) => {
    const themeMode = await page.evaluate(() => localStorage.getItem("theme-mode"));
    expect(themeMode === null || themeMode === "midnight").toBe(true);
  });

  test("switching to light theme updates localStorage and background", async ({ page }) => {
    await expandCard(page, "settings");

    const overlay = page.getByTestId("card-overlay-content");
    await overlay.getByRole("button", { name: "Light", exact: true }).click();

    await expect(async () => {
      const mode = await page.evaluate(() => localStorage.getItem("theme-mode"));
      expect(mode).toBe("daylight");
    }).toPass({ timeout: 3_000 });

    const hubBg = await page
      .getByTestId("hub-container")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const match = hubBg.match(/\d+/g);
    expect(match).toBeTruthy();
    const [r, g, b] = match?.map(Number) ?? [0, 0, 0];
    expect(r + g + b).toBeGreaterThan(400);
  });

  test("switching back to dark theme restores dark background", async ({ page }) => {
    await expandCard(page, "settings");

    const overlay = page.getByTestId("card-overlay-content");

    await overlay.getByRole("button", { name: "Light", exact: true }).click();
    await expect(async () => {
      const mode = await page.evaluate(() => localStorage.getItem("theme-mode"));
      expect(mode).toBe("daylight");
    }).toPass({ timeout: 3_000 });

    await overlay.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(async () => {
      const mode = await page.evaluate(() => localStorage.getItem("theme-mode"));
      expect(mode).toBe("midnight");
    }).toPass({ timeout: 3_000 });
  });

  test("theme persists in localStorage", async ({ page }) => {
    await expandCard(page, "settings");

    const overlay = page.getByTestId("card-overlay-content");
    await overlay.getByRole("button", { name: "Light", exact: true }).click();

    await expect(async () => {
      const mode = await page.evaluate(() => localStorage.getItem("theme-mode"));
      expect(mode).toBe("daylight");
    }).toPass({ timeout: 3_000 });
  });
});
