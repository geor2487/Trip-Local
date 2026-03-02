import { test, expect } from '@playwright/test';

test.describe('予約フロー', () => {
  test('施設詳細ページが表示される', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.listing-card').first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();

    await expect(page).toHaveURL(/\/properties\//, { timeout: 5_000 });
  });

  test('未ログインで施設詳細を閲覧できる', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.listing-card').first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await expect(page).toHaveURL(/\/properties\//, { timeout: 5_000 });

    // 施設名が表示される
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('ログイン後に施設詳細ページにアクセスできる', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@triplocal.jp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });

    // 施設詳細へ
    const card = page.locator('.listing-card').first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await expect(page).toHaveURL(/\/properties\//, { timeout: 5_000 });
  });
});
