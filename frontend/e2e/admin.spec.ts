import { test, expect } from '@playwright/test';

test.describe('管理者ダッシュボード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@triplocal.jp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('管理者ダッシュボードにアクセスできる', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('統計情報が表示される', async ({ page }) => {
    await page.goto('/admin');
    // 統計カードまたは数値が表示される
    await expect(page.locator('[class*="stat"], [class*="card"], [class*="dashboard"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
