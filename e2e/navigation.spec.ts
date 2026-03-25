import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display Dashboard by default", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Today's Overview" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveAttribute("aria-label", /Today's Overview view/i);
  });

  test("should navigate to Focus Mode via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /focus mode/i }).click();
    await expect(page.getByRole("heading", { name: "Focus Session" })).toBeVisible();
  });

  test("should navigate to Analytics via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /analytics/i }).click();
    await expect(page.getByRole("heading", { name: "Detailed Analytics" })).toBeVisible();
  });

  test("should navigate to App Limits via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /limits/i }).click();
    await expect(page.getByRole("heading", { name: "Limits & Blocking" })).toBeVisible();
  });

  test("should navigate to Settings via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("should support keyboard focus navigation", async ({ page }) => {
    await page.keyboard.press("Tab");
    await expect(page.getByText("Skip to main content")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /dashboard/i })).toBeFocused();
  });
});
