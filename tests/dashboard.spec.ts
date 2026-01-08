import { test, expect } from '@playwright/test';

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test123456!';

    await page.goto('/register');
    await page.getByPlaceholder(/имя/i).fill('Test User');
    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/^пароль$/i).fill(testPassword);
    await page.getByPlaceholder(/подтверд/i).fill(testPassword);
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard widgets', async ({ page }) => {
    await expect(page.getByText(/общий баланс/i)).toBeVisible();
    await expect(page.getByText(/расходы/i)).toBeVisible();
    await expect(page.getByText(/доходы/i)).toBeVisible();
  });

  test('should navigate to transactions page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /транзакции/i }).click();

    await expect(page).toHaveURL('/transactions');
    await expect(page.getByRole('heading', { name: /транзакции/i })).toBeVisible();
  });

  test('should navigate to accounts page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /счета/i }).click();

    await expect(page).toHaveURL('/accounts');
    await expect(page.getByRole('heading', { name: /счета/i })).toBeVisible();
  });

  test('should navigate to categories page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /категории/i }).click();

    await expect(page).toHaveURL('/categories');
    await expect(page.getByRole('heading', { name: /категории/i })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Click on user avatar/name to open dropdown
    await page.locator('.ant-dropdown-trigger').click();
    await page.getByText(/выйти/i).click();

    await expect(page).toHaveURL('/login');
  });
});
