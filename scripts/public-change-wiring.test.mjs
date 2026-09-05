import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('full deterministic verification retains every public-change gate independently', async () => {
  const manifest = JSON.parse(await readFile('verification/public-change-gates.json', 'utf8'));
  assert.equal(new Set(manifest.workItems).size, 34);
  assert.deepEqual(manifest.checks, [
    'public-signatures', 'breaking-changes', 'workstream-ownership', 'consumer-bundles', 'consumer-install',
  ]);

  const result = spawnSync(process.execPath, ['scripts/verify.mjs', '--full', '--explain'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  const unitIDs = new Set(plan.units.map(({ id }) => id));
  for (const check of ['public-signatures', 'breaking-changes', 'workstream-ownership', 'consumer-install']) {
    assert.ok(unitIDs.has(check), `missing full verification unit: ${check}`);
  }
  const bundleUnits = plan.units.filter(({ id }) => id.startsWith('consumer-bundles:'));
  const bundlePackages = new Set(bundleUnits.map(({ id }) => id.split(':')[1]));
  assert.deepEqual(bundlePackages, new Set(['core', 'chart', 'form', 'temporal', 'virtual', 'terminal', 'tabular', 'dom', 'vue']));
  assert.ok(bundleUnits.some(({ id }) => id === 'consumer-bundles:vue:1-of-4'));
  assert.ok(bundleUnits.some(({ id }) => id === 'consumer-bundles:virtual'));
  assert.ok(plan.stages.includes('consumer verification'));
  assert.equal(plan.stages.includes('public change gates'), false);
});
