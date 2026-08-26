import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const registry = JSON.parse(await readFile('testing/law-registry.json', 'utf8'));
const evidence = JSON.parse(await readFile('testing/law-evidence.json', 'utf8'));
const ids = registry.laws.map((law) => law.id);
assert.equal(new Set(ids).size, ids.length);
assert.equal(ids.length, 58);
assert.deepEqual(Object.keys(evidence.evidence).sort(), [...ids].sort());
const evidenceFiles = new Set(Object.values(evidence.evidence));
for (const path of evidenceFiles) assert.equal((await stat(path)).isFile(), true);
for (const law of registry.laws) {
  const path = evidence.evidence[law.id];
  const source = await readFile(path, 'utf8');
  assert.equal(source.includes(law.id), true, `${path} does not name ${law.id}`);
}
assert.equal((await stat(evidence.differentialEvidence)).isFile(), true);
console.log(JSON.stringify({ status: 'passed', laws: ids.length, evidenceFiles: evidenceFiles.size + 1 }, null, 2));
