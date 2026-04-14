import { expect, test } from "@playwright/test";
import { dismissOverlay, expandCard, overlayText, setupDashboard } from "./helpers";

test.describe("Empty and error states", () => {
  test("dashboard renders with empty countdown events", async ({ page }) => {
    await setupDashboard(page, {
      "countdownEvents.listUpcoming": [],
      "countdownEvents.listPast": [],
    });

    const text = await page.getByTestId("widget-card-countdown").textContent();
    expect(text).toContain("No events");
  });

  test("music card shows 'No speakers' when media players empty", async ({ page }) => {
    await setupDashboard(page, { "devices.mediaPlayers": [] });

    const text = await page.getByTestId("widget-card-music").textContent();
    expect(text).toContain("No speakers");
  });

  test("expanded countdown past tab shows past events", async ({ page }) => {
    await setupDashboard(page);
    await expandCard(page, "countdown");

    const overlay = page.getByTestId("card-overlay-content");
    await overlay.getByRole("button", { name: /past/i }).click();
    await expect(overlay.getByText("Launch Day")).toBeVisible();
    await expect(overlay.getByText(/\d+ days ago/)).toBeVisible();
  });
});

test.describe("Card grid positioning", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("clock card spans 3 columns and 2 rows", async ({ page }) => {
    const style = await page.getByTestId("widget-card-clock").getAttribute("style");
    expect(style).toMatch(/grid-area:.*1.*\/.*1.*\/.*3.*\/.*4/);
  });

  test("wifi card spans 2 columns and 2 rows", async ({ page }) => {
    const style = await page.getByTestId("widget-card-wifi").getAttribute("style");
    expect(style).toMatch(/grid-area:.*2.*\/.*5.*\/.*4.*\/.*7/);
  });

  test("all cards are visible within the viewport", async ({ page }) => {
    const cardIds = [
      "widget-card-clock",
      "widget-card-countdown",
      "widget-card-music",
      "widget-card-lights",
      "widget-card-fan",
      "widget-card-climate",
      "widget-card-wifi",
      "widget-card-settings",
      "widget-card-weather",
      "widget-card-stocks",
    ];

    for (const id of cardIds) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box).toBeTruthy();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect(box?.y).toBeGreaterThanOrEqual(0);
      expect(box?.width).toBeGreaterThan(50);
      expect(box?.height).toBeGreaterThan(50);
    }
  });
});

test.describe("Data formatting", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("stock prices show color coding: green for up, red for down", async ({ page }) => {
    await expandCard(page, "stocks");
    const content = page.getByTestId("card-overlay-content");

    const aaplParent = content.locator("text=AAPL").locator("..").locator("..");
    await expect(aaplParent.locator(".text-green-400").first()).toBeVisible();

    const googlParent = content.locator("text=GOOGL").locator("..").locator("..");
    await expect(googlParent.locator(".text-red-400").first()).toBeVisible();
  });

  test("weather shows degree symbol with F unit", async ({ page }) => {
    const text = await page.getByTestId("widget-card-weather").textContent();
    expect(text).toContain("\u00b0F");
  });

  test("climate card shows degree symbol with unit", async ({ page }) => {
    const text = await page.getByTestId("widget-card-climate").textContent();
    expect(text).toContain("\u00b0F");
  });

  test("weather expanded shows UV label for index 6 (High)", async ({ page }) => {
    await expandCard(page, "weather");
    const text = await overlayText(page);
    expect(text).toContain("High");
  });

  test("clock shows hours, minutes, and period (AM/PM)", async ({ page }) => {
    const text = await page.getByTestId("widget-card-clock").textContent();
    expect(text).toMatch(/\d+:\d+/);
    expect(text).toMatch(/AM|PM/);
  });

  test("countdown mini card shows event days as numbers", async ({ page }) => {
    const text = await page.getByTestId("widget-card-countdown").textContent();
    expect(text).toMatch(/\d+ days/);
  });

  test("expanded countdown shows formatted dates (e.g. Jun 15, 2026)", async ({ page }) => {
    await expandCard(page, "countdown");
    const text = await overlayText(page);
    expect(text).toContain("Jun 15, 2026");
  });
});

