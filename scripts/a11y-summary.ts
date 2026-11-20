/**
 * Builds a human-readable summary of all axe scans.
 *
 * Input:  reports/a11y-results/*.json (written by every a11yScan call)
 * Output: reports/a11y-summary.md and reports/a11y-summary.html;
 *         the Markdown is also appended to $GITHUB_STEP_SUMMARY when it is set (GitHub Actions).
 *
 * Usage: npm test && npm run a11y:summary
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readScanRecords, RESULTS_DIR } from '../src/a11y/records.ts';
import { buildSummaryData, renderSummaryHtml, renderSummaryMarkdown } from '../src/a11y/summary.ts';

const records = readScanRecords();
if (records.length === 0) {
  console.error(
    `No scan records in ${RESULTS_DIR} — run the a11y tests first (npm run test:a11y).`,
  );
  process.exit(1);
}

const data = buildSummaryData(records);
const markdown = renderSummaryMarkdown(data);
const outDir = path.resolve('reports');
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'a11y-summary.md'), markdown, 'utf8');
writeFileSync(path.join(outDir, 'a11y-summary.html'), renderSummaryHtml(data), 'utf8');

const stepSummary = process.env.GITHUB_STEP_SUMMARY;
if (stepSummary) appendFileSync(stepSummary, `${markdown}\n`, 'utf8');

const t = data.totals;
console.log(
  `a11y summary: ${t.scans} scans, ${t.violatedRules} violated rules, ` +
    `${t.scansWithNewViolations} scans with new violations, ${t.needsReviewRules} rules to review.`,
);
console.log(
  `Wrote reports/a11y-summary.md and reports/a11y-summary.html${stepSummary ? ' (+ GitHub step summary)' : ''}.`,
);
