import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateRunnerReport } from './check.mjs';
import { compatibilityMetadata } from './provenance.mjs';
import { writeJSONAtomic } from './session-log.mjs';

export function performanceBaselineID(report) {
  const metadata = compatibilityMetadata(report.provenance);
  return createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
}

export function performanceBaselinePath(directory, report) {
  return resolve(directory, `${performanceBaselineID(report)}.json`);
}

export async function selectPerformanceBaseline({ current, explicitPath = null, directory }) {
  if (explicitPath !== null) {
    return Object.freeze({ path: resolve(explicitPath), report: await readReport(explicitPath) });
  }

  const partitionedPath = performanceBaselinePath(directory, current);
  const partitioned = await tryReadReport(partitionedPath);
  if (partitioned === null) {
    throw new Error(
      `No compatible performance baseline exists for environment ${performanceBaselineID(current)}. `
        + 'Run pnpm performance:record in this exact runtime and hardware environment.',
    );
  }
  assert.deepEqual(
    compatibilityMetadata(partitioned.provenance),
    compatibilityMetadata(current.provenance),
    `performance baseline ${partitionedPath} does not match its environment partition`,
  );
  return Object.freeze({ path: partitionedPath, report: partitioned });
}

export async function promotePerformanceReport({ reportPath, directory }) {
  const report = await readReport(reportPath);
  validateRunnerReport(report);
  assert.notEqual(report.runner.certification, false, 'targeted performance screenings cannot become authoritative baselines');
  assert.equal(report.runner.quick, false, 'quick performance reports cannot become authoritative baselines');
  const baselinePath = performanceBaselinePath(directory, report);
  const existing = await tryReadReport(baselinePath);
  if (existing !== null) {
    assert.deepEqual(existing, report, `performance baseline ${baselinePath} already contains different evidence`);
    return Object.freeze({ path: baselinePath, report, created: false });
  }
  await writeJSONAtomic(baselinePath, report);
  return Object.freeze({ path: baselinePath, report, created: true });
}

async function readReport(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function tryReadReport(path) {
  try {
    return await readReport(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}
