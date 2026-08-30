import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectPublicSignatures } from './lib/public-signatures.mjs';
import { publishedPackageDirectories } from './lib/published-packages.mjs';

const packageDirectories = publishedPackageDirectories
  .map((name) => resolve('packages', name));

for (const packageDirectory of packageDirectories) {
  const current = await collectPublicSignatures(packageDirectory);
  const stored = JSON.parse(await readFile(resolve(packageDirectory, 'testing/public-signatures.json'), 'utf8'));
  assert.equal(stored.schemaVersion, 3);
  assert.equal(stored.package, current.package);
  assert.deepEqual(stored.exports, current.exports);
  assert.equal(stored.fingerprint, current.fingerprint);
  assert.deepEqual(stored.files, current.files);
}

console.log(`public signatures passed: ${packageDirectories.length} packages`);
