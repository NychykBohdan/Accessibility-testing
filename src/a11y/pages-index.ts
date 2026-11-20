import { PAGE_STYLES, type SummaryData } from './summary.ts';

/** Minimal shape of Playwright's JSON reporter output that the index page needs. */
export interface PlaywrightJsonReport {
  readonly stats: {
    readonly expected: number;
    readonly unexpected: number;
    readonly flaky: number;
    readonly skipped: number;
  };
  readonly suites: readonly PlaywrightJsonSuite[];
}

interface PlaywrightJsonSuite {
  readonly specs?: readonly { readonly tests: readonly { readonly expectedStatus: string }[] }[];
  readonly suites?: readonly PlaywrightJsonSuite[];
}

export interface TestStats {
  readonly passed: number;
  readonly failed: number;
  readonly flaky: number;
  readonly skipped: number;
  /** Tests marked test.fail() — documented accessibility defects that reproduce as expected. */
  readonly knownDefects: number;
}

export function countTestStats(report: PlaywrightJsonReport): TestStats {
  let knownDefects = 0;
  const walk = (suite: PlaywrightJsonSuite): void => {
    for (const spec of suite.specs ?? []) {
      knownDefects += spec.tests.filter((t) => t.expectedStatus === 'failed').length;
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites) walk(suite);

  const { expected, unexpected, flaky, skipped } = report.stats;
  return { passed: expected - knownDefects, failed: unexpected, flaky, skipped, knownDefects };
}

export interface IndexPageInput {
  readonly summary: SummaryData;
  readonly tests: TestStats | null;
  /** Link to the repository (A11Y-REPORT.md, README) — omitted when unknown. */
  readonly repoUrl: string | null;
  readonly runUrl: string | null;
}

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderIndexHtml({ summary, tests, repoUrl, runUrl }: IndexPageInput): string {
  const t = summary.totals;
  const testItems = tests
    ? `<li><strong>Tests:</strong> ${tests.passed} passed, ${tests.failed} failed, ${tests.flaky} flaky, ${tests.skipped} skipped</li>
<li><strong>Documented accessibility defects reproduced (<code>test.fail</code>):</strong> ${tests.knownDefects}</li>`
    : '';
  const repoLinks = repoUrl
    ? `<li><a href="${esc(repoUrl)}/blob/main/A11Y-REPORT.md">A11Y-REPORT.md</a> — issues found by keyboard and manual testing</li>
<li><a href="${esc(repoUrl)}">Source code and README</a></li>`
    : '';
  const run = runUrl ? ` · <a href="${esc(runUrl)}">CI run</a>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>saucedemo accessibility testing | reports</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<main>
<h1>saucedemo.com accessibility testing</h1>
<p class="meta">WCAG 2.1 AA · Playwright + axe-core · generated ${esc(summary.generatedAt)}${run}</p>
<h2>Results</h2>
<ul class="stats">
${testItems}
<li><strong>axe scans:</strong> ${t.scans}, violated rules: ${t.violatedRules}, scans with new violations: ${t.scansWithNewViolations}</li>
<li><strong>Rules that need manual review:</strong> ${t.needsReviewRules}</li>
</ul>
<h2>Reports</h2>
<ul>
<li><a href="report/index.html">Playwright HTML report</a> — every test with traces, screenshots and attached axe JSON</li>
<li><a href="a11y-summary.html">Accessibility summary</a> — axe results per page and UI state</li>
${repoLinks}
</ul>
</main>
</body>
</html>
`;
}
