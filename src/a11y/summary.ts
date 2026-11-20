import type { Result } from 'axe-core';
import { IMPACT_ORDER, type Impact, normalizeImpact } from './format.ts';
import type { ScanRecord } from './records.ts';

export type ScanStatus = 'clean' | 'known' | 'new' | 'baseline-missing' | 'not-compared';

export interface ScanRow {
  readonly scanKey: string;
  readonly path: string;
  readonly project: string;
  readonly counts: Record<Impact, number>;
  readonly nodes: number;
  readonly needsReview: number;
  readonly status: ScanStatus;
  readonly newRules: readonly string[];
  readonly fixedRules: readonly string[];
}

export interface RuleRow {
  readonly id: string;
  readonly impact: Impact;
  readonly help: string;
  readonly helpUrl: string;
  /** Number of scans in which the rule was reported. */
  readonly scans: number;
  /** Total number of affected nodes across all scans. */
  readonly nodes: number;
}

export interface SummaryData {
  readonly generatedAt: string;
  readonly axeVersion: string;
  readonly tags: readonly string[];
  readonly scans: readonly ScanRow[];
  readonly violations: readonly RuleRow[];
  readonly needsReview: readonly RuleRow[];
  readonly totals: {
    readonly scans: number;
    readonly violatedRules: number;
    readonly violationNodes: number;
    readonly byImpact: Record<Impact, number>;
    readonly scansWithNewViolations: number;
    readonly needsReviewRules: number;
  };
}

function pathOf(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    return pathname + search;
  } catch {
    return url;
  }
}

function statusOf(record: ScanRecord): ScanStatus {
  const c = record.comparison;
  if (!c) return 'not-compared';
  if (c.baselineMissing) return 'baseline-missing';
  if (c.new.length > 0) return 'new';
  if (c.known.length > 0) return 'known';
  return 'clean';
}

/** Aggregates rules over scans; sorted by impact, then scan count, then node count, then id. */
function aggregateRules(groups: ReadonlyArray<readonly Result[]>): RuleRow[] {
  const rules = new Map<string, RuleRow>();
  for (const results of groups) {
    for (const r of results) {
      const prev = rules.get(r.id);
      rules.set(r.id, {
        id: r.id,
        impact: normalizeImpact(r.impact),
        help: r.help,
        helpUrl: r.helpUrl,
        scans: (prev?.scans ?? 0) + 1,
        nodes: (prev?.nodes ?? 0) + r.nodes.length,
      });
    }
  }
  return [...rules.values()].sort(
    (a, b) =>
      IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact) ||
      b.scans - a.scans ||
      b.nodes - a.nodes ||
      a.id.localeCompare(b.id),
  );
}

export function buildSummaryData(
  records: readonly ScanRecord[],
  generatedAt: string = new Date().toISOString(),
): SummaryData {
  const sorted = [...records].sort((a, b) => a.scanKey.localeCompare(b.scanKey));
  const scans: ScanRow[] = sorted.map((r) => ({
    scanKey: r.scanKey,
    path: pathOf(r.url),
    project: r.project,
    counts: r.counts,
    nodes: r.results.violations.reduce((sum, v) => sum + v.nodes.length, 0),
    needsReview: r.results.incomplete.length,
    status: statusOf(r),
    newRules: r.comparison?.new ?? [],
    fixedRules: r.comparison?.fixed ?? [],
  }));

  const violations = aggregateRules(sorted.map((r) => r.results.violations));
  const needsReview = aggregateRules(sorted.map((r) => r.results.incomplete));
  const byImpact: Record<Impact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const s of scans) for (const impact of IMPACT_ORDER) byImpact[impact] += s.counts[impact];

  return {
    generatedAt,
    axeVersion: sorted[0]?.results.testEngine.version ?? 'n/a',
    tags: sorted[0]?.tags ?? [],
    scans,
    violations,
    needsReview,
    totals: {
      scans: scans.length,
      violatedRules: violations.length,
      violationNodes: scans.reduce((sum, s) => sum + s.nodes, 0),
      byImpact,
      scansWithNewViolations: scans.filter(
        (s) => s.status === 'new' || s.status === 'baseline-missing',
      ).length,
      needsReviewRules: needsReview.length,
    },
  };
}

const STATUS_LABEL: Record<ScanStatus, string> = {
  clean: 'clean',
  known: 'known only',
  new: 'NEW',
  'baseline-missing': 'not in baseline',
  'not-compared': 'not compared',
};

function statusText(row: ScanRow): string {
  const parts = [STATUS_LABEL[row.status]];
  if (row.newRules.length) parts.push(`new: ${row.newRules.join(', ')}`);
  if (row.fixedRules.length) parts.push(`fixed: ${row.fixedRules.join(', ')}`);
  return parts.join('; ');
}

const mdEscape = (text: string): string => text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function mdRuleTable(rows: readonly RuleRow[], empty: string): string[] {
  if (rows.length === 0) return [empty];
  return [
    '| Rule | Impact | Scans | Nodes | Description |',
    '|---|---|---:|---:|---|',
    ...rows.map(
      (r) =>
        `| [\`${r.id}\`](${r.helpUrl}) | ${r.impact} | ${r.scans} | ${r.nodes} | ${mdEscape(r.help)} |`,
    ),
  ];
}

