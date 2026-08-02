import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("onboarding_completed", "true");
    });
    await page.goto("/");
  });

  test("should display dashboard core sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "System Status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /weekly activity/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /system analysis/i })).toBeVisible();
  });

  test("should render ai insights and goals cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /system analysis/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /today's goals/i })).toBeVisible();
  });

  test("should display top used apps section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /cognitive load/i })).toBeVisible();
  });

  test("should render weekly chart container", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /weekly activity/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /achievements/i })).toBeVisible();
  });
});
