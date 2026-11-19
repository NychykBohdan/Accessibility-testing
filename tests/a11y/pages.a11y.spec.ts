import { expect, test } from '../../src/a11y/axe.fixture.ts';

test('login page › has no new serious violations', async ({ loginPage, a11yScan }) => {
  await loginPage.goto();
  await expect(loginPage.loginButton).toBeVisible();

  await a11yScan('login', { exclude: loginPage.a11yExclude });
});
