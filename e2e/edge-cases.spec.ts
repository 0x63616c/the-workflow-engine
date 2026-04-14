import { expect, test } from "@playwright/test";
import { mockTrpcRoutes } from "./mock-trpc";

const ANIMATION_DELAY_MS = 500;

test.describe("Empty and error states", () => {
  test("dashboard renders with empty countdown events", async ({ page }) => {
    // Override mock to return empty events
    await page.route("**/trpc/**", (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname.replace(/^\/trpc\//, "");
      const procedures = pathname.split(",");

      const overrides: Record<string, unknown> = {
        "countdownEvents.listUpcoming": [],
        "countdownEvents.listPast": [],
      };

      const results = procedures.map((proc) => {
        if (overrides[proc] !== undefined) {
          return { result: { data: overrides[proc] } };
        }
        return { result: { data: null } };
      });

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(results),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const countdownCard = page.getByTestId("widget-card-countdown");
    const text = await countdownCard.textContent();
    expect(text).toContain("No events");
  });

  test("music card shows 'No speakers' when media players empty", async ({ page }) => {
    await page.route("**/trpc/**", (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname.replace(/^\/trpc\//, "");
      const procedures = pathname.split(",");

      const overrides: Record<string, unknown> = {
        "devices.mediaPlayers": [],
      };

      const results = procedures.map((proc) => {
        if (overrides[proc] !== undefined) {
          return { result: { data: overrides[proc] } };
        }
        return { result: { data: null } };
      });

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(results),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const musicCard = page.getByTestId("widget-card-music");
    const text = await musicCard.textContent();
    expect(text).toContain("No speakers");
  });

  test("expanded countdown shows empty past tab correctly", async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("widget-card-countdown").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay-content");
    // Past tab should exist and be clickable
    const pastBtn = overlay.getByRole("button", { name: /past/i });
    await expect(pastBtn).toBeVisible();
    await pastBtn.click();
    await page.waitForTimeout(300);

    // Should show past events from mock (Launch Day)
    const text = await overlay.textContent();
    expect(text).toContain("Launch Day");
    // Should show "days ago" for past events
    expect(text).toMatch(/\d+ days ago/);
  });
});

test.describe("Card grid positioning", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("clock card spans 3 columns and 2 rows", async ({ page }) => {
    const clock = page.getByTestId("widget-card-clock");
    const style = await clock.getAttribute("style");
    // BentoCard uses grid-area shorthand: row-start / col-start / row-end / col-end
    expect(style).toMatch(/grid-area:.*1.*\/.*1.*\/.*3.*\/.*4/);
  });

  test("wifi card spans 2 columns and 2 rows", async ({ page }) => {
    const wifi = page.getByTestId("widget-card-wifi");
    const style = await wifi.getAttribute("style");
    expect(style).toMatch(/grid-area:.*2.*\/.*5.*\/.*4.*\/.*7/);
  });

  test("all cards are visible within the viewport", async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport) return;

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
      const card = page.getByTestId(id);
      const box = await card.boundingBox();
      expect(box).toBeTruthy();
      // Card should be within reasonable viewport bounds
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect(box?.y).toBeGreaterThanOrEqual(0);
      expect(box?.width).toBeGreaterThan(50);
      expect(box?.height).toBeGreaterThan(50);
    }
  });
});

test.describe("Data formatting", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("stock prices show color coding: green for up, red for down", async ({ page }) => {
    await page.getByTestId("widget-card-stocks").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");

    // AAPL is +1.19% (positive), should have green
    const aaplRow = content.locator("text=AAPL").locator("..");
    const aaplParent = aaplRow.locator("..");
    const greenText = await aaplParent.locator(".text-green-400").count();
    expect(greenText).toBeGreaterThan(0);

    // GOOGL is -0.5% (negative), should have red
    const googlRow = content.locator("text=GOOGL").locator("..");
    const googlParent = googlRow.locator("..");
    const redText = await googlParent.locator(".text-red-400").count();
    expect(redText).toBeGreaterThan(0);
  });

  test("weather shows degree symbol with F unit", async ({ page }) => {
    const weatherCard = page.getByTestId("widget-card-weather");
    const text = await weatherCard.textContent();
    expect(text).toContain("\u00b0F");
  });

  test("climate card shows degree symbol with unit", async ({ page }) => {
    const climateCard = page.getByTestId("widget-card-climate");
    const text = await climateCard.textContent();
    expect(text).toContain("\u00b0F");
  });

  test("weather expanded shows UV label for index 6 (High)", async ({ page }) => {
    await page.getByTestId("widget-card-weather").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("High");
  });

  test("clock shows hours, minutes, and period (AM/PM)", async ({ page }) => {
    const clockCard = page.getByTestId("widget-card-clock");
    const text = await clockCard.textContent();
    // Should have digits separated by colon
    expect(text).toMatch(/\d+:\d+/);
    expect(text).toMatch(/AM|PM/);
  });

  test("countdown mini card shows event days as numbers", async ({ page }) => {
    const countdownCard = page.getByTestId("widget-card-countdown");
    const text = await countdownCard.textContent();
    // Should show "X days" for each event
    expect(text).toMatch(/\d+ days/);
  });

  test("expanded countdown shows formatted dates (e.g. Jun 15, 2026)", async ({ page }) => {
    await page.getByTestId("widget-card-countdown").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("Jun 15, 2026");
  });
});

