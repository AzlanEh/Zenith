import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("should display theme settings", async ({ page }) => {
    await expect(page.getByText("Appearance").first()).toBeVisible();
    await expect(page.locator('input[name="theme"][value="light"]')).toBeAttached();
    await expect(page.locator('input[name="theme"][value="dark"]')).toBeAttached();
    await expect(page.locator('input[name="theme"][value="system"]')).toBeAttached();
  });

  test("should switch themes", async ({ page }) => {
    await page.locator('input[name="theme"][value="dark"]').check({ force: true });
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.locator('input[name="theme"][value="light"]').check({ force: true });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("should display notification settings", async ({ page }) => {
    await expect(page.getByText(/notifications/i).first()).toBeVisible();
  });

  test("should display break reminders settings", async ({ page }) => {
    await expect(page.getByText(/break reminders/i)).toBeVisible();
  });

  test("should display data export section", async ({ page }) => {
    await expect(page.getByText(/export data/i)).toBeVisible();
  });

  test("should display data management section", async ({ page }) => {
    await expect(page.getByText(/delete all data/i)).toBeVisible();
  });
});
