import { expect } from '@playwright/test';
import type { BurgerMenu } from '../../src/pages/index.ts';

/** Waits until the off-canvas menu is open and its 0.5s slide-in transition has finished. */
export async function expectMenuOpen(menu: BurgerMenu): Promise<void> {
  await expect(menu.root).toHaveAttribute('aria-hidden', 'false');
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
