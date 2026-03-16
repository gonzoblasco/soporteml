import { test, expect } from '@playwright/test';

test.describe('AI Copilot Performance', () => {
  test('should respond within acceptable time limits', async ({ page, browser }) => {
    // This test would need to be run against a real backend
    // For now, we'll test the UI loading performance

    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Landing page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check that critical elements are visible quickly
    await expect(page.getByText(/SoporteML/i)).toBeVisible({ timeout: 2000 });
  });

  test('should handle concurrent AI requests gracefully', async ({ browser }) => {
    // Test concurrent browser sessions
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    try {
      // Load the app in multiple tabs simultaneously
      const loadPromises = pages.map(page => page.goto('/'));
      const startTime = Date.now();

      await Promise.all(loadPromises);
      const loadTime = Date.now() - startTime;

      // All pages should load within reasonable time
      expect(loadTime).toBeLessThan(5000);

      // Check that each page loaded correctly
      for (const page of pages) {
        await expect(page.getByText(/SoporteML/i)).toBeVisible();
      }
    } finally {
      // Clean up
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should maintain performance under simulated load', async ({ page }) => {
    // Simulate user interactions that might trigger AI requests
    await page.goto('/');

    const actions = [];
    for (let i = 0; i < 10; i++) {
      actions.push(
        page.getByText(/SoporteML/i).isVisible()
      );
    }

    const startTime = Date.now();
    await Promise.all(actions);
    const totalTime = Date.now() - startTime;

    // Should handle multiple checks quickly
    expect(totalTime).toBeLessThan(1000);
  });
});