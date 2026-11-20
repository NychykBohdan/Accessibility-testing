import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import {
  byName,
  byTestId,
  getFocusedElementInfo,
  tabSequence,
  tabUntil,
} from '../../src/keyboard/focus.ts';
import { WEBKIT_SKIPS_LINKS } from '../support/browser.ts';

const PRODUCT = 'Sauce Labs Backpack';

test('inventory page › product can be added to the cart with keyboard', async ({
  page,
  loggedInPage,
}) => {
  await tabUntil(page, byTestId('add-to-cart-sauce-labs-backpack'));
  await page.keyboard.press('Enter');

  await expect(loggedInPage.cartBadge).toHaveText('1');
  await expect(loggedInPage.removeButton(PRODUCT)).toBeVisible();
});

test('inventory page › focus stays on the product button after adding it to the cart', async ({
  page,
  loggedInPage,
}) => {
  // A11Y-006: the "Add to cart" button is replaced by "Remove" and focus falls back to <body>.
  test.fail(true, 'A11Y-006: focus is lost after the cart button toggles');

  await tabUntil(page, byTestId('add-to-cart-sauce-labs-backpack'));
  await page.keyboard.press('Enter');
  await expect(loggedInPage.cartBadge).toHaveText('1');

  await expect(loggedInPage.removeButton(PRODUCT)).toBeFocused();
});

test('inventory page › products can be sorted with keyboard', async ({ page, loggedInPage }) => {
  await tabUntil(page, byName('Sort products', 'combobox'));
  await page.keyboard.press('ArrowDown');

  await expect(loggedInPage.activeSortOption).toHaveText('Name (Z to A)');
  await expect(loggedInPage.itemNames.first()).toHaveText('Test.allTheThings() T-Shirt (Red)');
});

test('inventory page › sort control keeps focus after changing the order', async ({
  page,
  loggedInPage,
}) => {
  // A11Y-006: the list re-renders and the <select> loses focus, so the next arrow key does nothing.
  test.fail(true, 'A11Y-006: focus is lost after sorting');

  await tabUntil(page, byName('Sort products', 'combobox'));
  await page.keyboard.press('ArrowDown');
  await expect(loggedInPage.activeSortOption).toHaveText('Name (Z to A)');

  await expect(loggedInPage.sortSelect).toBeFocused();
});

test('inventory page › cart link is reachable with Tab', async ({ page, loggedInPage }) => {
  // A11Y-002: the cart link is <a role="button"> without href/tabindex — not focusable at all.
  test.fail(true, 'A11Y-002: cart link is not keyboard accessible');

  await expect(loggedInPage.cartLink).toBeVisible();
  await tabUntil(page, byTestId('shopping-cart-link'), { maxSteps: 30 });
});

test('inventory page › product details open with Enter on the product title', async ({
  page,
  browserName,
  loggedInPage,
  itemPage,
}) => {
  test.skip(browserName === 'webkit', WEBKIT_SKIPS_LINKS);

  await expect(loggedInPage.items).toHaveCount(6);
  await tabUntil(page, byTestId('item-4-title-link'));
  await page.keyboard.press('Enter');

  await expect(itemPage.name).toHaveText(PRODUCT);
});

test('inventory page › Tab order follows the visual order of a product card', async ({
  page,
  browserName,
  loggedInPage,
}) => {
  test.skip(browserName === 'webkit', WEBKIT_SKIPS_LINKS);

  await expect(loggedInPage.items).toHaveCount(6);
  await tabUntil(page, byTestId('item-4-img-link'));
  const stops = [await getFocusedElementInfo(page), ...(await tabSequence(page, 2))];

  expect(stops.map((s) => s.dataTest)).toEqual([
    'item-4-img-link',
    'item-4-title-link',
    'add-to-cart-sauce-labs-backpack',
  ]);
});
