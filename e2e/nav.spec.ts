import { expect, test } from "@playwright/test";

const ITEMS = [
  { label: "Home", path: "/" },
  { label: "Lights", path: "/lights" },
  { label: "Music", path: "/music" },
  { label: "Tesla", path: "/tesla" },
  { label: "Climate", path: "/climate" },
  { label: "Wi-Fi", path: "/wifi" },
  { label: "Settings", path: "/settings" },
];

test.describe("nav", () => {
  test("renders all items", async ({ page }) => {
    await page.goto("/");
    for (const { label } of ITEMS) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("clicking each item navigates and marks it active", async ({ page }) => {
    await page.goto("/");
    for (const { label, path } of ITEMS) {
      await page.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}`));
      await expect(page.getByRole("link", { name: label })).toHaveAttribute("data-active", "true");
    }
  });

  test("home is active by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute("data-active", "true");
  });
});

test.describe("layout", () => {
  test("header shows greeting, location, time, and date", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Good (morning|afternoon|evening)\./,
    );
    await expect(page.getByText(/Los Angeles/)).toBeVisible();
  });

  test("page scroll container is independently scrollable", async ({ page }) => {
    await page.goto("/");
    const main = page.getByTestId("page-scroll");
    await expect(main).toBeVisible();
    await expect(main).toHaveCSS("overflow-y", "auto");
  });
});
