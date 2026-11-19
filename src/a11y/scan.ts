import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import type { AxeResults, Result } from 'axe-core';
import {
  type BaselineComparison,
  compareWithBaseline,
  isBaselineUpdateMode,
  loadBaseline,
} from './baseline.ts';
import {
  countByImpact,
  formatViolations,
  formatViolationShort,
  type Impact,
  normalizeImpact,
  sortViolations,
} from './format.ts';
import { RESULTS_DIR, type ScanRecord, scanKeyToFileName } from './records.ts';

export interface ScanOptions {
  /** Restrict the scan to these selectors (e.g. only the open menu). */
  readonly include?: string | readonly string[];
  /** Selectors to skip — pass the Page Object's `a11yExclude` list here. */
  readonly exclude?: readonly string[];
  /**
   * Write `reports/a11y-results/<scanKey>.json`. Disabled only by framework self-tests that
   * inject artificial violations, so they never pollute the real results or the baseline.
   */
  readonly persist?: boolean;
}

export interface ScanReport {
  readonly scanKey: string;
  readonly violations: readonly Result[];
  readonly byImpact: Readonly<Record<Impact, readonly Result[]>>;
  /** `null` in baseline-update mode. */
  readonly comparison: BaselineComparison | null;
  readonly results: AxeResults;
}

export interface RunScanParams {
  readonly page: Page;
  readonly builder: AxeBuilder;
  readonly testInfo: TestInfo;
  readonly scanKey: string;
  readonly tags: readonly string[];
  readonly options?: ScanOptions;
}

/** kebab-case segments separated by ":" with an optional "@variant" suffix. */
const SCAN_KEY_PATTERN = /^[a-z0-9-]+(:[a-z0-9-]+)*(@[a-z0-9-]+)?$/;

export function groupByImpact(violations: readonly Result[]): Record<Impact, Result[]> {
  const groups: Record<Impact, Result[]> = { critical: [], serious: [], moderate: [], minor: [] };
  for (const v of sortViolations(violations)) groups[normalizeImpact(v.impact)].push(v);
  return groups;
}

function annotate(
  testInfo: TestInfo,
  scanKey: string,
  comparison: BaselineComparison,
  results: AxeResults,
): void {
  const add = (type: string, description: string): void => {
    testInfo.annotations.push({ type, description: `[${scanKey}] ${description}` });
  };
  if (comparison.baselineMissing) {
    add(
      'baseline-missing',
      'scan key is not in a11y-baseline.json — run `npm run baseline:update`',
    );
  }
  for (const v of comparison.warnings) add('warning', `new violation: ${formatViolationShort(v)}`);
  for (const id of comparison.fixed) {
    add('fixed-since-baseline', `${id} is no longer reported — run \`npm run baseline:update\``);
  }
  for (const item of results.incomplete) {
    add('needs-review', `axe could not decide, verify manually: ${formatViolationShort(item)}`);
  }
}

export async function runA11yScan({
  page,
  builder,
  testInfo,
  scanKey,
  tags,
  options = {},
}: RunScanParams): Promise<ScanReport> {
  if (!SCAN_KEY_PATTERN.test(scanKey)) {
    throw new Error(`Invalid scanKey "${scanKey}". Use kebab-case segments separated by ":".`);
  }

  const include = typeof options.include === 'string' ? [options.include] : options.include;
  for (const selector of include ?? []) builder.include(selector);
  for (const selector of options.exclude ?? []) builder.exclude(selector);

  const results = await builder.analyze();
  const violations = sortViolations(results.violations);
  const updateMode = isBaselineUpdateMode();
  const comparison = updateMode ? null : compareWithBaseline(violations, loadBaseline()[scanKey]);

  const record: ScanRecord = {
    scanKey,
    url: page.url(),
    project: testInfo.project.name,
    testTitle: testInfo.titlePath.slice(1).join(' › '),
    timestamp: new Date().toISOString(),
    tags,
    counts: countByImpact(violations),
    comparison: comparison && {
      baselineMissing: comparison.baselineMissing,
      new: comparison.new.map((v) => v.id),
      known: comparison.known.map((v) => v.id),
      fixed: comparison.fixed,
    },
    results,
  };
  const json = JSON.stringify(record, null, 2);

  await testInfo.attach(`axe-${scanKey}.json`, { body: json, contentType: 'application/json' });
  await testInfo.attach(`axe-${scanKey}.txt`, {
    body: formatViolations(violations, 10),
    contentType: 'text/plain',
  });
  if (options.persist !== false) {
    await mkdir(RESULTS_DIR, { recursive: true });
    await writeFile(path.join(RESULTS_DIR, scanKeyToFileName(scanKey)), json, 'utf8');
  }

  if (comparison) {
    annotate(testInfo, scanKey, comparison, results);
    expect(
      comparison.blocking.map((v) => v.id),
      `[${scanKey}] new critical/serious violations (not in a11y-baseline.json):\n` +
        formatViolations(comparison.blocking),
    ).toEqual([]);
  }

  return { scanKey, violations, byImpact: groupByImpact(violations), comparison, results };
}
