import type { ImpactValue, NodeResult, Result } from 'axe-core';

/** Impact levels from most to least severe. */
export const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;
export type Impact = (typeof IMPACT_ORDER)[number];

/** axe may return `null`/`undefined` impact (e.g. for passes); treat it as the lowest level. */
export function normalizeImpact(impact: ImpactValue | undefined): Impact {
  return impact ?? 'minor';
}

/** Sorts violations by impact (most severe first), then by rule id. */
export function sortViolations(violations: readonly Result[]): Result[] {
  return [...violations].sort(
    (a, b) =>
      IMPACT_ORDER.indexOf(normalizeImpact(a.impact)) -
        IMPACT_ORDER.indexOf(normalizeImpact(b.impact)) || a.id.localeCompare(b.id),
  );
}

/**
 * Converts an axe target to a readable selector. Targets inside iframes / shadow DOM
 * are arrays of selectors; they are joined with ` >> `.
 */
export function formatTarget(target: NodeResult['target']): string {
  return target
    .map((part) => (Array.isArray(part) ? part.join(' >> ') : String(part)))
    .join(' >> ');
}

/** One violation as a short multi-line block: impact, rule, help text, docs and first targets. */
export function formatViolation(violation: Result, maxTargets = 3): string {
  const impact = normalizeImpact(violation.impact);
  const targets = violation.nodes.slice(0, maxTargets).map((node) => formatTarget(node.target));
  const hidden = violation.nodes.length - targets.length;
  const targetLine = targets.join(', ') + (hidden > 0 ? ` (+${hidden} more)` : '');

  return [
    `[${impact}] ${violation.id}: ${violation.help}`,
    `    docs: ${violation.helpUrl}`,
    `    targets (${violation.nodes.length}): ${targetLine}`,
  ].join('\n');
}

/** Formats a list of violations sorted by severity; returns a placeholder for an empty list. */
export function formatViolations(violations: readonly Result[], maxTargets = 3): string {
  if (violations.length === 0) return '(no violations)';
  return sortViolations(violations)
    .map((v) => formatViolation(v, maxTargets))
    .join('\n');
}

/** Compact single-line form used in test annotations. */
export function formatViolationShort(violation: Result): string {
  return `${violation.id} (${normalizeImpact(violation.impact)}, ${violation.nodes.length} node(s)) — ${violation.helpUrl}`;
}

/** Counts violated rules per impact level. */
export function countByImpact(violations: readonly Result[]): Record<Impact, number> {
  const counts: Record<Impact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) counts[normalizeImpact(v.impact)] += 1;
  return counts;
}
