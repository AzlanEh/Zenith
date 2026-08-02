import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("onboarding_completed", "true");
    });
    await page.goto("/");
  });

  test("should have skip navigation link", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Skip to main content");
    await expect(skipLink).toBeFocused();
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const mainHeading = page.getByRole("heading", {
      level: 1,
      name: "System Status",
    });
    await expect(mainHeading).toBeVisible();
  });

  test("should have accessible sidebar navigation", async ({ page }) => {
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("should have accessible main content area", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
  });

  test("should support keyboard navigation in sidebar", async ({ page }) => {
    // Tab through sidebar buttons
    await page.keyboard.press("Tab"); // Skip link
    await page.keyboard.press("Tab"); // Dashboard

    // Verify focus is on a sidebar button
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("should have proper ARIA labels on buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /dashboard/i })).toBeVisible();

    await page.getByRole("button", { name: /limits/i }).click();
    await expect(page.getByRole("button", { name: /add app/i })).toBeVisible();
  });

  test("should announce content changes", async ({ page }) => {
    await page.getByRole("button", { name: /analytics/i }).click();
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

    const main = page.getByRole("main");
    await expect(main).toHaveAttribute("aria-label", /Detailed Analytics view/i);
  });
});
