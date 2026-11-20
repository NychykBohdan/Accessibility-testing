import { expect, test } from '@playwright/test';
import { scanKeyToFileName } from '../../src/a11y/records.ts';
import { resolveScanKey } from '../../src/a11y/scan.ts';

test.describe('scan keys', () => {
  test('resolveScanKey › appends the project variant', () => {
    expect(resolveScanKey('inventory:menu-open', 'mobile')).toBe('inventory:menu-open@mobile');
  });

  test('resolveScanKey › keeps the key when the project has no variant', () => {
    expect(resolveScanKey('login', undefined)).toBe('login');
    expect(resolveScanKey('login@forced-colors', '')).toBe('login@forced-colors');
  });

  test('resolveScanKey › refuses to stack two variants', () => {
    expect(() => resolveScanKey('login@forced-colors', 'mobile')).toThrow(/already has a variant/);
  });

  test('scanKeyToFileName › produces Windows-safe file names', () => {
    expect(scanKeyToFileName('checkout-step-one:validation-errors@mobile')).toBe(
      'checkout-step-one_validation-errors_mobile.json',
    );
  });
});
