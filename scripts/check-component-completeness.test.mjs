import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('generic Core support subpaths do not require host component projections', () => {
  const result = spawnSync(process.execPath, ['scripts/check-component-completeness.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /component completeness contract:/);
});
