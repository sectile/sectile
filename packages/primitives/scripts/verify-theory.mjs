import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const expected = await readFile('verification/theory-verification.json');
const run = spawnSync('python3', ['verification/theory-verifier.py'], { encoding: null, maxBuffer: 32 * 1024 * 1024 });
assert.equal(run.status, 0, run.stderr?.toString() ?? 'theory verifier failed');
assert.deepEqual(run.stdout, expected);
console.log(JSON.stringify({ status: 'passed', bytes: expected.length }, null, 2));
