import type { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './AuthenticatedPage.ts';

export class ItemPage extends AuthenticatedPage {
  readonly path = '/inventory-item.html';
  /**
   * Product details card. Locators are scoped to it because the SPA may briefly keep the
   * inventory list (which reuses the same data-test ids) in the DOM after navigation.
   */
  readonly details: Locator;
  readonly name: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.details = page.locator('.inventory_details_container');
    this.name = this.details.getByTestId('inventory-item-name');
    this.description = this.details.getByTestId('inventory-item-desc');
    this.price = this.details.getByTestId('inventory-item-price');
    this.addToCartButton = this.details.getByRole('button', { name: 'Add to cart' });
    this.removeButton = this.details.getByRole('button', { name: 'Remove' });
    this.backButton = page.getByRole('button', { name: 'Back to products' });
  }

  async gotoItem(id: number): Promise<void> {
    await this.page.goto(`${this.path}?id=${id}`);
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }
}
