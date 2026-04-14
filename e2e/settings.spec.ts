import { expect, test } from "@playwright/test";
import { expandCard, overlayText, setupDashboard } from "./helpers";

test.describe("Settings expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "settings");
  });

  test("shows appearance section with theme toggle", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toMatch(/appearance/i);
    expect(text).toMatch(/dark/i);
    expect(text).toMatch(/light/i);
  });

  test("shows font picker with multiple options", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toMatch(/font/i);
    expect(text).toContain("Inter");
  });

  test("shows display settings", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toMatch(/display/i);
    expect(text).toMatch(/idle timeout/i);
    expect(text).toMatch(/dim/i);
  });

  test("shows system status with API online", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toMatch(/system/i);
    expect(text).toMatch(/api/i);
    expect(text).toMatch(/online/i);
  });

  test("shows build hash from mock data", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toContain("abc1234");
  });

  test("shows security section with PIN toggle", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toMatch(/security/i);
    expect(text).toMatch(/pin/i);

    await expect(page.getByTestId("pin-toggle")).toBeVisible();
  });
});
