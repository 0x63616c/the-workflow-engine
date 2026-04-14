import { expect, test } from "@playwright/test";
import { expandCard, overlayText, setupDashboard } from "./helpers";

test.describe("Countdown expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "countdown");
  });

  test("shows upcoming events by default", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toContain("Zero's Birthday");
    expect(text).toContain("Apartment Renewal");
  });

  test("shows days remaining for upcoming events", async ({ page }) => {
    const text = await overlayText(page);
    expect(text).toMatch(/\d+ days/);
  });

  test("can switch to past events tab", async ({ page }) => {
    const overlay = page.getByTestId("card-overlay-content");
    await overlay.getByRole("button", { name: /past/i }).click();

    await expect(overlay.getByText("Launch Day")).toBeVisible();
  });

  test("can switch back to upcoming tab", async ({ page }) => {
    const overlay = page.getByTestId("card-overlay-content");

    await overlay.getByRole("button", { name: /past/i }).click();
    await expect(overlay.getByText("Launch Day")).toBeVisible();

    await overlay.getByRole("button", { name: /upcoming/i }).click();
    await expect(overlay.getByText("Zero's Birthday")).toBeVisible();
  });
});
