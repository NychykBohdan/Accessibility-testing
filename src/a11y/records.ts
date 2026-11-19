import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { AxeResults } from 'axe-core';
import type { Impact } from './format.ts';

/** Directory with one JSON record per scan key (consumed by the summary and baseline scripts). */
export const RESULTS_DIR = path.resolve('reports', 'a11y-results');

export interface ComparisonSummary {
  readonly baselineMissing: boolean;
  readonly new: readonly string[];
  readonly known: readonly string[];
  readonly fixed: readonly string[];
}

/** Persisted record of a single scan (`reports/a11y-results/<scanKey>.json`). */
export interface ScanRecord {
  readonly scanKey: string;
  readonly url: string;
  readonly project: string;
  readonly testTitle: string;
  readonly timestamp: string;
  readonly tags: readonly string[];
  /** Number of violated rules per impact. */
  readonly counts: Record<Impact, number>;
  /** Baseline comparison; `null` when recorded in baseline-update mode. */
  readonly comparison: ComparisonSummary | null;
  /** Full, unmodified axe output. */
  readonly results: AxeResults;
}

/** Scan keys contain `:` / `@`, which are not safe in (Windows) file names. */
export function scanKeyToFileName(scanKey: string): string {
  return `${scanKey.replace(/[^a-z0-9-]/gi, '_')}.json`;
}

/** Reads all scan records, sorted by scan key. A missing directory yields an empty list. */
export function readScanRecords(dir: string = RESULTS_DIR): ScanRecord[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as ScanRecord)
    .sort((a, b) => a.scanKey.localeCompare(b.scanKey));
}
