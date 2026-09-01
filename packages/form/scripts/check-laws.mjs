import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const registry = JSON.parse(await readFile('testing/law-registry.json', 'utf8'));
const evidence = JSON.parse(await readFile('testing/law-evidence.json', 'utf8'));
const expectedIDs = Array.from({ length: 11 }, (_, index) => `FRM-${String(index + 1).padStart(2, '0')}`);
const ids = registry.laws.map((law) => law.id);
assert.deepEqual(ids, expectedIDs);
assert.equal(new Set(ids).size, ids.length);
assert.deepEqual(Object.keys(evidence.evidence).sort(), [...ids].sort());
for (const law of registry.laws) {
  const path = evidence.evidence[law.id];
  assert.equal((await stat(path)).isFile(), true);
  assert.equal((await readFile(path, 'utf8')).includes(law.id), true, `${path} does not name ${law.id}`);
}
