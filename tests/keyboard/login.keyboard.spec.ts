import { env } from '../../src/config/env.ts';
import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import { byName, describeFocus, tabSequence, tabUntil } from '../../src/keyboard/focus.ts';

test.beforeEach(async ({ loginPage }) => {
  await loginPage.goto();
  await expect(loginPage.loginButton).toBeVisible();
});

test('login page › Tab order is username → password → login button', async ({ page }) => {
  const stops = await tabSequence(page, 3);

  expect(stops.map(describeFocus)).toEqual([
    'textbox "Username" [username]',
    'textbox "Password" [password]',
    'button "Login" [login-button]',
  ]);
});

test('login page › user can log in with keyboard only (Enter submits the form)', async ({
  page,
  loginPage,
  inventoryPage,
}) => {
  await page.keyboard.press('Tab');
  await expect(loginPage.username).toBeFocused();
  await page.keyboard.type(env.users.standard.username);
  await page.keyboard.press('Tab');
  await expect(loginPage.password).toBeFocused();
  await page.keyboard.type(env.users.standard.password);
  await page.keyboard.press('Enter');

  await expect(inventoryPage.title).toHaveText('Products');
});

test('login page › error message can be dismissed with keyboard', async ({ page, loginPage }) => {
  await loginPage.loginButton.focus();
  await page.keyboard.press('Enter');
  await expect(loginPage.error).toBeVisible();

  await tabUntil(page, byName('Dismiss error', 'button'), { maxSteps: 6 });
  await page.keyboard.press('Enter');

  await expect(loginPage.error).toBeHidden();
});
