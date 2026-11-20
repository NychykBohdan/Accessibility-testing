import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import { byName, byTestId, tabUntil } from '../../src/keyboard/focus.ts';
import { DEFAULT_CUSTOMER } from '../../src/pages/index.ts';

const PRODUCT = 'Sauce Labs Backpack';

test('checkout › full purchase from the inventory page with keyboard only', async ({
  page,
  loggedInPage,
}) => {
  // A11Y-002: a keyboard-only user cannot reach the cart, so the purchase is blocked here.
  test.fail(true, 'A11Y-002: cart link is not keyboard accessible');

  await tabUntil(page, byTestId('add-to-cart-sauce-labs-backpack'));
  await page.keyboard.press('Enter');
  await expect(loggedInPage.cartBadge).toHaveText('1');

  await tabUntil(page, byTestId('shopping-cart-link'), { maxSteps: 30, key: 'Shift+Tab' });
});

test('checkout › purchase from the cart can be completed with keyboard only', async ({
  page,
  loggedInPage,
  cartPage,
  checkoutStepOnePage,
  checkoutStepTwoPage,
  checkoutCompletePage,
}) => {
  await tabUntil(page, byTestId('add-to-cart-sauce-labs-backpack'));
  await page.keyboard.press('Enter');
  await expect(loggedInPage.cartBadge).toHaveText('1');

  // Workaround for A11Y-002: a keyboard user can only get to the cart by typing its URL.
  await cartPage.goto();
  await expect(cartPage.itemNames).toHaveText([PRODUCT]);

  await tabUntil(page, byName('Checkout', 'button'));
  await page.keyboard.press('Enter');

  await expect(checkoutStepOnePage.firstName).toBeVisible();
  await tabUntil(page, byName('First Name', 'textbox'));
  await page.keyboard.type(DEFAULT_CUSTOMER.firstName);
  await page.keyboard.press('Tab');
  await page.keyboard.type(DEFAULT_CUSTOMER.lastName);
  await page.keyboard.press('Tab');
  await page.keyboard.type(DEFAULT_CUSTOMER.postalCode);
  // Enter inside a field would trigger Cancel (A11Y-007), so Tab to Continue explicitly.
  await tabUntil(page, byName('Continue', 'button'), { maxSteps: 3 });
  await page.keyboard.press('Enter');

  await expect(checkoutStepTwoPage.finishButton).toBeVisible();
  await tabUntil(page, byName('Finish', 'button'));
  await page.keyboard.press('Enter');

  await expect(checkoutCompletePage.completeHeader).toBeVisible();
  await tabUntil(page, byName('Back Home', 'button'));
  await page.keyboard.press('Enter');

  await expect(loggedInPage.title).toHaveText('Products');
});

test('checkout › empty form submitted with Enter shows a validation error', async ({
  page,
  loggedInPage,
  cartPage,
  checkoutStepOnePage,
}) => {
  await expect(loggedInPage.items).toHaveCount(6);
  await cartPage.goto();
  await tabUntil(page, byName('Checkout', 'button'));
  await page.keyboard.press('Enter');

  await tabUntil(page, byName('Continue', 'button'));
  await page.keyboard.press('Enter');

  await expect(checkoutStepOnePage.error).toHaveText(/First Name is required/);
});

test('checkout › Enter in a form field submits the form instead of cancelling it', async ({
  page,
  loggedInPage,
  checkoutStepOnePage,
  checkoutStepTwoPage,
}) => {
  // A11Y-007: "Cancel" is a <button> without type (= submit) placed before "Continue", so
  // implicit submission (Enter in a field) activates Cancel and discards the entered data.
  test.fail(true, 'A11Y-007: Enter in a checkout field triggers Cancel');

  await expect(loggedInPage.items).toHaveCount(6);
  await checkoutStepOnePage.goto();
  await checkoutStepOnePage.fillForm();
  await checkoutStepOnePage.postalCode.focus();
  await page.keyboard.press('Enter');

  await expect(checkoutStepTwoPage.finishButton).toBeVisible();
});
