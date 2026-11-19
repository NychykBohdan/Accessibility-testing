import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.ts';
import { BurgerMenu } from './components/BurgerMenu.ts';

/** Base for pages behind login: shared header with burger menu and cart link. */
export abstract class AuthenticatedPage extends BasePage {
  readonly menu: BurgerMenu;
  readonly title: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.menu = new BurgerMenu(page);
    this.title = page.getByTestId('title');
    this.cartLink = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