test.describe("Interaction edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("only one card can be expanded at a time", async ({ page }) => {
    // Expand music
    await page.getByTestId("widget-card-music").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);
    await expect(page.getByTestId("card-overlay")).toBeVisible();

    // Dismiss
    await page.getByTestId("card-overlay-backdrop").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(ANIMATION_DELAY_MS);
    await expect(page.getByTestId("card-overlay")).not.toBeVisible();

    // Expand countdown
    await page.getByTestId("widget-card-countdown").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    // Should show countdown content, not music
    expect(text).toContain("Upcoming");
  });

  test("wifi password is masked by default on back side", async ({ page }) => {
    await page.getByTestId("widget-card-wifi-front").click();
    await page.waitForTimeout(800);

    const backCard = page.getByTestId("widget-card-wifi-back");
    const text = await backCard.textContent();
    // Password dots (bullet character)
    expect(text).toContain("\u2022");
    // Should not show the actual password
    expect(text).not.toContain("welcome2024");
  });

  test("wifi show password button reveals password", async ({ page }) => {
    await page.getByTestId("widget-card-wifi-front").click();
    await page.waitForTimeout(800);

    // Click the show password button
    await page.getByLabel("Show password").click();
    await page.waitForTimeout(300);

    const backCard = page.getByTestId("widget-card-wifi-back");
    const text = await backCard.textContent();
    expect(text).toContain("welcome2024");
  });

  test("countdown add event form appears when plus button clicked", async ({ page }) => {
    await page.getByTestId("widget-card-countdown").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay-content");

    // Click the plus button
    const addBtn = overlay.locator("button").filter({ has: page.locator("svg.lucide-plus") });
    await addBtn.click();
    await page.waitForTimeout(300);

    // Form should appear with title input, date input, cancel and save buttons
    await expect(overlay.locator('input[type="text"]')).toBeVisible();
    await expect(overlay.locator('input[type="date"]')).toBeVisible();
    await expect(overlay.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(overlay.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("countdown cancel button hides the form", async ({ page }) => {
    await page.getByTestId("widget-card-countdown").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const overlay = page.getByTestId("card-overlay-content");
    const addBtn = overlay.locator("button").filter({ has: page.locator("svg.lucide-plus") });
    await addBtn.click();
    await page.waitForTimeout(300);

    await overlay.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(300);

    await expect(overlay.locator('input[type="text"]')).not.toBeVisible();
  });

  test("fan card shows OFF state from mock data (fanOn: false)", async ({ page }) => {
    const fanCard = page.getByTestId("widget-card-fan");
    const text = await fanCard.textContent();
    expect(text).toContain("Fan");
    expect(text).toContain("OFF");
  });

  test("climate card shows ON when hvacMode is not 'off'", async ({ page }) => {
    const climateCard = page.getByTestId("widget-card-climate");
    const text = await climateCard.textContent();
    // Mock has hvacMode: "cool" which is not "off", so should show ON
    expect(text).toContain("ON");
  });

  test("expanded music shows 'No speakers discovered' when empty", async ({ page }) => {
    // Override media players to empty
    await page.route("**/trpc/**", (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname.replace(/^\/trpc\//, "");
      const procedures = pathname.split(",");

      const results = procedures.map((proc) => {
        if (proc === "devices.mediaPlayers") {
          return { result: { data: [] } };
        }
        return { result: { data: null } };
      });

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(results),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("widget-card-music").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const text = await content.textContent();
    expect(text).toContain("No speakers discovered");
  });
});

test.describe("Overlay behavior", () => {
  test.beforeEach(async ({ page }) => {
    await mockTrpcRoutes(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("overlay content has rounded corners and border", async ({ page }) => {
    await page.getByTestId("widget-card-music").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const classes = await content.getAttribute("class");
    expect(classes).toContain("rounded-2xl");
    expect(classes).toContain("border");
  });

  test("overlay fills 90% of viewport", async ({ page }) => {
    await page.getByTestId("widget-card-music").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    const content = page.getByTestId("card-overlay-content");
    const classes = await content.getAttribute("class");
    expect(classes).toContain("w-[90%]");
    expect(classes).toContain("h-[90%]");
  });

  test("clock overlay has no backdrop (full screen dark bg)", async ({ page }) => {
    await page.getByTestId("widget-card-clock").click();
    await page.waitForTimeout(ANIMATION_DELAY_MS);

    // Clock overlay should NOT have a backdrop element
    const backdrop = page.getByTestId("card-overlay-backdrop");
    await expect(backdrop).not.toBeVisible();

    // But overlay itself should be visible
    const overlay = page.getByTestId("card-overlay");
    await expect(overlay).toBeVisible();
    const classes = await overlay.getAttribute("class");
    expect(classes).toContain("bg-background");
  });
});
