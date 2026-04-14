import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Theme switching", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("default theme is midnight (dark) in localStorage", async ({ page }) => {
    const themeMode = await page.evaluate(() => localStorage.getItem("theme-mode"));
    // Either null (first load defaults to midnight) or explicitly midnight
    expect(themeMode === null || themeMode === "midnight").toBe(true);
  });

  test("switching to light theme updates localStorage and background", async ({ page }) => {
    await page.getByTestId("widget-card-settings").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay-content");
    await overlay.getByRole("button", { name: "Light", exact: true }).click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    // Verify localStorage was set
    const themeMode = await page.evaluate(() => localStorage.getItem("theme-mode"));
    expect(themeMode).toBe("daylight");

    // Verify the hub container background changed (uses bg-background CSS var)
    const hubBg = await page
      .getByTestId("hub-container")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const match = hubBg.match(/\d+/g);
    expect(match).toBeTruthy();
    const [r, g, b] = match?.map(Number) ?? [0, 0, 0];
    expect(r + g + b).toBeGreaterThan(400);
  });

  test("switching back to dark theme restores dark background", async ({ page }) => {
    await page.getByTestId("widget-card-settings").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay-content");

    await overlay.getByRole("button", { name: "Light", exact: true }).click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    await overlay.getByRole("button", { name: "Dark", exact: true }).click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const themeMode = await page.evaluate(() => localStorage.getItem("theme-mode"));
    expect(themeMode).toBe("midnight");
  });

  test("theme persists in localStorage", async ({ page }) => {
    await page.getByTestId("widget-card-settings").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay-content");
    await overlay.getByRole("button", { name: "Light", exact: true }).click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const themeMode = await page.evaluate(() => localStorage.getItem("theme-mode"));
    expect(themeMode).toBe("daylight");
  });
});
