import { test, expect } from '@playwright/test';

test.describe('オーナー管理画面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@triplocal.jp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('オーナーダッシュボードにアクセスできる', async ({ page }) => {
    await page.goto('/owner');
    await expect(page.locator('.owner-page, .owner-title').first()).toBeVisible({ timeout: 10_000 });
  });

  test('施設管理タブが表示される', async ({ page }) => {
    await page.goto('/owner');
    await expect(page.locator('.owner-tab').first()).toBeVisible({ timeout: 10_000 });
  });
});
