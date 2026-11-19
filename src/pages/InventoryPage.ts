import type { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './AuthenticatedPage.ts';

export const SORT_OPTIONS = [
  'Name (A to Z)',
  'Name (Z to A)',
  'Price (low to high)',
  'Price (high to low)',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export class InventoryPage extends AuthenticatedPage {
  readonly path = '/inventory.html';
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly sortSelect: Locator;
  readonly activeSortOption: Locator;

  constructor(page: Page) {
    super(page);
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.itemPrices = page.getByTestId('inventory-item-price');
    this.sortSelect = page.getByRole('combobox', { name: 'Sort products' });
    this.activeSortOption = page.getByTestId('active-option');
  }

  item(name: string): Locator {
    return this.items.filter({
      has: this.page.getByTestId('inventory-item-name').getByText(name, { exact: true }),
    });
  }

  addToCartButton(name: string): Locator {
    return this.item(name).getByRole('button', { name: 'Add to cart' });
  }

  removeButton(name: string): Locator {
    return this.item(name).getByRole('button', { name: 'Remove' });
  }

  /** Title link of the product (the image link has the same accessible name). */
  itemTitleLink(name: string): Locator {
    return this.item(name).getByTestId(/^item-\d+-title-link$/);
  }

  async addToCart(name: string): Promise<void> {
    await this.addToCartButton(name).click();
  }

  async openItem(name: string): Promise<void> {
    await this.itemTitleLink(name).click();
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sortSelect.selectOption({ label: option });
  }
}
