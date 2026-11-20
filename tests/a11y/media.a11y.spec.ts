import { expect, test } from '../../src/a11y/axe.fixture.ts';
import { BurgerMenu } from '../../src/pages/index.ts';
import { expectMenuOpen } from '../support/menu.ts';

/**
 * Scans in Windows High Contrast-like mode (`forced-colors: active`). Scan keys carry the
 * "@forced-colors" variant so they have their own baseline entries.
 */
test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('login page › forced colors mode has no new serious violations', async ({
    loginPage,
    a11yScan,
  }) => {
    await loginPage.goto();
    await expect(loginPage.loginButton).toBeVisible();

    await a11yScan('login@forced-colors', { exclude: loginPage.a11yExclude });
  });

  test('inventory page › forced colors mode has no new serious violations', async ({
    loggedInPage,
    a11yScan,
  }) => {
    await expect(loggedInPage.items).toHaveCount(6);

    await a11yScan('inventory@forced-colors', { exclude: loggedInPage.a11yExclude });
  });

  test('inventory page › open menu in forced colors mode has no new serious violations', async ({
    loggedInPage,
    a11yScan,
  }) => {
    await loggedInPage.menu.open();
    await expectMenuOpen(loggedInPage.menu);

    await a11yScan('inventory:menu-open@forced-colors', { include: BurgerMenu.selector });
  });
});
