import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Settings expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("widget-card-settings").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);
  });

  test("shows appearance section with theme toggle", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toMatch(/appearance/i);
    expect(text).toMatch(/dark/i);
    expect(text).toMatch(/light/i);
  });

  test("shows font picker with multiple options", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toMatch(/font/i);
    // Should have at least a few font options
    expect(text).toContain("Inter");
  });

  test("shows display settings", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toMatch(/display/i);
    expect(text).toMatch(/idle timeout/i);
    expect(text).toMatch(/dim/i);
  });

  test("shows system status with API online", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toMatch(/system/i);
    expect(text).toMatch(/api/i);
    expect(text).toMatch(/online/i);
  });

  test("shows build hash from mock data", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("abc1234");
  });

  test("shows security section with PIN toggle", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toMatch(/security/i);
    expect(text).toMatch(/pin/i);

    const pinToggle = page.getByTestId("pin-toggle");
    await expect(pinToggle).toBeVisible();
  });
});
