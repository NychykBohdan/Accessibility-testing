import type { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './AuthenticatedPage.ts';

export class CartPage extends AuthenticatedPage {
  readonly path = '/cart.html';
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' });
  }

  removeButton(name: string): Locator {
    return this.items.filter({ hasText: name }).getByRole('button', { name: 'Remove' });
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
