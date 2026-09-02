import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('performance policy separates default structural evidence from timing certification', async () => {
  const manifest = JSON.parse(await readFile('verification/performance/gates.json', 'utf8'));
  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(manifest.defaultEvidence, ['complexity', 'deterministicWork', 'resourceBounds']);
  assert.equal(manifest.timingEvidenceWhen.length, 3);
  assert.equal(manifest.certificationWhen.length, 3);
  const result = spawnSync(process.execPath, ['scripts/check-performance-gates.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('packages without registered timing workloads skip instead of running unrelated suites', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', 'chart',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'skipped');
  assert.deepEqual(output.targetPackages, ['chart']);
});

test('work-item evidence requires a package target and output artifact', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', 'core', '--work-item', 'WI-013',
  ], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --output/u);
});
