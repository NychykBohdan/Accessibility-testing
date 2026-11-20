import type { Page } from '@playwright/test';

/**
 * Base class for all Page Objects. Page Objects expose locators and actions only —
 * assertions live in tests.
 */
export abstract class BasePage {
  readonly page: Page;

  /** Relative URL of the page (resolved against `baseURL`). */
  abstract readonly path: string;

  /**
   * CSS selectors excluded from axe scans of this page (third-party widgets, ads, etc.).
   * saucedemo currently renders no third-party UI, so the list is empty by default.
   */
  readonly a11yExclude: readonly string[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits for DOMContentLoaded only: on the live site a slow third-party sub-resource can delay
   * the `load` event for 30 s+. Tests always wait for a page-specific locator afterwards.
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
  }
}
