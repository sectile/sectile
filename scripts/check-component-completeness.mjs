import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packagePaths = [
  'packages/primitives/package.json',
  'packages/dom/package.json',
  'packages/terminal/package.json',
];
const supportSubpaths = new Set([
  'package.json', 'sequence', 'range', 'tree', 'result', 'revision', 'interaction',
  'keyboard', 'layout', 'node',
]);
const migrationBaselineIDs = new Set([
  'accordion', 'alert-dialog', 'calendar', 'carousel', 'checkbox', 'combobox',
  'dialog', 'disclosure', 'feed', 'grid', 'listbox', 'menu', 'menu-button',
  'menubar', 'multi-thumb-slider', 'radio-group', 'slider', 'spin-button',
  'switch', 'tabs', 'text', 'toggle-button', 'toolbar', 'tooltip', 'tree-grid',
  'tree-view', 'window-splitter',
]);

const manifest = JSON.parse(await readFile('verification/component-completeness.json', 'utf8'));
assert.equal(manifest.schemaVersion, 1, 'Unsupported component completeness schema.');
assert.ok(Array.isArray(manifest.requirements) && manifest.requirements.length > 0,
  'Completeness requirements must be declared.');

const requirementSet = new Set(manifest.requirements);
assert.equal(requirementSet.size, manifest.requirements.length,
  'Completeness requirements must be unique.');

const packageComponents = [];
for (const path of packagePaths) {
  const pkg = JSON.parse(await readFile(path, 'utf8'));
  const components = Object.keys(pkg.exports)
    .filter((subpath) => subpath.startsWith('./'))
    .map((subpath) => subpath.slice(2))
    .filter((subpath) => !supportSubpaths.has(subpath))
    .sort();
  packageComponents.push({ path, components });
}

const canonical = packageComponents[0].components;
for (const { path, components } of packageComponents.slice(1)) {
  assert.deepEqual(components, canonical,
    `${path} must expose the same component subpaths as @sectile/primitives.`);
}

const entries = manifest.components;
assert.ok(Array.isArray(entries), 'Component completeness entries must be an array.');
const ids = entries.map((entry) => entry.id);
assert.equal(new Set(ids).size, ids.length, 'Component completeness IDs must be unique.');
assert.deepEqual([...ids].sort(), canonical,
  'Every public component subpath must have exactly one completeness entry.');

for (const entry of entries) {
  assert.match(entry.id, /^[a-z]+(?:-[a-z]+)*$/, `${entry.id}: invalid component ID.`);
  assert.match(entry.family, /^[a-z]+(?:-[a-z]+)*$/, `${entry.id}: invalid family.`);
  assert.ok(
    entry.standard.startsWith('https://www.w3.org/WAI/ARIA/apg/patterns/')
      || entry.standard.startsWith('docs/'),
    `${entry.id}: standard must be an APG URL or repository document anchor.`,
  );
  assert.ok(Array.isArray(entry.capabilities) && entry.capabilities.length >= 2,
    `${entry.id}: declare at least two semantic capabilities.`);
  assert.equal(new Set(entry.capabilities).size, entry.capabilities.length,
    `${entry.id}: capabilities must be unique.`);
}

const gaps = manifest.migrationGaps;
assert.equal(typeof gaps, 'object', 'Migration gaps must be an object.');
for (const [id, componentGaps] of Object.entries(gaps)) {
  assert.ok(ids.includes(id), `${id}: migration gap does not identify a public component.`);
  assert.ok(migrationBaselineIDs.has(id),
    `${id}: new public components cannot enter with migration gaps.`);
  assert.ok(Array.isArray(componentGaps) && componentGaps.length > 0,
    `${id}: migration gap list must not be empty.`);
  assert.equal(new Set(componentGaps).size, componentGaps.length,
    `${id}: migration gaps must be unique.`);
  for (const requirement of componentGaps) {
    assert.ok(requirementSet.has(requirement), `${id}: unknown gap ${requirement}.`);
  }
}

for (const entry of entries) {
  const componentGaps = new Set(gaps[entry.id] ?? []);
  for (const host of ['dom', 'terminal']) {
    if (componentGaps.has(`${host}-scenarios`)) continue;
    const scenarios = entry.scenarios?.[host];
    assert.ok(Array.isArray(scenarios) && scenarios.length >= 3,
      `${entry.id}: completed ${host} examples require at least three named scenarios.`);
    assert.equal(new Set(scenarios).size, scenarios.length,
      `${entry.id}: ${host} scenario IDs must be unique.`);
  }
}

// Ratchet: a new public component is not part of the migration baseline, so it
// must enter with every requirement already satisfied.
for (const id of canonical) {
  assert.ok(ids.includes(id), `${id}: unaudited public component.`);
}

console.log(`component completeness contract: ${canonical.length} public components, ${Object.keys(gaps).length} migration entries`);
