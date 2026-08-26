import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';

const contract = JSON.parse(await readFile('testing/controlled-reconciliation.json', 'utf8'));
assert.equal(contract.schemaVersion, 1, 'Unsupported controlled reconciliation contract.');
assert.deepEqual(contract.policy, {
  selection: 'prune-to-domain-order',
  current: 'retain-eligible-else-selected-else-first-eligible',
  disabledSelection: 'preserve',
  controlledNotification: 'emit-update-proposal',
  ownership: 'owner-must-apply',
});

const entries = contract.components;
assert.ok(Array.isArray(entries) && entries.length > 0, 'Controlled reconciliation components are required.');
assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length, 'Component IDs must be unique.');

const sourceFiles = (await readdir('src', { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => `src/${entry.name}`);
const actual = [];
for (const sourcePath of sourceFiles) {
  const source = await readFile(sourcePath, 'utf8');
  if (source.includes('reconcileCollectionState') && source.includes('useControlledStateInvariant')) {
    actual.push(sourcePath);
  }
}
assert.deepEqual(
  [...entries.map((entry) => entry.source), ...contract.excluded.map((entry) => entry.source)].sort(),
  actual.sort(),
  'Every controlled collection reconciler must have exactly one public contract entry.',
);
for (const exclusion of contract.excluded) {
  assert.equal(typeof exclusion.reason, 'string', `${exclusion.source}: exclusion reason is required.`);
  assert.ok(exclusion.reason.length > 0, `${exclusion.source}: exclusion reason must not be empty.`);
}

for (const entry of entries) {
  assert.match(entry.id, /^[a-z]+(?:-[a-z]+)*$/, `${entry.id}: invalid component ID.`);
  assert.ok(Array.isArray(entry.models) && entry.models.length > 0, `${entry.id}: model list is required.`);
  assert.equal(new Set(entry.models).size, entry.models.length, `${entry.id}: model list must be unique.`);
  const source = await readFile(entry.source, 'utf8');
  for (const model of [...entry.models, ...(entry.dependentResets ?? [])]) {
    assert.equal(
      source.includes(`emit('update:${model}'`),
      true,
      `${entry.id}: reconciled ${model} must notify its controlled owner.`,
    );
  }
}

for (const evidence of contract.evidence) {
  assert.equal((await stat(evidence)).isFile(), true, `Missing controlled reconciliation evidence: ${evidence}`);
}

console.log(`controlled reconciliation contract: ${entries.length} Vue components, ${contract.evidence.length} evidence files`);
