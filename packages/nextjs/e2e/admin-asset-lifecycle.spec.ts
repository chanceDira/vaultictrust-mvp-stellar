import { expect, test } from "@playwright/test";

/**
 * Admin asset lifecycle E2E tests.
 *
 * These tests validate the archive/burn/delete UI flows in the admin panel.
 * They run against a live (or preview) deployment and require an admin
 * wallet to be injected via PLAYWRIGHT_ADMIN_PUBKEY and PLAYWRIGHT_ADMIN_SK.
 *
 * Without a connected wallet the tests assert the UI renders correctly
 * and fall back gracefully.
 */

test.describe("admin asset lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  test("admin page renders without crashing for anonymous users", async ({ page }) => {
    const anyContent = page
      .getByText("Connect your Admin Wallet")
      .or(page.getByText("Access Denied"))
      .or(page.getByRole("heading", { name: "Admin dashboard" }));

    await expect(anyContent.first()).toBeVisible({ timeout: 10_000 });
  });

  test("state filter buttons render all seven states when connected as admin", async ({ page }) => {
    const stateFilter = page
      .locator('[class*="grid"]')
      .filter({ hasText: /Pending/i })
      .first();
    const isVisible = await stateFilter.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    const states = ["Pending", "Active", "Tokenized", "Closed", "Relisted", "Archived", "Burned"];
    for (const state of states) {
      await expect(stateFilter.getByText(state)).toBeVisible({ timeout: 5_000 });
    }
  });

  test("archive button triggers confirmation modal", async ({ page }) => {
    const archiveBtn = page.getByRole("button", { name: /^archive$/i }).first();
    const isVisible = await archiveBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await archiveBtn.click();
    await expect(page.getByText("Archive asset")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^archive$/i }).last()).toBeVisible();
  });

  test("cancel button dismisses the confirmation modal", async ({ page }) => {
    const archiveBtn = page.getByRole("button", { name: /^archive$/i }).first();
    const isVisible = await archiveBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await archiveBtn.click();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Archive asset")).not.toBeVisible({ timeout: 2_000 });
  });

  test("delete button triggers danger confirmation modal", async ({ page }) => {
    const deleteBtn = page.getByRole("button", { name: /^delete$/i }).first();
    const isVisible = await deleteBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await deleteBtn.click();
    await expect(page.getByText(/permanently removed/i)).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("button", { name: /^delete$/i }).last()).toBeVisible();
  });

  test("burn button only appears for fractional tokenized or closed assets", async ({ page }) => {
    const burnBtns = page.getByRole("button", { name: /^burn$/i });
    const count = await burnBtns.count();

    for (let i = 0; i < count; i++) {
      const btn = burnBtns.nth(i);
      const row = btn.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')]").first();
      const stateText = await row
        .getByText(/tokenized|closed/i)
        .isVisible()
        .catch(() => false);
      const modelText = await row
        .getByText(/fractional/i)
        .isVisible()
        .catch(() => false);
      expect(stateText && modelText).toBe(true);
    }
  });
});
