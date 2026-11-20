import { expect, test } from '../../src/fixtures/pages.fixture.ts';
import { byTestId, isFocusVisible, tabUntil } from '../../src/keyboard/focus.ts';
import { expectMenuOpen } from '../support/menu.ts';

/** Behaviour under user preference media features (WCAG 2.3.3, forced colors). */

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('menu › slide-in animation is disabled when prefers-reduced-motion is set', async ({
    loggedInPage,
  }) => {
    // A11Y-012: the menu keeps its 0.5s transition regardless of prefers-reduced-motion.
    test.fail(true, 'A11Y-012: menu animation ignores prefers-reduced-motion');

    await loggedInPage.menu.open();
    await expectMenuOpen(loggedInPage.menu);

    await expect(loggedInPage.menu.root).toHaveCSS('transition-duration', '0s');
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('inventory page › focus indicator is visible in forced colors mode', async ({
    page,
    browserName,
    loggedInPage,
  }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is only supported in Chromium');
    // A11Y-001: `outline: none` also removes the system focus ring that high-contrast users rely on.
    test.fail(true, 'A11Y-001: no focus indicator in forced colors mode either');

    await expect(loggedInPage.items).toHaveCount(6);
    await tabUntil(page, byTestId('add-to-cart-sauce-labs-backpack'));

    expect(await isFocusVisible(page)).toBe(true);
  });
});
