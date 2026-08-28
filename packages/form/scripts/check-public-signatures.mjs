import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectPublicSignatures } from './lib/public-signatures.mjs';

const current = await collectPublicSignatures();
const stored = JSON.parse(await readFile('testing/public-signatures.json', 'utf8'));
assert.equal(stored.schemaVersion, 3);
assert.equal(stored.package, current.package);
assert.deepEqual(stored.exports, current.exports);
assert.equal(stored.fingerprint, current.fingerprint);
assert.deepEqual(stored.files, current.files);
