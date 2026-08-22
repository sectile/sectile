import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { semanticFingerprint } from './lib/repository.mjs';
const publicAPI = JSON.parse(await readFile('testing/public-api.json', 'utf8'));
const stored = JSON.parse(await readFile('testing/api-stability.json', 'utf8'));
assert.equal(stored.contractVersion, 23);
assert.equal(stored.publicAPISHA256, semanticFingerprint(publicAPI));
console.log(JSON.stringify({ status: 'passed', ...stored }, null, 2));