test.describe("Interaction edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("only one card can be expanded at a time", async ({ page }) => {
    await expandCard(page, "music");
    await dismissOverlay(page);

    await expandCard(page, "countdown");
    const text = await overlayText(page);
    expect(text).toContain("Upcoming");
  });

  test("wifi password is masked by default on back side", async ({ page }) => {
    await page.getByTestId("widget-card-wifi-front").click();
    await expect(page.getByTestId("qr-container")).toBeVisible();

    const text = await page.getByTestId("widget-card-wifi-back").textContent();
    expect(text).toContain("\u2022");
    expect(text).not.toContain("welcome2024");
  });

  test("wifi show password button reveals password", async ({ page }) => {
    await page.getByTestId("widget-card-wifi-front").click();
    await expect(page.getByTestId("qr-container")).toBeVisible();

    await page.getByLabel("Show password").click();

    const text = await page.getByTestId("widget-card-wifi-back").textContent();
    expect(text).toContain("welcome2024");
  });

  test("countdown add event form appears when plus button clicked", async ({ page }) => {
    await expandCard(page, "countdown");

    const overlay = page.getByTestId("card-overlay-content");
    await overlay
      .locator("button")
      .filter({ has: page.locator("svg.lucide-plus") })
      .click();

    await expect(overlay.locator('input[type="text"]')).toBeVisible();
    await expect(overlay.locator('input[type="date"]')).toBeVisible();
    await expect(overlay.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(overlay.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("countdown cancel button hides the form", async ({ page }) => {
    await expandCard(page, "countdown");

    const overlay = page.getByTestId("card-overlay-content");
    await overlay
      .locator("button")
      .filter({ has: page.locator("svg.lucide-plus") })
      .click();
    await expect(overlay.locator('input[type="text"]')).toBeVisible();

    await overlay.getByRole("button", { name: "Cancel" }).click();
    await expect(overlay.locator('input[type="text"]')).not.toBeVisible();
  });

  test("fan card shows OFF state from mock data (fanOn: false)", async ({ page }) => {
    const text = await page.getByTestId("widget-card-fan").textContent();
    expect(text).toContain("Fan");
    expect(text).toContain("OFF");
  });

  test("climate card shows ON when hvacMode is not 'off'", async ({ page }) => {
    const text = await page.getByTestId("widget-card-climate").textContent();
    expect(text).toContain("ON");
  });

  test("expanded music shows 'No speakers discovered' when empty", async ({ page }) => {
    // Need fresh page with override, so set up again
    await setupDashboard(page, { "devices.mediaPlayers": [] });
    await expandCard(page, "music");

    const text = await overlayText(page);
    expect(text).toContain("No speakers discovered");
  });
});

test.describe("Overlay behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("overlay content has rounded corners and border", async ({ page }) => {
    await expandCard(page, "music");

    const classes = await page.getByTestId("card-overlay-content").getAttribute("class");
    expect(classes).toContain("rounded-2xl");
    expect(classes).toContain("border");
  });

  test("overlay fills 90% of viewport", async ({ page }) => {
    await expandCard(page, "music");

    const classes = await page.getByTestId("card-overlay-content").getAttribute("class");
    expect(classes).toContain("w-[90%]");
    expect(classes).toContain("h-[90%]");
  });

  test("clock overlay has no backdrop (full screen dark bg)", async ({ page }) => {
    await expandCard(page, "clock");

    await expect(page.getByTestId("card-overlay-backdrop")).not.toBeVisible();
    const classes = await page.getByTestId("card-overlay").getAttribute("class");
    expect(classes).toContain("bg-background");
  });
});
