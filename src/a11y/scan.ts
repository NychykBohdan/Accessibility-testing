import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import type { AxeResults, Result } from 'axe-core';
import {
  countByImpact,
  formatViolations,
  type Impact,
  normalizeImpact,
  sortViolations,
} from './format.ts';

/** Directory with one JSON record per scan key (consumed by scripts/a11y-summary.ts). */
export const RESULTS_DIR = path.resolve('reports', 'a11y-results');

export interface ScanOptions {
  /** Restrict the scan to these selectors (e.g. only the open menu). */
  readonly include?: string | readonly string[];
  /** Selectors to skip — pass the Page Object's `a11yExclude` list here. */
  readonly exclude?: readonly string[];
}

/** Persisted record of a single scan. */
export interface ScanRecord {
  readonly scanKey: string;
  readonly url: string;
  readonly project: string;
  readonly testTitle: string;
  readonly timestamp: string;
  readonly tags: readonly string[];
  readonly counts: Record<Impact, number>;
  readonly results: AxeResults;
}

export interface ScanReport {
  readonly scanKey: string;
  readonly violations: readonly Result[];
  readonly byImpact: Readonly<Record<Impact, readonly Result[]>>;
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

const SCAN_KEY_PATTERN = /^[a-z0-9-]+(:[a-z0-9-]+)*(@[a-z0-9-]+)?$/;

/** Scan keys contain `:`, which is not allowed in Windows file names. */
export function scanKeyToFileName(scanKey: string): string {
  return `${scanKey.replace(/[^a-z0-9-]/gi, '_')}.json`;
}

export function groupByImpact(violations: readonly Result[]): Record<Impact, Result[]> {
  const groups: Record<Impact, Result[]> = { critical: [], serious: [], moderate: [], minor: [] };
  for (const v of sortViolations(violations)) groups[normalizeImpact(v.impact)].push(v);
  return groups;
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

  const record: ScanRecord = {
    scanKey,
    url: page.url(),
    project: testInfo.project.name,
    testTitle: testInfo.titlePath.slice(1).join(' › '),
    timestamp: new Date().toISOString(),
    tags,
    counts: countByImpact(violations),
    results,
  };
  const json = JSON.stringify(record, null, 2);

  await testInfo.attach(`axe-${scanKey}.json`, { body: json, contentType: 'application/json' });
  await testInfo.attach(`axe-${scanKey}.txt`, {
    body: formatViolations(violations, 10),
    contentType: 'text/plain',
  });
  await mkdir(RESULTS_DIR, { recursive: true });
  await writeFile(path.join(RESULTS_DIR, scanKeyToFileName(scanKey)), json, 'utf8');

  return { scanKey, violations, byImpact: groupByImpact(violations), results };
}
