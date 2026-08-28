import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('every planned runtime-changing downstream work item is performance-gated', async () => {
  const manifest = JSON.parse(await readFile('verification/performance/gates.json', 'utf8'));
  assert.equal(new Set(manifest.workItems).size, 34);
  assert.deepEqual(manifest.requiredEvidence, [
    'latency', 'allocation', 'retainedHeap', 'scaling', 'packageFootprint',
  ]);
  const result = spawnSync(process.execPath, ['scripts/check-performance-gates.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('work-item evidence requires an output artifact', () => {
  const result = spawnSync(process.execPath, [
    'scripts/performance/run.mjs', 'check', '--work-item', 'WI-013',
  ], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --output/u);
});
