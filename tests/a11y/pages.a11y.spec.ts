import { expect, test } from '../../src/a11y/axe.fixture.ts';

test('login page › produces an axe report', async ({ loginPage, a11yScan }) => {
  await loginPage.goto();
  await expect(loginPage.loginButton).toBeVisible();

  const report = await a11yScan('login', { exclude: loginPage.a11yExclude });

  expect(report.results.url).toContain('saucedemo');
});
