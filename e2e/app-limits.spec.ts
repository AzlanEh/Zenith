import { test, expect } from "@playwright/test";

test.describe("App Limits", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("onboarding_completed", "true");
    });
    await page.goto("/");
    await page.getByRole("button", { name: /limits/i }).click();
    await expect(page.getByRole("heading", { name: "Daily App Limits" })).toBeVisible();
  });

  test("should display add limit button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /add app/i })
    ).toBeVisible();
  });

  test("should open add limit dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add app/i }).click();
    await expect(
      page.getByRole("heading", { name: /add application/i })
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByPlaceholder(/search apps\.\.\./i)
    ).toBeVisible();
  });

  test("should close add limit dialog on cancel", async ({ page }) => {
    await page.getByRole("button", { name: /add app/i }).click();
    await expect(
      page.getByRole("heading", { name: /add application/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /add application/i })
    ).not.toBeVisible();
  });

  test("should show app search in add dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add app/i }).click();
    await expect(
      page.getByRole("dialog").getByPlaceholder(/search apps\.\.\./i)
    ).toBeVisible();
  });

  test("should show selected apps counter", async ({ page }) => {
    await page.getByRole("button", { name: /add app/i }).click();
    await expect(page.getByText(/application.*selected/i)).toBeVisible();
  });
});
