import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';

test('full deterministic verification retains every public-change gate independently', async () => {
  const result = spawnSync(process.execPath, ['scripts/verify.mjs', '--full', '--explain'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  const unitIDs = new Set(plan.units.map(({ id }) => id));
  for (const check of ['public-signatures', 'breaking-changes', 'consumer-install']) {
    assert.ok(unitIDs.has(check), `missing full verification unit: ${check}`);
  }
  const bundleUnits = plan.units.filter(({ id }) => id.startsWith('consumer-bundles:'));
  const bundlePackages = new Set(bundleUnits.map(({ id }) => id.split(':')[1]));
  const graph = await loadPublishedPackageGraph();
  assert.deepEqual(bundlePackages, new Set(graph.packages.map(entry => entry.directory)));
  assert.ok(bundleUnits.some(({ id }) => /^consumer-bundles:vue:1-of-\d+$/u.test(id)));
  assert.ok(bundleUnits.some(({ id }) => id === 'consumer-bundles:virtual'));
  assert.ok(plan.stages.includes('consumer verification'));
  assert.equal(plan.stages.includes('public change gates'), false);
});
