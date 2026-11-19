import { env } from '../../src/config/env.ts';
import { expect, test } from '../../src/a11y/axe.fixture.ts';
import { BurgerMenu } from '../../src/pages/index.ts';
import { expectMenuOpen } from '../support/menu.ts';

/**
 * Scans of transient UI states. Each scan runs only after the state is observable through
 * a concrete locator — never after a fixed timeout.
 */

test('login page › error state (empty form) has no new serious violations', async ({
  loginPage,
  a11yScan,
}) => {
  await loginPage.goto();
  await loginPage.loginButton.click();
  await expect(loginPage.error).toHaveText(/Username is required/);

  await a11yScan('login:error', { exclude: loginPage.a11yExclude });
});

test('login page › wrong password error has no new serious violations', async ({
  loginPage,
  a11yScan,
}) => {
  await loginPage.goto();
  await loginPage.login({ username: env.users.standard.username, password: 'wrong-password' });
  await expect(loginPage.error).toHaveText(/do not match any user/);

  await a11yScan('login:error:wrong-password', { exclude: loginPage.a11yExclude });
});

test('login page › locked-out user error has no new serious violations', async ({
  loginPage,
  a11yScan,
}) => {
  await loginPage.goto();
  await loginPage.login(env.users.lockedOut);
  await expect(loginPage.error).toHaveText(/locked out/);

  await a11yScan('login:locked-user', { exclude: loginPage.a11yExclude });
});

test('inventory page › open burger menu has no new serious violations', async ({
  loggedInPage,
  a11yScan,
}) => {
  await loggedInPage.menu.open();
  await expectMenuOpen(loggedInPage.menu);
  await expect(loggedInPage.menu.logoutLink).toBeVisible();

  await a11yScan('inventory:menu-open', { include: BurgerMenu.selector });
});

test('inventory page › sorted list has no new serious violations', async ({
  loggedInPage,
  a11yScan,
}) => {
  await loggedInPage.sortBy('Price (high to low)');
  await expect(loggedInPage.activeSortOption).toHaveText('Price (high to low)');
  await expect(loggedInPage.itemPrices.first()).toHaveText('$49.99');

  await a11yScan('inventory:sorted', { exclude: loggedInPage.a11yExclude });
});

test('cart page › empty cart has no new serious violations', async ({
  loggedInPage,
  cartPage,
  a11yScan,
}) => {
  await loggedInPage.openCart();
  await expect(cartPage.checkoutButton).toBeVisible();
  await expect(cartPage.items).toHaveCount(0);

  await a11yScan('cart:empty', { exclude: cartPage.a11yExclude });
});

test('checkout step one page › validation errors have no new serious violations', async ({
  loggedInPage,
  cartPage,
  checkoutStepOnePage,
  a11yScan,
}) => {
  await loggedInPage.openCart();
  await cartPage.checkout();
  await checkoutStepOnePage.continue();
  await expect(checkoutStepOnePage.error).toHaveText(/First Name is required/);

  await a11yScan('checkout-step-one:validation-errors', {
    exclude: checkoutStepOnePage.a11yExclude,
  });
});
