import { expect } from '@playwright/test';
import type { BurgerMenu } from '../../src/pages/index.ts';

/** Waits until the off-canvas menu is open and its 0.5s slide-in transition has finished. */
export async function expectMenuOpen(menu: BurgerMenu): Promise<void> {
  await expect(menu.root).toHaveAttribute('aria-hidden', 'false');
  // The app occasionally ends up with aria-hidden="false" *and* the `hidden` attribute (A11Y-003),
  // and `transform` of a display:none element is also "none" — so visibility is checked explicitly.
  await expect(menu.root).toBeVisible();
  await expect(menu.root).toHaveCSS('transform', 'none');
}

/**
 * Waits until the menu is closed and its slide-out transition has finished
 * (react-burger-menu sets `hidden` on the panel only at the very end).
 */
export async function expectMenuClosed(menu: BurgerMenu): Promise<void> {
  await expect(menu.root).toHaveAttribute('aria-hidden', 'true');
  await expect(menu.root).toBeHidden();
}
