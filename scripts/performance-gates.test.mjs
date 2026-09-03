import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('performance policy separates default structural evidence from timing certification', async () => {
  const manifest = JSON.parse(await readFile('verification/performance/gates.json', 'utf8'));
  assert.equal(manifest.schemaVersion, 3);
  assert.deepEqual(manifest.selectorAxes, ['owner', 'type', 'domain', 'scale', 'evidence']);
  assert.deepEqual(manifest.defaultEvidence, ['complexity', 'deterministicWork', 'resourceBounds']);
  assert.equal(manifest.timingEvidenceWhen.length, 3);
  assert.equal(manifest.certificationWhen.length, 3);
  const result = spawnSync(process.execPath, ['scripts/check-performance-gates.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('packages without registered timing workloads skip instead of running unrelated suites', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', 'form',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'skipped');
  assert.deepEqual(output.targetPackages, ['form']);
});

test('Chart is a first-class targeted performance owner', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', 'chart', '--type', 'projection', '--explain',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.measurementProfile, 'screening');
  assert.deepEqual(output.selection.owners, ['chart']);
  assert.deepEqual(output.selection.types, ['projection']);
  assert.deepEqual(output.selection.scales, ['representative']);
  assert.deepEqual(output.selection.evidence, ['timing']);
});

test('certification rigor is independent from selected workload scope', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', '--certify', 'chart', '--type', 'projection', '--explain',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.certification, true);
  assert.equal(output.measurementProfile, 'certification');
  assert.equal(output.processCount, 10);
  assert.deepEqual(output.selection.owners, ['chart']);
  assert.deepEqual(output.selection.types, ['projection']);
  assert.deepEqual(output.selection.scales, []);
  assert.deepEqual(output.selection.evidence, []);
});

test('authoritative records can use the screening measurement profile', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'record', 'chart', '--profile', 'screening', '--scale', 'representative', '--evidence', 'timing', '--explain',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.certification, true);
  assert.equal(output.measurementProfile, 'screening');
  assert.equal(output.processCount, 10);
  assert.deepEqual(output.selection.owners, ['chart']);
  assert.deepEqual(output.selection.scales, ['representative']);
  assert.deepEqual(output.selection.evidence, ['timing']);
});

test('worker separates allocation and retention evidence lanes', () => {
  const allocation = runWorker('allocation');
  const allocationMetric = allocation.metrics.find(({ id }) => id === 'core:controller:handle');
  assert.notEqual(allocationMetric, undefined);
  assert.equal(allocationMetric.samples, null);
  assert.notEqual(allocationMetric.heap.allocation, null);
  assert.equal(allocationMetric.heap.retention, null);
  assert.equal(typeof allocationMetric.heap.peakDelta, 'number');
  assert.equal(allocationMetric.heap.retainedDelta, null);

  const retention = runWorker('retention');
  const retentionMetric = retention.metrics.find(({ id }) => id === 'core:controller:handle');
  assert.notEqual(retentionMetric, undefined);
  assert.equal(retentionMetric.samples, null);
  assert.equal(retentionMetric.heap.allocation, null);
  assert.notEqual(retentionMetric.heap.retention, null);
  assert.equal(retentionMetric.heap.peakDelta, null);
  assert.equal(typeof retentionMetric.heap.retainedDelta, 'number');
  assert.equal(retention.metrics.some(({ id }) => id === 'core:revision:apply'), false);

  for (const report of [allocation, retention]) {
    const calibration = report.metrics.find(({ id }) => id === 'runner:calibration');
    assert.notEqual(calibration, undefined);
    assert.notEqual(calibration.samples, null);
  }
});

test('work-item evidence requires a package target and output artifact', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', 'core', '--work-item', 'WI-013',
  ], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --output/u);
});

function runWorker(evidence) {
  const result = spawnSync(process.execPath, ['--expose-gc', 'scripts/performance/worker.mjs'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SECTILE_PERFORMANCE_QUICK: '1',
      SECTILE_PERFORMANCE_PROFILE: 'screening',
      SECTILE_PERFORMANCE_PACKAGES: 'core',
      SECTILE_PERFORMANCE_TYPES: 'transition',
      SECTILE_PERFORMANCE_DOMAINS: 'runtime',
      SECTILE_PERFORMANCE_SCALES: 'representative',
      SECTILE_PERFORMANCE_EVIDENCE: evidence,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
