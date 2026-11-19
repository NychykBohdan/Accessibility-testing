import type { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './AuthenticatedPage.ts';

export class CheckoutStepTwoPage extends AuthenticatedPage {
  readonly path = '/checkout-step-two.html';
  readonly itemNames: Locator;
  readonly subtotal: Locator;
  readonly total: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.itemNames = page.getByTestId('inventory-item-name');
    this.subtotal = page.getByTestId('subtotal-label');
    this.total = page.getByTestId('total-label');
    this.finishButton = page.getByRole('button', { name: 'Finish' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }
}
