/**
 * Regenerates a11y-baseline.json from the current state of the application.
 *
 * 1. Clears reports/a11y-results.
 * 2. Runs the a11y suite in the baseline projects with UPDATE_A11Y_BASELINE=1
 *    (scans record results but never assert; self-tests with injected violations are skipped).
 * 3. Builds a deterministic baseline (sorted keys and rule ids) from the recorded scans.
 *
 * Usage: npm run baseline:update
 */
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import {
  BASELINE_FILE,
  BASELINE_PROJECTS,
  buildBaseline,
  describeBaselineChanges,
  loadBaseline,
  serializeBaseline,
  UPDATE_BASELINE_ENV,
} from '../src/a11y/baseline.ts';
import { readScanRecords, RESULTS_DIR } from '../src/a11y/records.ts';

const previous = loadBaseline();
rmSync(RESULTS_DIR, { recursive: true, force: true });

const args = [
  'playwright',
  'test',
  'tests/a11y',
  ...BASELINE_PROJECTS.map((p) => `--project=${p}`),
  '--retries=1',
];
console.log(`> npx ${args.join(' ')}  (${UPDATE_BASELINE_ENV}=1)`);
const run = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, [UPDATE_BASELINE_ENV]: '1' },
});
if (run.status !== 0) {
  console.error('\nScans failed — baseline was NOT updated.');
  process.exit(run.status ?? 1);
}

const records = readScanRecords().filter((r) => BASELINE_PROJECTS.includes(r.project));
if (records.length === 0) {
  console.error('No scan records found — baseline was NOT updated.');
  process.exit(1);
}

const next = buildBaseline(
  records.map((r) => ({ scanKey: r.scanKey, ruleIds: r.results.violations.map((v) => v.id) })),
);
writeFileSync(BASELINE_FILE, serializeBaseline(next), 'utf8');

const changes = describeBaselineChanges(previous, next);
console.log(`\nWrote ${BASELINE_FILE} (${Object.keys(next).length} scan keys).`);
console.log(changes.length ? `Changes:\n${changes.join('\n')}` : 'No changes.');
