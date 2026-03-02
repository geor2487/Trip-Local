import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('テストアカウントでログインできる', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@triplocal.jp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 10_000 });
    // ログイン後、ナビにマイ予約リンクが表示される
    await expect(page.locator('.user-nav-link', { hasText: 'マイ予約' })).toBeVisible();
  });

  test('ログアウトできる', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@triplocal.jp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });

    await page.locator('.user-nav-link', { hasText: 'ログアウト' }).click();
    await expect(page.locator('.nav-cta')).toBeVisible();
  });

  test('新規登録ページに遷移できる', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('不正な認証情報でエラーが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 5_000 });
  });
});
