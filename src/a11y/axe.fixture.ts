import AxeBuilder from '@axe-core/playwright';
import { test as pagesTest } from '../fixtures/pages.fixture.ts';
import { runA11yScan, type ScanOptions, type ScanReport } from './scan.ts';

/**
 * WCAG 2.1 Level A + AA. This is the single place where tags are configured —
 * tests must never pass their own tags.
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

export interface A11yFixtures {
  /** Pre-configured AxeBuilder factory. Never call `new AxeBuilder()` in tests. */
  makeAxeBuilder: () => AxeBuilder;
  /** Scans the current page state under the given scan key (see CLAUDE.md for key naming). */
  a11yScan: (scanKey: string, options?: ScanOptions) => Promise<ScanReport>;
}

export const test = pagesTest.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags([...WCAG_TAGS]));
  },

  a11yScan: async ({ page, makeAxeBuilder }, use, testInfo) => {
    await use((scanKey, options) =>
      runA11yScan({
        page,
        builder: makeAxeBuilder(),
        testInfo,
        scanKey,
        tags: WCAG_TAGS,
        options,
      }),
    );
  },
});

export { expect } from '@playwright/test';
