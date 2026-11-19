import { expect, test } from '../../src/a11y/axe.fixture.ts';

/**
 * One scan per page in its default state. Every scan waits for a page-specific locator first:
 * saucedemo is an SPA and may still show the previous view right after the URL changes.
 */
const PRODUCT = 'Sauce Labs Backpack';

test('login page › has no new serious violations', async ({ loginPage, a11yScan }) => {
  await loginPage.goto();
  await expect(loginPage.loginButton).toBeVisible();

  await a11yScan('login', { exclude: loginPage.a11yExclude });
});

test('inventory page › has no new serious violations', async ({ loggedInPage, a11yScan }) => {
  await expect(loggedInPage.items).toHaveCount(6);

  await a11yScan('inventory', { exclude: loggedInPage.a11yExclude });
});

test('item page › has no new serious violations', async ({ loggedInPage, itemPage, a11yScan }) => {
  await loggedInPage.openItem(PRODUCT);
  await expect(itemPage.name).toHaveText(PRODUCT);

  await a11yScan('item', { exclude: itemPage.a11yExclude });
});

test('cart page › has no new serious violations', async ({ loggedInPage, cartPage, a11yScan }) => {
  await loggedInPage.addToCart(PRODUCT);
  await loggedInPage.openCart();
  await expect(cartPage.checkoutButton).toBeVisible();
  await expect(cartPage.itemNames).toHaveText([PRODUCT]);

  await a11yScan('cart', { exclude: cartPage.a11yExclude });
});

test.describe('checkout', () => {
  test.beforeEach(async ({ loggedInPage, cartPage }) => {
    await loggedInPage.addToCart(PRODUCT);
    await loggedInPage.openCart();
    await cartPage.checkout();
  });

  test('step one page › has no new serious violations', async ({
    checkoutStepOnePage,
    a11yScan,
  }) => {
    await expect(checkoutStepOnePage.firstName).toBeVisible();

    await a11yScan('checkout-step-one', { exclude: checkoutStepOnePage.a11yExclude });
  });

  test('step two page › has no new serious violations', async ({
    checkoutStepOnePage,
    checkoutStepTwoPage,
    a11yScan,
  }) => {
    await checkoutStepOnePage.fillForm();
    await checkoutStepOnePage.continue();
    await expect(checkoutStepTwoPage.finishButton).toBeVisible();

    await a11yScan('checkout-step-two', { exclude: checkoutStepTwoPage.a11yExclude });
  });

  test('complete page › has no new serious violations', async ({
    checkoutStepOnePage,
    checkoutStepTwoPage,
    checkoutCompletePage,
    a11yScan,
  }) => {
    await checkoutStepOnePage.fillForm();
    await checkoutStepOnePage.continue();
    await checkoutStepTwoPage.finish();
    await expect(checkoutCompletePage.completeHeader).toBeVisible();

    await a11yScan('checkout-complete', { exclude: checkoutCompletePage.a11yExclude });
  });
});
