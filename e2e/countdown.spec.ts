import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Countdown expanded view", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("widget-card-countdown").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);
  });

  test("shows upcoming events by default", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("Zero's Birthday");
    expect(text).toContain("Apartment Renewal");
  });

  test("shows days remaining for upcoming events", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    // Should show "X days" for upcoming events
    expect(text).toMatch(/\d+ days/);
  });

  test("can switch to past events tab", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");

    const pastButton = content.getByRole("button", { name: /past/i });
    await pastButton.click();
    await page.waitForTimeout(300);

    const text = await content.textContent();
    expect(text).toContain("Launch Day");
  });

  test("can switch back to upcoming tab", async ({ page }) => {
    const content = page.getByTestId("card-overlay-content");

    // Go to past
    await content.getByRole("button", { name: /past/i }).click();
    await page.waitForTimeout(300);

    // Go back to upcoming
    await content.getByRole("button", { name: /upcoming/i }).click();
    await page.waitForTimeout(300);

    const text = await content.textContent();
    expect(text).toContain("Zero's Birthday");
  });
});
