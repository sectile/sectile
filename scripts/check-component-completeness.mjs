import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import {
  documentedScenarios,
  isStandaloneDocumentationScenario,
} from '../docs/data/component-documentation.mjs';

const semanticPackagePaths = [
  'packages/core/package.json',
  'packages/temporal/package.json',
];
const hostPackagePaths = {
  'packages/dom/package.json': ['packages/core/package.json'],
  'packages/terminal/package.json': semanticPackagePaths,
};
const vuePackagePath = 'packages/vue/package.json';
const supportSubpaths = new Set([
  'package.json', 'adapter-runtime', 'sequence', 'selection', 'selection-expression', 'metric-index', 'geometry', 'anchored-layout', 'color', 'color-text', 'extent-index', 'range', 'index-span', 'grid-control', 'tree', 'result', 'revision', 'interaction', 'identity',
  'collection-window', 'virtual-layout', 'virtual', 'layer-stack', 'reorder', 'position',
  'form',
  'appearance', 'keyboard', 'layout', 'node', 'screen', 'units',
  'model', 'query', 'source', 'data-table', 'data-grid', 'data-tree-grid',
  'tabular', 'temporal',
]);
const vueOnlySubpaths = new Set(['host-provider', 'primitive']);
const migrationBaselineIDs = new Set([
  'accordion', 'alert-dialog', 'calendar', 'carousel', 'checkbox', 'combobox',
  'dialog', 'disclosure', 'feed', 'grid', 'listbox', 'menu', 'menu-button',
  'menubar', 'multi-thumb-slider', 'radio-group', 'slider', 'spin-button',
  'switch', 'tabs', 'text', 'toggle-button', 'toolbar', 'tooltip', 'tree-grid',
  'tree-view', 'window-splitter',
]);
const isSupportSubpath = (subpath) => (
  supportSubpaths.has(subpath)
  || subpath.startsWith('temporal/')
  || subpath.startsWith('virtual/')
);

const manifest = JSON.parse(await readFile('verification/component-completeness.json', 'utf8'));
const evidence = JSON.parse(await readFile('verification/component-evidence.json', 'utf8'));
const allowedHostInputs = {
  dom: new Set(['focus', 'ime', 'keyboard', 'measurement', 'native-form', 'pointer', 'resize', 'scroll', 'text', 'timer']),
  terminal: new Set(['keyboard', 'text', 'timer']),
};
assert.equal(manifest.schemaVersion, 1, 'Unsupported component completeness schema.');
assert.ok(Array.isArray(manifest.requirements) && manifest.requirements.length > 0,
  'Completeness requirements must be declared.');

const requirementSet = new Set(manifest.requirements);
assert.equal(requirementSet.size, manifest.requirements.length,
  'Completeness requirements must be unique.');

const componentsFor = async (path) => {
  const pkg = JSON.parse(await readFile(path, 'utf8'));
  return Object.keys(pkg.exports)
    .filter((subpath) => subpath.startsWith('./'))
    .map((subpath) => subpath.slice(2))
    .filter((subpath) => !isSupportSubpath(subpath))
    .sort();
};

const canonical = [...new Set((await Promise.all(
  semanticPackagePaths.map((path) => componentsFor(path)),
)).flat())].sort();
for (const [path, semanticPaths] of Object.entries(hostPackagePaths)) {
  const components = await componentsFor(path);
  const expected = [...new Set((await Promise.all(
    semanticPaths.map((semanticPath) => componentsFor(semanticPath)),
  )).flat())].sort();
  assert.deepEqual(components, expected,
    `${path} must expose every renderer-neutral semantic component subpath.`);
}

const vuePackage = JSON.parse(await readFile(vuePackagePath, 'utf8'));
const vueComponents = Object.keys(vuePackage.exports)
  .filter((subpath) => subpath.startsWith('./'))
  .map((subpath) => subpath.slice(2))
  .filter((subpath) => !isSupportSubpath(subpath) && !vueOnlySubpaths.has(subpath))
  .sort();
assert.deepEqual(vueComponents, await componentsFor('packages/core/package.json'),
  `${vuePackagePath} must project every direct @sectile/core component subpath.`);

const entries = manifest.components;
assert.ok(Array.isArray(entries), 'Component completeness entries must be an array.');
const ids = entries.map((entry) => entry.id);
assert.equal(new Set(ids).size, ids.length, 'Component completeness IDs must be unique.');
assert.deepEqual([...ids].sort(), canonical,
  'Every public component subpath must have exactly one completeness entry.');

assert.equal(evidence.schemaVersion, 2, 'Unsupported component evidence schema.');
const declaredFamilies = [...new Set(entries.map((entry) => entry.family))].sort();
assert.deepEqual(Object.keys(evidence.families).sort(), declaredFamilies,
  'Every semantic component family must have exactly one evidence entry.');
for (const family of declaredFamilies) {
  const familyEvidence = evidence.families[family];
  for (const host of ['dom', 'terminal']) {
    const inputs = familyEvidence.hostInputs?.[host];
    assert.ok(Array.isArray(inputs) && inputs.length > 0,
      `${family}: ${host} host inputs must be declared.`);
    assert.equal(new Set(inputs).size, inputs.length,
      `${family}: ${host} host inputs must be unique.`);
    for (const input of inputs) {
      assert.ok(allowedHostInputs[host].has(input),
        `${family}: unsupported ${host} host input ${input}.`);
    }
  }
  for (const witness of ['core', 'dom', 'terminal', 'vue']) {
    const paths = familyEvidence[witness];
    assert.ok(Array.isArray(paths) && paths.length > 0,
      `${family}: ${witness} evidence must name at least one test file.`);
    assert.equal(new Set(paths).size, paths.length,
      `${family}: ${witness} evidence paths must be unique.`);
    for (const path of paths) {
      assert.equal((await stat(path)).isFile(), true,
        `${family}: missing ${witness} evidence ${path}.`);
    }
  }
}

