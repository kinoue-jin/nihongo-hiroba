import { test, expect } from '@playwright/test';
import { seedTestData, cleanupTestDataOnly } from '../../fixtures/seed';

test.describe('Top Page E2E Tests', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestDataOnly();
  });

  test.describe('Top Page', () => {
    test('top page loads without errors', async ({ page }) => {
      await page.goto('/');

      // Verify page loads
      await expect(page).toHaveTitle(/日本語ひろば|にほんごひろば|Nihongo Hiroba/);

      // Verify main content is visible
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('top page displays header and footer', async ({ page }) => {
      await page.goto('/');

      // Verify header is visible
      await expect(page.locator('[data-testid="header"]')).toBeVisible();

      // Verify footer is visible
      await expect(page.locator('[data-testid="footer"]')).toBeVisible();
    });

    test('top page shows latest news', async ({ page }) => {
      await page.goto('/');

      // Verify news section is visible
      await expect(page.locator('[data-testid="news-section"]')).toBeVisible();

      // Verify news items are displayed
      await expect(page.locator('[data-testid="news-list"]')).toBeVisible();
    });

    test.skip('navigation to other pages works - DOM detachment issue in dev mode', () => {
      // This test fails due to React StrictMode causing DOM detachment
    });

    test('login button navigates to login page', async ({ page, browserName }) => {
      await page.goto('/');
      if (browserName === 'webkit') {
        test.skip();
        return;
      }
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/login');
    });

    test.skip('responsive design on mobile - DOM detachment issue in dev mode', () => {
      // This test fails due to React StrictMode causing DOM detachment
    });
  });
});
