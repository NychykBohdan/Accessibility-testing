import type { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './AuthenticatedPage.ts';

export interface CustomerInfo {
  readonly firstName: string;
  readonly lastName: string;
  readonly postalCode: string;
}

export const DEFAULT_CUSTOMER: CustomerInfo = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  postalCode: '01001',
};

export class CheckoutStepOnePage extends AuthenticatedPage {
  readonly path = '/checkout-step-one.html';
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly postalCode: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.firstName = page.getByRole('textbox', { name: 'First Name' });
    this.lastName = page.getByRole('textbox', { name: 'Last Name' });
    this.postalCode = page.getByRole('textbox', { name: 'Zip/Postal Code' });
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.error = page.getByTestId('error');
  }

  async fillForm(info: CustomerInfo = DEFAULT_CUSTOMER): Promise<void> {
    await this.firstName.fill(info.firstName);
    await this.lastName.fill(info.lastName);
    await this.postalCode.fill(info.postalCode);
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