export function renderSummaryMarkdown(data: SummaryData): string {
  const t = data.totals;
  return [
    '# Accessibility summary (axe-core)',
    '',
    `Generated: ${data.generatedAt} · axe-core ${data.axeVersion} · tags: ${data.tags.map((x) => `\`${x}\``).join(', ')}`,
    '',
    `- **Scans:** ${t.scans}`,
    `- **Violated rules:** ${t.violatedRules} (${t.violationNodes} nodes) — critical ${t.byImpact.critical}, serious ${t.byImpact.serious}, moderate ${t.byImpact.moderate}, minor ${t.byImpact.minor}`,
    `- **Scans with violations not in the baseline:** ${t.scansWithNewViolations}`,
    `- **Rules that need manual review (axe "incomplete"):** ${t.needsReviewRules}`,
    '',
    '> axe covers only part of WCAG. Issues found by keyboard and manual testing are listed in `A11Y-REPORT.md`.',
    '',
    '## Scans',
    '',
    '| Scan key | Page | Critical | Serious | Moderate | Minor | Needs review | Baseline |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...data.scans.map(
      (s) =>
        `| \`${s.scanKey}\` | ${mdEscape(s.path)} | ${s.counts.critical} | ${s.counts.serious} | ${s.counts.moderate} | ${s.counts.minor} | ${s.needsReview} | ${mdEscape(statusText(s))} |`,
    ),
    '',
    '## Top violated rules',
    '',
    ...mdRuleTable(data.violations, '_No WCAG 2.1 A/AA violations detected._'),
    '',
    '## Needs manual review',
    '',
    ...mdRuleTable(data.needsReview, '_Nothing to review._'),
    '',
  ].join('\n');
}

const htmlEscape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function htmlRuleTable(caption: string, rows: readonly RuleRow[], empty: string): string {
  if (rows.length === 0) return `<p>${htmlEscape(empty)}</p>`;
  const body = rows
    .map(
      (r) =>
        `<tr><th scope="row"><a href="${htmlEscape(r.helpUrl)}"><code>${htmlEscape(r.id)}</code></a></th>` +
        `<td>${r.impact}</td><td class="num">${r.scans}</td><td class="num">${r.nodes}</td><td>${htmlEscape(r.help)}</td></tr>`,
    )
    .join('\n');
  return `<table><caption>${htmlEscape(caption)}</caption>
<thead><tr><th scope="col">Rule</th><th scope="col">Impact</th><th scope="col">Scans</th><th scope="col">Nodes</th><th scope="col">Description</th></tr></thead>
<tbody>
${body}
</tbody></table>`;
}

/** Shared accessible styling for generated pages (visible focus, AA contrast, dark mode). */
export const PAGE_STYLES = `
:root { color-scheme: light dark; --fg:#1b1f24; --bg:#ffffff; --muted:#4b5563; --line:#d0d7de; --accent:#0b5cad; }
@media (prefers-color-scheme: dark) { :root { --fg:#e6edf3; --bg:#0d1117; --muted:#a3acb7; --line:#30363d; --accent:#79b8ff; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px; font: 16px/1.5 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
main { max-width: 1100px; margin: 0 auto; }
a { color: var(--accent); }
a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.meta { color: var(--muted); }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 24px; }
caption { text-align: left; font-weight: 600; padding: 4px 0; }
th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.status-new { font-weight: 700; }
ul.stats { padding-left: 20px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

export function renderSummaryHtml(data: SummaryData): string {
  const t = data.totals;
  const scanRows = data.scans
    .map(
      (s) =>
        `<tr><th scope="row"><code>${htmlEscape(s.scanKey)}</code></th><td>${htmlEscape(s.path)}</td>` +
        IMPACT_ORDER.map((i) => `<td class="num">${s.counts[i]}</td>`).join('') +
        `<td class="num">${s.needsReview}</td>` +
        `<td${s.status === 'new' ? ' class="status-new"' : ''}>${htmlEscape(statusText(s))}</td></tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Accessibility summary | saucedemo a11y</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<main>
<h1>Accessibility summary (axe-core)</h1>
<p class="meta">Generated ${htmlEscape(data.generatedAt)} · axe-core ${htmlEscape(data.axeVersion)} · tags: ${data.tags.map((x) => `<code>${htmlEscape(x)}</code>`).join(', ')}</p>
<ul class="stats">
<li><strong>Scans:</strong> ${t.scans}</li>
<li><strong>Violated rules:</strong> ${t.violatedRules} (${t.violationNodes} nodes) — critical ${t.byImpact.critical}, serious ${t.byImpact.serious}, moderate ${t.byImpact.moderate}, minor ${t.byImpact.minor}</li>
<li><strong>Scans with violations not in the baseline:</strong> ${t.scansWithNewViolations}</li>
<li><strong>Rules that need manual review:</strong> ${t.needsReviewRules}</li>
</ul>
<p>axe covers only part of WCAG. Issues found by keyboard and manual testing are listed in <code>A11Y-REPORT.md</code>.</p>
<h2>Scans</h2>
<div class="table-wrap">
<table><caption>Violated rules per scan key and impact</caption>
<thead><tr><th scope="col">Scan key</th><th scope="col">Page</th><th scope="col">Critical</th><th scope="col">Serious</th><th scope="col">Moderate</th><th scope="col">Minor</th><th scope="col">Needs review</th><th scope="col">Baseline</th></tr></thead>
<tbody>
${scanRows}
</tbody></table>
</div>
<h2>Top violated rules</h2>
<div class="table-wrap">${htmlRuleTable('Rules by impact and frequency', data.violations, 'No WCAG 2.1 A/AA violations detected.')}</div>
<h2>Needs manual review</h2>
<div class="table-wrap">${htmlRuleTable('Rules axe could not decide (incomplete)', data.needsReview, 'Nothing to review.')}</div>
</main>
</body>
</html>
`;
}
