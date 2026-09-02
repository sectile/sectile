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
  assert.deepEqual(
    manifest.checks.map((check) => ({
      check,
      stage: ({
        'public-signatures': 'public signatures',
        'breaking-changes': 'breaking changes',
        'workstream-ownership': 'workstream ownership',
        'consumer-bundles': 'consumer bundles',
        'consumer-install': 'consumer install',
      })[check],
    })),
    [
      { check: 'public-signatures', stage: 'public signatures' },
      { check: 'breaking-changes', stage: 'breaking changes' },
      { check: 'workstream-ownership', stage: 'workstream ownership' },
      { check: 'consumer-bundles', stage: 'consumer bundles' },
      { check: 'consumer-install', stage: 'consumer install' },
    ],
  );
  for (const stage of ['public signatures', 'breaking changes', 'workstream ownership', 'consumer bundles', 'consumer install']) {
    assert.ok(plan.stages.includes(stage), `missing full verification stage: ${stage}`);
  }
  assert.equal(plan.stages.includes('public change gates'), false);
});
