import { test, expect } from '@playwright/test';

test.describe('トップページ', () => {
  test('ページが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.logo')).toBeVisible();
  });

  test('施設カードが表示される', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.listing-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('検索フォームが存在する', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.search-card')).toBeVisible();
  });

  test('ナビゲーションからイベントページに遷移する', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav button', { hasText: '体験を探す' }).click();
    await expect(page).toHaveURL(/\/events/);
  });
});
