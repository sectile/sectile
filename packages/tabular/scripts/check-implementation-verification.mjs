import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

function writeEvidence() {
  const result = spawnSync(process.execPath, ['scripts/write-implementation-verification.mjs'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

writeEvidence();
const first = await readFile('verification/implementation-verification.json');
writeEvidence();
const second = await readFile('verification/implementation-verification.json');
assert.deepEqual(second, first, 'implementation evidence changed across identical runs');
console.log(JSON.stringify({ status: 'passed', fingerprint: createHash('sha256').update(first).digest('hex') }, null, 2));
