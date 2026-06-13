import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:5173';

test.describe('Admin UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
        await emailInput.fill('admin@tanhdev.com');
        await page.click('button:has-text("Continue")');
        // Wait for dashboard to indicate successful login
        await expect(page.locator('text=Dashboard Overview')).toBeVisible();
    }
  });

  test('Login and Dashboard Load', async ({ page }) => {
    // Xác nhận Dashboard Overview load thành công
    await expect(page.locator('text=Dashboard Overview')).toBeVisible();
    await expect(page.locator('text=Total Sales')).toBeVisible();
  });

  test('Navigate to Products and verify Table', async ({ page }) => {
    // Chuyển sang Tab Products
    await page.click('text=Products');
    
    // Đảm bảo Table header có mặt
    await expect(page.locator('text=Products Catalog')).toBeVisible();
    await expect(page.locator('text=Name / SKU')).toBeVisible();
  });
});
