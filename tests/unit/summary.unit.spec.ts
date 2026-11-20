import { readFileSync } from 'node:fs';
import type { AxeResults, Result } from 'axe-core';
import { expect, test } from '../../src/a11y/axe.fixture.ts';
import { countByImpact } from '../../src/a11y/format.ts';
import {
  countTestStats,
  type PlaywrightJsonReport,
  renderIndexHtml,
} from '../../src/a11y/pages-index.ts';
import type { ComparisonSummary, ScanRecord } from '../../src/a11y/records.ts';
import {
  buildSummaryData,
  renderSummaryHtml,
  renderSummaryMarkdown,
} from '../../src/a11y/summary.ts';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/axe-violations.json', import.meta.url), 'utf8'),
) as Result[];
const rule = (id: string): Result => {
  const found = fixture.find((v) => v.id === id);
  if (!found) throw new Error(`fixture has no violation ${id}`);
  return found;
};

function record(
  scanKey: string,
  violations: Result[],
  comparison: ComparisonSummary | null,
  incomplete: Result[] = [],
): ScanRecord {
  const results = {
    url: `https://www.saucedemo.com/${scanKey.split(':')[0]}.html`,
    timestamp: '2026-11-20T00:00:00.000Z',
    testEngine: { name: 'axe-core', version: '4.14.1' },
    violations,
    incomplete,
    passes: [],
    inapplicable: [],
  } as unknown as AxeResults;
  return {
    scanKey,
    url: results.url,
    project: 'chromium',
    testTitle: scanKey,
    timestamp: results.timestamp,
    tags: ['wcag2a', 'wcag2aa'],
    counts: countByImpact(violations),
    comparison,
    results,
  };
}

const clean = { baselineMissing: false, new: [], known: [], fixed: [] };

const records: ScanRecord[] = [
  record('inventory', [rule('color-contrast')], { ...clean, known: ['color-contrast'] }),
  record('cart', [], { ...clean, fixed: ['label'] }, [rule('color-contrast')]),
  record('login', [rule('image-alt'), rule('color-contrast')], {
    ...clean,
    new: ['image-alt'],
    known: ['color-contrast'],
  }),
  record('checkout-step-one', [rule('label')], { ...clean, baselineMissing: true, new: ['label'] }),
];

test.describe('summary', () => {
  test('buildSummaryData › rows sorted by key with baseline status', () => {
    const data = buildSummaryData(records, 'NOW');
    expect(data.scans.map((s) => [s.scanKey, s.status, s.path])).toEqual([
      ['cart', 'clean', '/cart.html'],
      ['checkout-step-one', 'baseline-missing', '/checkout-step-one.html'],
      ['inventory', 'known', '/inventory.html'],
      ['login', 'new', '/login.html'],
    ]);
    expect(data.scans[0]?.fixedRules).toEqual(['label']);
    expect(data.axeVersion).toBe('4.14.1');
  });

  test('buildSummaryData › aggregates rules by impact and frequency', () => {
    const data = buildSummaryData(records, 'NOW');
    expect(data.violations.map((r) => [r.id, r.scans, r.nodes])).toEqual([
      ['image-alt', 1, 1],
      ['color-contrast', 2, 10],
      ['label', 1, 1],
    ]);
    expect(data.needsReview.map((r) => r.id)).toEqual(['color-contrast']);
    expect(data.totals).toEqual({
      scans: 4,
      violatedRules: 3,
      violationNodes: 12,
      byImpact: { critical: 1, serious: 2, moderate: 1, minor: 0 },
      scansWithNewViolations: 2,
      needsReviewRules: 1,
    });
  });

  test('renderSummaryMarkdown › table per scan key and impact, escaped cells', () => {
    const md = renderSummaryMarkdown(buildSummaryData(records, 'NOW'));
    expect(md).toContain('| `login` | /login.html | 1 | 1 | 0 | 0 | 0 | NEW; new: image-alt |');
    expect(md).toContain('| `cart` | /cart.html | 0 | 0 | 0 | 0 | 1 | clean; fixed: label |');
    expect(md).toContain(
      '| [`image-alt`](https://dequeuniversity.com/rules/axe/4.14/image-alt) | critical | 1 | 1 |',
    );
  });

  test('renderSummaryMarkdown › empty state', () => {
    const md = renderSummaryMarkdown(buildSummaryData([record('login', [], clean)], 'NOW'));
    expect(md).toContain('_No WCAG 2.1 A/AA violations detected._');
    expect(md).toContain('_Nothing to review._');
  });

  test('renderSummaryHtml › escapes untrusted text', () => {
    const evil = { ...rule('label'), help: '<script>alert(1)</script>' };
    const html = renderSummaryHtml(buildSummaryData([record('login', [evil], clean)], 'NOW'));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('countTestStats › separates documented defects (test.fail) from passes', () => {
    const report: PlaywrightJsonReport = {
      stats: { expected: 10, unexpected: 1, flaky: 2, skipped: 3 },
      suites: [
        {
          specs: [{ tests: [{ expectedStatus: 'failed' }, { expectedStatus: 'passed' }] }],
          suites: [{ specs: [{ tests: [{ expectedStatus: 'failed' }] }] }],
        },
      ],
    };
    expect(countTestStats(report)).toEqual({
      passed: 8,
      failed: 1,
      flaky: 2,
      skipped: 3,
      knownDefects: 2,
    });
  });

  test('generated pages › have no WCAG 2.1 AA violations', async ({ page, makeAxeBuilder }) => {
    const summary = buildSummaryData(records, 'NOW');
    const pages = {
      summary: renderSummaryHtml(summary),
      index: renderIndexHtml({
        summary,
        tests: { passed: 1, failed: 0, flaky: 0, skipped: 0, knownDefects: 1 },
        repoUrl: 'https://github.com/example/repo',
        runUrl: null,
      }),
    };
    for (const [name, html] of Object.entries(pages)) {
      await page.setContent(html);
      const { violations } = await makeAxeBuilder().analyze();
      expect(
        violations.map((v) => v.id),
        `${name} page`,
      ).toEqual([]);
    }
  });
});
