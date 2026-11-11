import { expect, test } from "@playwright/test";

test.describe("marketplace page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/marketplace");
  });

  test("renders the marketplace heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible({ timeout: 10_000 });
  });

  test("shows connect wallet button when not connected", async ({ page }) => {
    const connectBtn = page.getByRole("button", { name: /connect wallet|connect/i }).first();
    await expect(connectBtn).toBeVisible({ timeout: 10_000 });
  });

  test("renders asset list area without crashing", async ({ page }) => {
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null);

    const assetCard = page.locator('[data-testid="asset-card"]').first();
    const emptyState = page.getByText(/no listings are open/i);
    const spinner = page.locator(".loading").first();

    const hasCards = await assetCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const isStillLoading = await spinner.isVisible().catch(() => false);

    expect(hasCards || hasEmpty || isStillLoading).toBe(true);
  });

  test("pagination controls appear when there are multiple pages", async ({ page }) => {
    const nextBtn = page.locator('[data-testid="pagination-next"]');
    const prevBtn = page.locator('[data-testid="pagination-prev"]');

    const paginationVisible = await nextBtn.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!paginationVisible) {
      test.skip();
      return;
    }

    await expect(prevBtn).toBeDisabled();
    await nextBtn.click();
    await expect(prevBtn).toBeEnabled();
  });

  test("opening a listing goes to the asset page", async ({ page }) => {
    const card = page.locator('[data-testid="asset-card"]').first();
    const isVisible = await card.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }
    await card.click();
    await expect(page).toHaveURL(/\/asset\/\d+/, { timeout: 10_000 });
  });
});
