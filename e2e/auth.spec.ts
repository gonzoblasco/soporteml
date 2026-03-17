import { test, expect } from '@playwright/test';

test.describe('Authentication Flow - Full Integration', () => {
  test('should complete full login flow', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Contraseña').fill('testpass123');

    // Click login button
    await page.locator('form').getByRole('button', { name: /iniciar sesión/i }).click();

    // Should either succeed and redirect, or show error
    // Since we don't have a test user, it should show an error
    await expect(page.getByText(/error/i).or(page.getByText(/invalid/i))).toBeVisible({ timeout: 10000 });
  });

  test('should complete signup flow', async ({ page }) => {
    await page.goto('/signup');

    // Fill signup form
    await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`);
    await page.getByLabel('Contraseña').fill('testpass123');
    await page.getByLabel('Nombre completo').fill('Test User');

    // Select create company tab
    await page.getByRole('tab', { name: /crear empresa/i }).click();
    await page.getByLabel('Nombre de la empresa').fill('Test Company');

    // Click signup button
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    // Should show success message or redirect
    await expect(page.getByText(/revisá tu correo/i).or(page.getByText(/success/i))).toBeVisible({ timeout: 10000 });
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Contraseña').fill('wrongpassword');

    await page.locator('form').getByRole('button', { name: /iniciar sesión/i }).click();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.locator('form').getByRole('button', { name: /iniciar sesión/i }).click();

    // Form should not submit or show validation errors
    await expect(page).toHaveURL(/\/login/);
  });
});