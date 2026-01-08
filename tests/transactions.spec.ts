import { test, expect } from '@playwright/test';

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test123456!';

    await page.goto('/register');
    await page.getByPlaceholder(/имя/i).fill('Test User');
    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/^пароль$/i).fill(testPassword);
    await page.getByPlaceholder(/подтверд/i).fill(testPassword);
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Navigate to transactions
    await page.getByRole('menuitem', { name: /транзакции/i }).click();
    await expect(page).toHaveURL('/transactions');
  });

  test('should show add transaction button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /добавить/i })).toBeVisible();
  });

  test('should open transaction modal', async ({ page }) => {
    await page.getByRole('button', { name: /добавить/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/новая транзакция/i)).toBeVisible();
  });

  test('should have filter controls', async ({ page }) => {
    // Check for period filter
    await expect(page.getByPlaceholder(/период/i).or(page.locator('.ant-picker'))).toBeVisible();
  });
});
