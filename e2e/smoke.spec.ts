import { test, expect } from '@playwright/test';

test('landing carga y muestra el título', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/SoporteML/i)).toBeVisible();
});

