import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSyncPortable } from '../../../scripts/lib/portable-process.mjs';

const first = spawnSyncPortable('pnpm', ['--silent', 'run', 'test:model'], { stdio: 'inherit' });
assert.equal(first.status, 0);
const firstEvidence = await readFile('verification/model.json');
const second = spawnSyncPortable('pnpm', ['--silent', 'run', 'test:model'], { stdio: 'inherit' });
assert.equal(second.status, 0);
const secondEvidence = await readFile('verification/model.json');
assert.deepEqual(secondEvidence, firstEvidence);
console.log(JSON.stringify({
  status: 'passed',
  deterministic: true,
  sha256: createHash('sha256').update(firstEvidence).digest('hex'),
}, null, 2));
