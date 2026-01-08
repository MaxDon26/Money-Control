import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /вход/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/пароль/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /войти/i })).toBeVisible();
  });

  test('should show register page', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: /регистрация/i })).toBeVisible();
    await expect(page.getByPlaceholder(/имя/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /зарегистрироваться/i }).click();

    await expect(page).toHaveURL('/register');
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /войти/i }).click();

    await expect(page.getByText(/введите email/i)).toBeVisible();
    await expect(page.getByText(/введите пароль/i)).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL('/login');
  });
});
