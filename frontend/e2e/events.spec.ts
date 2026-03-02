import { test, expect } from '@playwright/test';

test.describe('イベント', () => {
  test('イベント一覧ページが表示される', async ({ page }) => {
    await page.goto('/events');
    // ページタイトルが表示される
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('イベントカードが表示される', async ({ page }) => {
    await page.goto('/events');
    const cards = page.locator('[class*="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('イベント詳細ページに遷移できる', async ({ page }) => {
    await page.goto('/events');
    const card = page.locator('[class*="card"]').first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();

    await expect(page).toHaveURL(/\/events\//);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
