import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('verification/form-scenarios.json', 'utf8'));
assert.equal(manifest.schemaVersion, 1, 'Unsupported Form scenario schema.');
assert.ok(Array.isArray(manifest.scenarios), 'Form scenarios must be an array.');
assert.deepEqual(
  manifest.scenarios.map(({ id }) => id),
  Array.from({ length: 21 }, (_, index) => index + 1),
  'Form scenarios must cover the specification exactly once and in order.',
);

for (const scenario of manifest.scenarios) {
  assert.equal(typeof scenario.description, 'string', `Scenario ${scenario.id} needs a description.`);
  assert.ok(scenario.description.length > 0, `Scenario ${scenario.id} needs a description.`);
  assert.ok(Array.isArray(scenario.evidence) && scenario.evidence.length > 0,
    `Scenario ${scenario.id} needs executable evidence.`);
  const evidenceKeys = new Set();
  for (const witness of scenario.evidence) {
    assert.equal(typeof witness.file, 'string', `Scenario ${scenario.id} evidence needs a file.`);
    const source = await readFile(witness.file, 'utf8');
    const needle = witness.test === undefined ? witness.contains : `test('${witness.test}'`;
    assert.equal(typeof needle, 'string', `Scenario ${scenario.id} evidence needs test or contains.`);
    assert.ok(source.includes(needle),
      `Scenario ${scenario.id} evidence is stale: ${witness.file} does not contain ${needle}.`);
    const key = `${witness.file}\0${needle}`;
    assert.equal(evidenceKeys.has(key), false, `Scenario ${scenario.id} repeats evidence ${key}.`);
    evidenceKeys.add(key);
  }
}

console.log('Form scenario contract: all 21 specification scenarios have executable evidence');
