import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import { auditFocusIndicators, describeFocus } from '../../src/keyboard/focus.ts';
import { expectMenuOpen } from '../support/menu.ts';

/**
 * WCAG 2.4.7 Focus Visible: every focus stop must show an indicator.
 *
 * A11Y-001: the site ships a global `:focus { outline: none }` without any replacement style,
 * so all of these checks are expected to fail until the defect is fixed. Once it is fixed,
 * Playwright reports them as "unexpectedly passed" — remove the test.fail() markers then.
 */
const invisibleStops = (stops: Awaited<ReturnType<typeof auditFocusIndicators>>): string[] =>
  stops.filter((s) => !s.visible).map((s) => describeFocus(s.info));

test('login page › every focus stop has a visible focus indicator', async ({ page, loginPage }) => {
  test.fail(true, 'A11Y-001: global :focus { outline: none }');

  await loginPage.goto();
  await expect(loginPage.loginButton).toBeVisible();

  expect(invisibleStops(await auditFocusIndicators(page, 3))).toEqual([]);
});

test('inventory page › every focus stop has a visible focus indicator', async ({
  page,
  loggedInPage,
}) => {
  test.fail(true, 'A11Y-001: global :focus { outline: none }');

  await expect(loggedInPage.items).toHaveCount(6);

  expect(invisibleStops(await auditFocusIndicators(page, 6))).toEqual([]);
});

test('menu › every focus stop has a visible focus indicator', async ({ page, loggedInPage }) => {
  test.fail(true, 'A11Y-001: global :focus { outline: none }');

  await loggedInPage.menu.openButton.focus();
  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);

  expect(invisibleStops(await auditFocusIndicators(page, 5))).toEqual([]);
});

test('cart page › every focus stop has a visible focus indicator', async ({
  page,
  loggedInPage,
  cartPage,
}) => {
  test.fail(true, 'A11Y-001: global :focus { outline: none }');

  await loggedInPage.addToCart('Sauce Labs Backpack');
  await cartPage.goto();
  await expect(cartPage.checkoutButton).toBeVisible();

  expect(invisibleStops(await auditFocusIndicators(page, 4))).toEqual([]);
});

test('checkout step one page › every focus stop has a visible focus indicator', async ({
  page,
  loggedInPage,
  checkoutStepOnePage,
}) => {
  test.fail(true, 'A11Y-001: global :focus { outline: none }');

  await expect(loggedInPage.items).toHaveCount(6);
  await checkoutStepOnePage.goto();
  await expect(checkoutStepOnePage.firstName).toBeVisible();

  expect(invisibleStops(await auditFocusIndicators(page, 5))).toEqual([]);
});
