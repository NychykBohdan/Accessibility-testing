import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env.ts';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [
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
  projects: [
    // Pure Node unit tests of the framework helpers (no browser is launched).
    { name: 'unit', testDir: './tests/unit' },
    // axe scans run in chromium only: the baseline is chromium-based and axe results
    // differ between engines. Keyboard and smoke tests run in all three browsers.
    {
      name: 'chromium',
      testIgnore: ['**/unit/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: ['**/unit/**', '**/a11y/**'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/unit/**', '**/a11y/**'],
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