const supportHosts = {
  form: ['form', 'dom', 'vue'],
  'layer-stack': ['core', 'dom', 'terminal', 'vue'],
  reorder: ['core', 'dom', 'terminal', 'vue'],
  virtual: ['virtual', 'dom', 'vue'],
};
for (const [support, hosts] of Object.entries(supportHosts)) {
  const supportEvidence = evidence.support?.[support];
  assert.ok(supportEvidence !== undefined, `${support} host evidence must be declared.`);
  for (const host of hosts) {
    const paths = supportEvidence[host];
    assert.ok(Array.isArray(paths) && paths.length > 0,
      `${support}: ${host} evidence must name at least one test file.`);
    for (const path of paths) {
      assert.equal((await stat(path)).isFile(), true,
        `${support}: missing ${host} evidence ${path}.`);
    }
  }
  if (support === 'virtual') continue;
  for (const host of hosts.filter((candidate) => candidate === 'dom' || candidate === 'terminal')) {
    const inputs = supportEvidence.hostInputs?.[host];
    assert.ok(Array.isArray(inputs) && inputs.length > 0,
      `${support}: ${host} host inputs must be declared.`);
    for (const input of inputs) {
      assert.ok(allowedHostInputs[host].has(input),
        `${support}: unsupported ${host} host input ${input}.`);
    }
  }
}

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
    assert.ok(Array.isArray(scenarios) && scenarios.length >= 1,
      `${entry.id}: completed ${host} examples require at least one named scenario.`);
    assert.equal(new Set(scenarios).size, scenarios.length,
      `${entry.id}: ${host} scenario IDs must be unique.`);
  }

  const documentationScenarios = documentedScenarios(entry);
  assert.ok(documentationScenarios.length >= 1,
    `${entry.id}: declare at least one meaningful DOM documentation example.`);
  assert.equal(new Set(documentationScenarios).size, documentationScenarios.length,
    `${entry.id}: documentation example IDs must be unique.`);
  for (const scenario of documentationScenarios) {
    assert.ok(entry.scenarios.dom.includes(scenario),
      `${entry.id}: documentation example ${scenario} is not a declared DOM scenario.`);
    assert.ok(isStandaloneDocumentationScenario(scenario),
      `${entry.id}: ${scenario} is an API/state concern, not a standalone visual example.`);
  }
}

// Ratchet: a new public component is not part of the migration baseline, so it
// must enter with every requirement already satisfied.
for (const id of canonical) {
  assert.ok(ids.includes(id), `${id}: unaudited public component.`);
}

const tabularProfiles = manifest.tabularProfiles;
assert.ok(Array.isArray(tabularProfiles), 'Tabular profiles must be declared.');
assert.deepEqual(
  tabularProfiles.map((entry) => entry.id).sort(),
  ['data-grid', 'data-table', 'data-tree-grid'],
  'Tabular profiles must be exact.',
);
const tabularPackages = ['tabular', 'dom', 'vue'];
for (const entry of tabularProfiles) {
  assert.match(entry.id, /^data-(?:table|grid|tree-grid)$/u, `${entry.id}: invalid Tabular profile ID.`);
  assert.ok(Array.isArray(entry.capabilities) && entry.capabilities.length >= 2,
    `${entry.id}: declare Tabular profile capabilities.`);
  assert.equal(new Set(entry.capabilities).size, entry.capabilities.length,
    `${entry.id}: Tabular capabilities must be unique.`);
  assert.ok(entry.standard.startsWith('docs/'), `${entry.id}: Tabular standard must be a repository document.`);
  for (const packageName of tabularPackages) {
    const pkg = JSON.parse(await readFile(`packages/${packageName}/package.json`, 'utf8'));
    const subpath = packageName === 'dom' ? './tabular' : `./${entry.id}`;
    assert.ok(pkg.exports?.[subpath] !== undefined,
      `${entry.id}: @sectile/${packageName} subpath missing.`);
  }
  const terminal = JSON.parse(await readFile('packages/terminal/package.json', 'utf8'));
  assert.equal(terminal.exports?.[`./${entry.id}`], undefined,
    `${entry.id}: terminal projection is intentionally unsupported.`);
  const profileEvidence = evidence.tabularProfiles?.[entry.id];
  assert.ok(profileEvidence !== undefined, `${entry.id}: evidence must be declared.`);
  for (const packageName of tabularPackages) {
    const paths = profileEvidence[packageName];
    assert.ok(Array.isArray(paths) && paths.length > 0,
      `${entry.id}: ${packageName} evidence must be declared.`);
    for (const path of paths) assert.equal((await stat(path)).isFile(), true,
      `${entry.id}: missing ${packageName} evidence ${path}.`);
  }
  for (const locale of ['en', 'ko']) {
    const path = profileEvidence.docs?.[locale];
    assert.equal(typeof path, 'string', `${entry.id}: ${locale} documentation must be declared.`);
    assert.equal((await stat(path)).isFile(), true, `${entry.id}: missing documentation ${path}.`);
  }
}

console.log(`component completeness contract: ${canonical.length} public components, ${tabularProfiles.length} Tabular profiles, ${declaredFamilies.length} evidence families, ${Object.keys(gaps).length} migration entries`);
