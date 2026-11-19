import type { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './AuthenticatedPage.ts';

export class CheckoutCompletePage extends AuthenticatedPage {
  readonly path = '/checkout-complete.html';
  readonly completeHeader: Locator;
  readonly completeText: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.completeHeader = page.getByRole('heading', { name: 'Thank you for your order!' });
    this.completeText = page.getByTestId('complete-text');
    this.backHomeButton = page.getByRole('button', { name: 'Back Home' });
  }
}
