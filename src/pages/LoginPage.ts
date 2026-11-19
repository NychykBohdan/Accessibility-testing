import type { Locator, Page } from '@playwright/test';
import type { Credentials } from '../config/env.ts';
import { BasePage } from './BasePage.ts';

export class LoginPage extends BasePage {
  readonly path = '/';
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly error: Locator;
  readonly dismissErrorButton: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.getByRole('textbox', { name: 'Username' });
    // Password inputs have no ARIA role, so the accessible name is matched via label.
    this.password = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.error = page.getByTestId('error');
    this.dismissErrorButton = page.getByRole('button', { name: 'Dismiss error' });
  }

  async login({ username, password }: Credentials): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
  }
}
