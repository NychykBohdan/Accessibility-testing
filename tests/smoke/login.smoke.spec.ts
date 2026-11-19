import { expect, test } from '@playwright/test';

test('login page › opens', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Swag Labs');
  await expect(page.getByTestId('login-button')).toBeVisible();
});
