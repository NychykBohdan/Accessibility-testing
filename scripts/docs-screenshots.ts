/**
 * Regenerates the screenshots used in README.md (docs/images/*.png).
 *
 * Prerequisites: npm test; npm run a11y:summary; npm run pages:build
 * Usage:         node scripts/docs-screenshots.ts
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, selectors } from '@playwright/test';
import { env } from '../src/config/env.ts';

const OUT = path.resolve('docs', 'images');
const fileUrl = (relative: string): string => pathToFileURL(path.resolve(relative)).href;

// Outside the test runner playwright.config.ts is not applied.
selectors.setTestIdAttribute('data-test');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  const page = await context.newPage();

  // 1. Playwright HTML report filtered to the menu keyboard tests.
  await page.goto(`${fileUrl('site/report/index.html')}#?q=menu`);
  await page.getByText('menu ›').first().waitFor();
  await page.screenshot({ path: path.join(OUT, 'playwright-report.png') });

  // 2. axe summary page.
  await page.goto(fileUrl('site/a11y-summary.html'));
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.screenshot({ path: path.join(OUT, 'a11y-summary.png') });

  // 3. A11Y-001: keyboard focus on "Add to cart" — as shipped vs. with the recommended fix.
  await context.addCookies([
    { name: 'session-username', value: env.users.standard.username, url: env.baseURL },
  ]);
  await page.goto(`${env.baseURL}/inventory.html`);
  const card = page.getByTestId('inventory-item').first();
  const button = card.getByRole('button', { name: 'Add to cart' });
  await button.waitFor();
  await button.focus();
  await card.screenshot({ path: path.join(OUT, 'focus-actual.png') });
  await page.addStyleTag({
    content: ':focus-visible { outline: 3px solid #132322 !important; outline-offset: 2px; }',
  });
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await card.screenshot({ path: path.join(OUT, 'focus-expected.png') });
} finally {
  await browser.close();
}
console.log(`Screenshots written to ${OUT}`);
