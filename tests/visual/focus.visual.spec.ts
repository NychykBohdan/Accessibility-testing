import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import {
  byName,
  byTestId,
  type FocusPredicate,
  isFocusVisible,
  tabUntil,
} from '../../src/keyboard/focus.ts';

/**
 * Pixel-level focus checks (chromium only).
 *
 * 1. "changes appearance" — renders the area around an element before and after it receives
 *    keyboard focus and requires a visible difference. Needs no stored baseline, so it works on
 *    any OS. Complements the computed-style check in focus-visible.keyboard.spec.ts.
 * 2. "matches snapshot" — toHaveScreenshot() regression lock of the focused state. Snapshots are
 *    stored per platform under tests/__screenshots__; CI runs with --ignore-snapshots until Linux
 *    snapshots are committed (see README).
 */

/** Fonts and images must be final, otherwise late loading would be mistaken for a focus change. */
async function waitForStableRender(page: Page, area: Locator): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  for (const img of await area.locator('img').all()) {
    await expect(img).toHaveJSProperty('complete', true);
  }
}

async function renderFocusStates(
  page: Page,
  area: Locator,
  target: FocusPredicate,
): Promise<{ before: Buffer; after: Buffer }> {
  await waitForStableRender(page, area);
  const before = await area.screenshot({ animations: 'disabled' });
  await tabUntil(page, target);
  const after = await area.screenshot({ animations: 'disabled' });
  return { before, after };
}

test('focus detectors › recognise a focus ring when the page has one (self-test)', async ({
  page,
  loginPage,
}) => {
  // Proves that the A11Y-001 checks are red because of the site, not because the detectors
  // can never succeed: inject the recommended fix and expect both detectors to see it.
  await loginPage.goto();
  await expect(loginPage.loginButton).toBeVisible();
  await page.addStyleTag({
    content: ':focus-visible { outline: 3px solid #132322 !important; outline-offset: 2px; }',
  });

  const { before, after } = await renderFocusStates(
    page,
    page.locator('form'),
    byName('Login', 'button'),
  );

  expect(after.equals(before), 'focused render must differ from unfocused').toBe(false);
  expect(await isFocusVisible(page)).toBe(true);
});

test.describe('focus appearance', () => {
  test('login page › login button changes appearance when focused', async ({ page, loginPage }) => {
    test.fail(true, 'A11Y-001: focused and unfocused renders are identical');

    await loginPage.goto();
    await expect(loginPage.loginButton).toBeVisible();
    const { before, after } = await renderFocusStates(
      page,
      page.locator('form'),
      byName('Login', 'button'),
    );

    expect(after.equals(before), 'focused render must differ from unfocused').toBe(false);
  });

  test('inventory page › add to cart button changes appearance when focused', async ({
    page,
    loggedInPage,
  }) => {
    test.fail(true, 'A11Y-001: focused and unfocused renders are identical');

    const card = loggedInPage.item('Sauce Labs Backpack');
    await expect(card).toBeVisible();
    const { before, after } = await renderFocusStates(
      page,
      card,
      byTestId('add-to-cart-sauce-labs-backpack'),
    );

    expect(after.equals(before), 'focused render must differ from unfocused').toBe(false);
  });

  test('inventory page › menu button changes appearance when focused', async ({
    page,
    loggedInPage,
  }) => {
    test.fail(true, 'A11Y-001: focused and unfocused renders are identical');

    await expect(loggedInPage.items).toHaveCount(6);
    const { before, after } = await renderFocusStates(
      page,
      page.getByTestId('primary-header'),
      byName('Open Menu', 'button'),
    );

    expect(after.equals(before), 'focused render must differ from unfocused').toBe(false);
  });
});

test.describe('focus snapshots', () => {
  test('login page › focused login button matches snapshot', async ({ page, loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.loginButton).toBeVisible();
    await waitForStableRender(page, page.locator('form'));
    await tabUntil(page, byName('Login', 'button'));

    await expect(page.locator('form')).toHaveScreenshot('login-button-focused.png');
  });

  test('inventory page › focused add to cart button matches snapshot', async ({
    page,
    loggedInPage,
  }) => {
    const card = loggedInPage.item('Sauce Labs Backpack');
    await expect(card).toBeVisible();
    await waitForStableRender(page, card);
    await tabUntil(page, byTestId('add-to-cart-sauce-labs-backpack'));

    await expect(card).toHaveScreenshot('add-to-cart-focused.png');
  });
});
