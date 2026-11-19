import { expect } from '@playwright/test';
import type { BurgerMenu } from '../../src/pages/index.ts';

/** Waits until the off-canvas menu is open and its 0.5s slide-in transition has finished. */
export async function expectMenuOpen(menu: BurgerMenu): Promise<void> {
  await expect(menu.root).toHaveAttribute('aria-hidden', 'false');
  await expect(menu.root).toHaveCSS('transform', 'none');
}

export async function expectMenuClosed(menu: BurgerMenu): Promise<void> {
  await expect(menu.root).toHaveAttribute('aria-hidden', 'true');
}
