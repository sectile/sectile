import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('all downstream public/runtime work items retain every public-change gate', async () => {
  const manifest = JSON.parse(await readFile('verification/public-change-gates.json', 'utf8'));
  assert.equal(new Set(manifest.workItems).size, 34);
  assert.deepEqual(manifest.checks, [
    'public-signatures', 'breaking-changes', 'workstream-ownership', 'consumer-bundles', 'consumer-install',
  ]);
  const verifySource = await readFile('scripts/verify.mjs', 'utf8');
  assert.match(verifySource, /check-public-change-gates\.mjs/u);
  assert.match(verifySource, /'--full'/u);
});
