import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import {
  byName,
  describeFocus,
  getFocusedElementInfo,
  tabUntil,
} from '../../src/keyboard/focus.ts';
import { WEBKIT_SKIPS_LINKS } from '../support/browser.ts';
import { expectMenuClosed, expectMenuOpen } from '../support/menu.ts';

// The app's own focus handling around the menu is racy (A11Y-003): under parallel load Firefox
// occasionally does not move focus into the opened menu, or briefly leaves it on the trigger
// after closing. Retries surface such runs as "flaky" in the report instead of hiding them.
test.describe.configure({ retries: 2 });

test.beforeEach(async ({ page, loggedInPage }) => {
  await expect(loggedInPage.items).toHaveCount(6);
  await tabUntil(page, byName('Open Menu', 'button'), { maxSteps: 3 });
});

test('menu › opens with Enter and moves focus to the first item', async ({
  page,
  loggedInPage,
}) => {
  await page.keyboard.press('Enter');

  await expectMenuOpen(loggedInPage.menu);
  await expect(loggedInPage.menu.allItemsLink).toBeFocused();
});

test('menu › opens with Space', async ({ page, loggedInPage }) => {
  // A11Y-004: Space on the native <button> does not open the menu (Enter does).
  test.fail(true, 'A11Y-004: Space does not open the burger menu');

  await page.keyboard.press('Space');

  await expectMenuOpen(loggedInPage.menu);
});

test('menu › closes with Escape', async ({ page, loggedInPage }) => {
  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);

  await page.keyboard.press('Escape');

  await expectMenuClosed(loggedInPage.menu);
});

test('menu › focus returns to the menu button after closing with Escape', async ({
  page,
  loggedInPage,
}) => {
  // A11Y-003: after closing, focus falls back to <body> instead of the trigger button.
  test.fail(true, 'A11Y-003: focus is not returned to the menu button');

  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);
  await page.keyboard.press('Escape');
  await expectMenuClosed(loggedInPage.menu);

  await expect(loggedInPage.menu.openButton).toBeFocused();
});

test('menu › focus returns to the menu button after closing with the Close button', async ({
  page,
  loggedInPage,
}) => {
  // A11Y-003: same defect when the menu is closed via its own Close button.
  test.fail(true, 'A11Y-003: focus is not returned to the menu button');

  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);
  await loggedInPage.menu.closeButton.focus();
  await page.keyboard.press('Enter');
  await expectMenuClosed(loggedInPage.menu);

  await expect(loggedInPage.menu.openButton).toBeFocused();
});

test('menu › Tab moves through all menu items and the Close button', async ({
  page,
  browserName,
  loggedInPage,
}) => {
  test.skip(browserName === 'webkit', WEBKIT_SKIPS_LINKS);

  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);

  const { visited } = await tabUntil(page, (f) => f.name === 'Close Menu', { maxSteps: 8 });

  expect(visited.map(describeFocus)).toEqual([
    'button "Dynamic Catalog" [dynamic-catalog-sidebar-link]',
    'link "About" [about-sidebar-link]',
    'button "Logout" [logout-sidebar-link]',
    'button "Reset App State" [reset-sidebar-link]',
    'button "Close Menu" [react-burger-cross-btn]',
  ]);
});

test('menu › has no keyboard trap: focus can leave the open menu in both directions', async ({
  page,
  loggedInPage,
}) => {
  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);

  const inMenu = async (): Promise<boolean> =>
    loggedInPage.menu.root.evaluate((menu) => menu.contains(document.activeElement));

  // Forward: Tab past the Close button leaves the menu.
  await loggedInPage.menu.closeButton.focus();
  await page.keyboard.press('Tab');
  expect(await inMenu(), describeFocus(await getFocusedElementInfo(page))).toBe(false);

  // Backward: Shift+Tab from the first item leaves the menu.
  await loggedInPage.menu.allItemsLink.focus();
  await page.keyboard.press('Shift+Tab');
  expect(await inMenu(), describeFocus(await getFocusedElementInfo(page))).toBe(false);
});

test('menu › items are not focusable while the menu is closed', async ({ page }) => {
  const { visited } = await tabUntil(page, (f) => f.dataTest === 'product-sort-container', {
    maxSteps: 5,
  });

  expect(visited.filter((f) => f.dataTest?.endsWith('-sidebar-link'))).toEqual([]);
});

test('menu › item with role="button" activates with Enter', async ({ page, loggedInPage }) => {
  await loggedInPage.addToCart('Sauce Labs Backpack');
  await expect(loggedInPage.cartBadge).toHaveText('1');
  // The click above moved focus away from the menu button — put it back before using the keyboard.
  await loggedInPage.menu.openButton.focus();
  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);
  await expect(loggedInPage.menu.allItemsLink).toBeFocused();

  await loggedInPage.menu.resetAppStateLink.focus();
  await page.keyboard.press('Enter');

  await expect(loggedInPage.cartBadge).toBeHidden();
});

test('menu › item with role="button" activates with Space', async ({ page, loggedInPage }) => {
  // A11Y-004: <a href="#" role="button"> ignores Space — the page scrolls instead.
  test.fail(true, 'A11Y-004: role="button" menu items do not support Space');

  await loggedInPage.addToCart('Sauce Labs Backpack');
  await expect(loggedInPage.cartBadge).toHaveText('1');
  // The click above moved focus away from the menu button — put it back before using the keyboard.
  await loggedInPage.menu.openButton.focus();
  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);
  await expect(loggedInPage.menu.allItemsLink).toBeFocused();

  await loggedInPage.menu.resetAppStateLink.focus();
  await page.keyboard.press('Space');

  await expect(loggedInPage.cartBadge).toBeHidden();
});

test('menu › button exposes its expanded state', async ({ page, loggedInPage }) => {
  // A11Y-005: no aria-expanded / aria-controls on the trigger button.
  test.fail(true, 'A11Y-005: menu button has no aria-expanded');

  await expect(loggedInPage.menu.openButton).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expectMenuOpen(loggedInPage.menu);
  await expect(loggedInPage.menu.openButton).toHaveAttribute('aria-expanded', 'true');
});
