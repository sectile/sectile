import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const expectedIDs = Array.from({ length: 8 }, (_, index) => `CHT-${String(index + 1).padStart(2, '0')}`);
const registry = JSON.parse(await readFile('testing/law-registry.json', 'utf8'));
const evidence = JSON.parse(await readFile('testing/law-evidence.json', 'utf8'));

assert.equal(registry.schemaVersion, 1);
assert.equal(evidence.schemaVersion, 1);
assert.equal(Array.isArray(registry.laws), true);
const ids = registry.laws.map((law) => law.id);
assert.deepEqual(ids, expectedIDs);
assert.equal(new Set(ids).size, ids.length);
assert.deepEqual(Object.keys(evidence.evidence).sort(), [...expectedIDs].sort());

for (const law of registry.laws) {
  assert.equal(law.theory, 'chart');
  assert.equal(typeof law.statement, 'string');
  assert.ok(law.statement.length > 0);
  const path = evidence.evidence[law.id];
  assert.match(path, /^tests\/.+\.test\.mjs$/);
  assert.equal((await stat(path)).isFile(), true);
  assert.equal((await readFile(path, 'utf8')).includes(law.id), true, `${path} does not name ${law.id}`);
}
