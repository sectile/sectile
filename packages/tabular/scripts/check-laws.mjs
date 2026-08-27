import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registry = JSON.parse(await readFile('testing/law-registry.json', 'utf8'));
const evidence = JSON.parse(await readFile('testing/law-evidence.json', 'utf8'));
const ids = registry.laws.map((law) => law.id);
assert.equal(new Set(ids).size, ids.length);
assert.deepEqual(Object.keys(evidence.evidence).sort(), [...ids].sort());
for (const id of ids) {
  const path = evidence.evidence[id];
  const source = await readFile(path, 'utf8');
  assert.equal(source.includes(id), true, `${path} does not name ${id}`);
}
console.log(JSON.stringify({ status: 'passed', laws: ids.length, evidenceFiles: new Set(Object.values(evidence.evidence)).size }, null, 2));
