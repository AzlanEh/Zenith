import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display dashboard core sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Today's Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /weekly activity/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /top applications/i })).toBeVisible();
  });

  test("should render ai insights and goals cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /ai insights/i })).toBeVisible();
    await expect(page.getByText(/daily goals/i)).toBeVisible();
  });

  test("should display top used apps section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /top used apps/i })).toBeVisible();
  });

  test("should render weekly chart container", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /weekly activity/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /top applications/i })).toBeVisible();
  });
});
