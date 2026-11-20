/**
 * Assembles the GitHub Pages site in ./site:
 *   site/index.html          — landing page with key numbers and links
 *   site/report/             — Playwright HTML report (copied from ./playwright-report)
 *   site/a11y-summary.html   — axe summary (run `npm run a11y:summary` first)
 *
 * Usage: npm test; npm run a11y:summary; npm run pages:build
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  countTestStats,
  type PlaywrightJsonReport,
  renderIndexHtml,
} from '../src/a11y/pages-index.ts';
import { readScanRecords } from '../src/a11y/records.ts';
import { buildSummaryData } from '../src/a11y/summary.ts';

const SITE = path.resolve('site');
const PLAYWRIGHT_REPORT = path.resolve('playwright-report');
const SUMMARY_HTML = path.resolve('reports', 'a11y-summary.html');
const RESULTS_JSON = path.resolve('reports', 'results.json');

rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });

if (existsSync(PLAYWRIGHT_REPORT)) {
  cpSync(PLAYWRIGHT_REPORT, path.join(SITE, 'report'), { recursive: true });
} else {
  console.warn('playwright-report/ not found — the report link will be broken.');
}
if (existsSync(SUMMARY_HTML)) {
  cpSync(SUMMARY_HTML, path.join(SITE, 'a11y-summary.html'));
} else {
  console.warn('reports/a11y-summary.html not found — run `npm run a11y:summary` first.');
}

const tests = existsSync(RESULTS_JSON)
  ? countTestStats(JSON.parse(readFileSync(RESULTS_JSON, 'utf8')) as PlaywrightJsonReport)
  : null;

const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
const repoUrl =
  process.env.REPO_URL ??
  (GITHUB_SERVER_URL && GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}` : null);
const runUrl = repoUrl && GITHUB_RUN_ID ? `${repoUrl}/actions/runs/${GITHUB_RUN_ID}` : null;

writeFileSync(
  path.join(SITE, 'index.html'),
  renderIndexHtml({ summary: buildSummaryData(readScanRecords()), tests, repoUrl, runUrl }),
  'utf8',
);
console.log(`Built ${SITE} (index.html, report/, a11y-summary.html).`);
