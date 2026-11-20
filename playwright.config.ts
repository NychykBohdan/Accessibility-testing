import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env.ts';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  // CI runs one job per browser and merges their blob reports into a single HTML report
  // (`npx playwright merge-reports`); PLAYWRIGHT_BLOB_OUTPUT_NAME keeps the blob file names unique.
  reporter: isCI
    ? [['list'], ['blob'], ['json', { outputFile: 'reports/results.json' }]]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'reports/results.json' }],
      ],
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Element screenshots of focus states; stored per platform (fonts render differently).
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  projects: [
    // Unit tests of the framework helpers (only the generated-pages axe check opens a page).
    { name: 'unit', testDir: './tests/unit' },
    // axe scans and visual focus snapshots run in chromium only: the baseline is chromium-based
    // and axe results differ between engines. Keyboard, smoke and media tests run everywhere.
    {
      name: 'chromium',
      testIgnore: ['**/unit/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: ['**/unit/**', '**/a11y/**', '**/visual/**'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/unit/**', '**/a11y/**', '**/visual/**'],
      use: { ...devices['Desktop Safari'] },
    },
    // axe scans on a phone viewport. iPhone 13 metrics emulated in Chromium (not WebKit) so the
    // results stay comparable with the desktop baseline; scan keys get the "@mobile" suffix.
    {
      name: 'mobile-chromium',
      testMatch: ['a11y/pages.a11y.spec.ts', 'a11y/states.a11y.spec.ts'],
      metadata: { a11yVariant: 'mobile' },
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
});
