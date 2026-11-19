import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Result } from 'axe-core';
import { type Impact, normalizeImpact, sortViolations } from './format.ts';

/**
 * Known violations per scan key: `{ [scanKey]: ruleId[] }`.
 * Granularity is the rule id (not individual nodes) — a deliberate trade-off that keeps the
 * file stable and reviewable; a new node of an already known rule does not fail the test.
 */
export type Baseline = Readonly<Record<string, readonly string[]>>;

export const BASELINE_FILE = path.resolve('a11y-baseline.json');

/** Set to "1" by `npm run baseline:update`: scans record results and never assert. */
export const UPDATE_BASELINE_ENV = 'UPDATE_A11Y_BASELINE';

/** Playwright projects whose scans form the baseline. */
export const BASELINE_PROJECTS: readonly string[] = ['chromium'];

/** New violations with these impacts fail the test; others only produce warnings. */
export const BLOCKING_IMPACTS: readonly Impact[] = ['critical', 'serious'];

export function isBaselineUpdateMode(): boolean {
  return process.env[UPDATE_BASELINE_ENV] === '1';
}

export function parseBaseline(json: string): Baseline {
  const data: unknown = JSON.parse(json);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('a11y baseline must be a JSON object: { [scanKey]: string[] }');
  }
  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) {
      throw new Error(`a11y baseline entry "${key}" must be an array of rule ids`);
    }
  }
  return data as Baseline;
}

const cache = new Map<string, Baseline>();

/** Reads the baseline file once per process; a missing file is an empty baseline. */
export function loadBaseline(file: string = BASELINE_FILE): Baseline {
  const cached = cache.get(file);
  if (cached) return cached;
  const baseline = existsSync(file) ? parseBaseline(readFileSync(file, 'utf8')) : {};
  cache.set(file, baseline);
  return baseline;
}

export interface BaselineComparison {
  /** The scan key has no entry in the baseline — every violation is treated as new. */
  readonly baselineMissing: boolean;
  /** Violations whose rule is not in the baseline for this key. */
  readonly new: readonly Result[];
  /** Violations already recorded in the baseline. */
  readonly known: readonly Result[];
  /** Rule ids recorded in the baseline that are no longer reported. */
  readonly fixed: readonly string[];
  /** New critical/serious violations — these fail the test. */
  readonly blocking: readonly Result[];
  /** New moderate/minor violations — reported as warnings only. */
  readonly warnings: readonly Result[];
}

export function isBlocking(violation: Result): boolean {
  return BLOCKING_IMPACTS.includes(normalizeImpact(violation.impact));
}

export function compareWithBaseline(
  violations: readonly Result[],
  knownRuleIds: readonly string[] | undefined,
): BaselineComparison {
  const known = new Set(knownRuleIds ?? []);
  const sorted = sortViolations(violations);
  const reported = new Set(sorted.map((v) => v.id));

  const newViolations = sorted.filter((v) => !known.has(v.id));
  return {
    baselineMissing: knownRuleIds === undefined,
    new: newViolations,
    known: sorted.filter((v) => known.has(v.id)),
    fixed: [...known].filter((id) => !reported.has(id)).sort(),
    blocking: newViolations.filter(isBlocking),
    warnings: newViolations.filter((v) => !isBlocking(v)),
  };
}

export interface BaselineEntry {
  readonly scanKey: string;
  readonly ruleIds: readonly string[];
}

/** Builds a deterministic baseline: keys and rule ids sorted, duplicates merged. */
export function buildBaseline(entries: Iterable<BaselineEntry>): Baseline {
  const merged = new Map<string, Set<string>>();
  for (const { scanKey, ruleIds } of entries) {
    const set = merged.get(scanKey) ?? new Set<string>();
    for (const id of ruleIds) set.add(id);
    merged.set(scanKey, set);
  }
  const baseline: Record<string, string[]> = {};
  for (const key of [...merged.keys()].sort()) {
    baseline[key] = [...(merged.get(key) ?? [])].sort();
  }
  return baseline;
}

export function serializeBaseline(baseline: Baseline): string {
  return `${JSON.stringify(buildBaseline(Object.entries(baseline).map(([scanKey, ruleIds]) => ({ scanKey, ruleIds }))), null, 2)}\n`;
}

/** Human-readable list of differences between two baselines (for the update script / commit). */
export function describeBaselineChanges(previous: Baseline, next: Baseline): string[] {
  const lines: string[] = [];
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort();
  for (const key of keys) {
    const before = previous[key];
    const after = next[key];
    if (before === undefined) {
      lines.push(`+ ${key} (new key)${after?.length ? `: ${after.join(', ')}` : ''}`);
      continue;
    }
    if (after === undefined) {
      lines.push(`- ${key} (key removed)`);
      continue;
    }
    const added = after.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !after.includes(id));
    if (added.length) lines.push(`+ ${key}: ${added.join(', ')}`);
    if (removed.length) lines.push(`- ${key}: ${removed.join(', ')}`);
  }
  return lines;
}
