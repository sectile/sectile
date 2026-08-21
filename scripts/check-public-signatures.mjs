import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectPublicSignatures } from './lib/public-signatures.mjs';
const current = await collectPublicSignatures();
const stored = JSON.parse(await readFile('testing/public-signatures.json', 'utf8'));
assert.equal(stored.fingerprint, current.fingerprint);
assert.deepEqual(stored.files, current.files);
console.log(JSON.stringify({ status: 'passed', fingerprint: current.fingerprint }, null, 2));
