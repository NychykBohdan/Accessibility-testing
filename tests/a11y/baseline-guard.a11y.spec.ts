import { isBaselineUpdateMode } from '../../src/a11y/baseline.ts';
import { expect, test } from '../../src/a11y/axe.fixture.ts';

/**
 * Self-test of the framework: proves that a regression which is not in the baseline turns
 * a scan red. The injected violation is never persisted (persist: false) and the test is
 * skipped while the baseline is being regenerated.
 */
test.describe('baseline guard', () => {
  test.skip(isBaselineUpdateMode(), 'injected violations must never reach the baseline');

  test('injected <img> without alt fails the scan as a new critical violation', async ({
    page,
    loginPage,
    a11yScan,
  }) => {
    await loginPage.goto();
    await expect(loginPage.loginButton).toBeVisible();

    await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      img.width = 16;
      img.height = 16;
      img.dataset.test = 'injected-img-without-alt';
      document.querySelector('form')?.append(img);
    });
    await expect(page.getByTestId('injected-img-without-alt')).toBeAttached();

    await expect(a11yScan('login', { persist: false })).rejects.toThrow(
      /new critical\/serious violations[\s\S]*\[critical\] image-alt/,
    );
  });
});
