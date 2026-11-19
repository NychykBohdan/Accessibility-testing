import { env } from '../../src/config/env.ts';
import { expect, test } from '../../src/fixtures/pages.fixture.ts';

const PRODUCT = 'Sauce Labs Backpack';

test('purchase flow › standard user can buy a product end-to-end', async ({
  loginPage,
  inventoryPage,
  cartPage,
  checkoutStepOnePage,
  checkoutStepTwoPage,
  checkoutCompletePage,
}) => {
  await loginPage.goto();
  await loginPage.login(env.users.standard);
  await expect(inventoryPage.title).toHaveText('Products');

  await inventoryPage.addToCart(PRODUCT);
  await expect(inventoryPage.cartBadge).toHaveText('1');
  await inventoryPage.openCart();

  await expect(cartPage.itemNames).toHaveText([PRODUCT]);
  await cartPage.checkout();

  await checkoutStepOnePage.fillForm();
  await checkoutStepOnePage.continue();

  await expect(checkoutStepTwoPage.itemNames).toHaveText([PRODUCT]);
  await expect(checkoutStepTwoPage.total).toContainText('Total: $');
  await checkoutStepTwoPage.finish();

  await expect(checkoutCompletePage.completeHeader).toBeVisible();
});

test('purchase flow › loggedInPage fixture opens inventory without UI login', async ({
  loggedInPage,
  itemPage,
}) => {
  await expect(loggedInPage.items).toHaveCount(6);
  await loggedInPage.sortBy('Price (high to low)');
  await expect(loggedInPage.activeSortOption).toHaveText('Price (high to low)');

  await loggedInPage.openItem('Sauce Labs Onesie');
  await expect(itemPage.name).toHaveText('Sauce Labs Onesie');
  await itemPage.addToCart();
  await expect(itemPage.cartBadge).toHaveText('1');
});
