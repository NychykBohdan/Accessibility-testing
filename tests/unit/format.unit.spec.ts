import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Result } from 'axe-core';
import {
  countByImpact,
  formatTarget,
  formatViolation,
  formatViolations,
  formatViolationShort,
  sortViolations,
} from '../../src/a11y/format.ts';

const violations = JSON.parse(
  readFileSync(new URL('./fixtures/axe-violations.json', import.meta.url), 'utf8'),
) as Result[];

const byId = (id: string): Result => {
  const found = violations.find((v) => v.id === id);
  if (!found) throw new Error(`fixture has no violation ${id}`);
  return found;
};

test.describe('format', () => {
  test('sortViolations › orders by impact, then rule id', () => {
    expect(sortViolations(violations).map((v) => v.id)).toEqual([
      'image-alt',
      'color-contrast',
      'label',
      'aria-hidden-focus',
    ]);
  });

  test('sortViolations › does not mutate the input', () => {
    const before = violations.map((v) => v.id);
    sortViolations(violations);
    expect(violations.map((v) => v.id)).toEqual(before);
  });

  test('formatTarget › joins iframe / shadow DOM selector chains', () => {
    expect(formatTarget(['#plain'])).toBe('#plain');
    expect(formatTarget([['iframe#widget', '#shadow-host', '.menu']])).toBe(
      'iframe#widget >> #shadow-host >> .menu',
    );
  });

  test('formatViolation › shows rule, impact, help url and first 3 targets', () => {
    expect(formatViolation(byId('color-contrast'))).toBe(
      [
        '[serious] color-contrast: Elements must meet minimum color contrast ratio thresholds',
        '    docs: https://dequeuniversity.com/rules/axe/4.14/color-contrast',
        '    targets (5): .error-message, .footer_copy, #item_4_title_link (+2 more)',
      ].join('\n'),
    );
  });

  test('formatViolation › does not add "more" suffix when all targets fit', () => {
    expect(formatViolation(byId('image-alt'))).toContain('targets (1): img.logo\n'.trimEnd());
    expect(formatViolation(byId('image-alt'))).not.toContain('more');
  });

  test('formatViolations › sorted blocks and empty placeholder', () => {
    const text = formatViolations(violations);
    expect(text.indexOf('[critical] image-alt')).toBeLessThan(text.indexOf('[serious]'));
    expect(text.split('\n')).toHaveLength(violations.length * 3);
    expect(formatViolations([])).toBe('(no violations)');
  });

  test('formatViolationShort › single line for annotations', () => {
    expect(formatViolationShort(byId('label'))).toBe(
      'label (moderate, 1 node(s)) — https://dequeuniversity.com/rules/axe/4.14/label',
    );
  });

  test('countByImpact › counts violated rules per impact', () => {
    expect(countByImpact(violations)).toEqual({ critical: 1, serious: 1, moderate: 1, minor: 1 });
    expect(countByImpact([])).toEqual({ critical: 0, serious: 0, moderate: 0, minor: 0 });
  });
});
