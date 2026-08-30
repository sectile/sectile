import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url);
const manifest = await readJSON('verification/semantic-authority.json');
const baseline = await readJSON('verification/semantic-authority-exception-baseline.json');

assert.equal(manifest.schemaVersion, 1, 'Unsupported semantic-authority schema.');
assert.deepEqual(
  [...manifest.classifications].sort(),
  ['canonical', 'declared-alias', 'platform-only'],
  'Semantic-authority classifications are closed.',
);

const exceptionIDs = manifest.migrationExceptions.map(({ id }) => id);
assertUnique(exceptionIDs, 'Migration exception IDs');
assert.deepEqual([...exceptionIDs].sort(), [...baseline.ids].sort(),
  'Migration exceptions must match the reviewed baseline; new exceptions are rejected.');
const exceptions = new Set(exceptionIDs);
for (const exception of manifest.migrationExceptions) {
  assert.match(exception.owner, /^WI-\d{3}$/, `${exception.id}: migration owner must be a work item.`);
  assert.ok(exception.scope.length > 0, `${exception.id}: migration scope is required.`);
}

const catalog = await readJSON(manifest.componentAuthority.catalog);
const packageExports = new Map();
for (const entry of [
  ...manifest.componentAuthority.canonicalPackages,
  manifest.componentAuthority.tabularOwner,
  ...manifest.domainAuthority,
  ...manifest.dependencyGraph,
]) {
  if (!packageExports.has(entry.name)) {
    const pkg = await readJSON(entry.manifest);
    packageExports.set(entry.name, new Set(Object.keys(pkg.exports ?? {})));
  }
}

const aliases = new Map(manifest.componentAuthority.aliases.map((entry) => [entry.id, entry]));
assertUnique([...aliases.keys()], 'Declared component aliases');
const componentOwners = new Map();
for (const component of catalog.components) {
  const alias = aliases.get(component.id);
  const candidates = manifest.componentAuthority.canonicalPackages.filter(({ name }) => (
    packageExports.get(name).has(`./${component.id}`)
  ));
  assert.equal(candidates.length, 1, `${component.id}: expected exactly one canonical package owner.`);
  const owner = `${candidates[0].name}/${component.id}`;
  if (alias === undefined) {
    componentOwners.set(component.id, { classification: 'canonical', owner });
  } else {
    assert.equal(alias.owner, owner, `${component.id}: alias owner must resolve to its public subpath.`);
    await assertAuthorityTarget(alias.target, packageExports);
    componentOwners.set(component.id, { classification: 'declared-alias', owner, target: alias.target });
  }
}
assert.equal(componentOwners.size, catalog.components.length,
  'Every public component must resolve to one authority entry.');

for (const alias of manifest.componentAuthority.aliases) {
  assert.ok(componentOwners.has(alias.id), `${alias.id}: alias is not a catalog component.`);
  const targetID = alias.target.startsWith('@sectile/core/')
    ? alias.target.slice('@sectile/core/'.length)
    : null;
  assert.notEqual(targetID, alias.id, `${alias.id}: alias cannot target itself.`);
  if (targetID !== null && aliases.has(targetID)) {
    assert.ok(!aliasCycle(alias.id, aliases), `${alias.id}: declared alias cycle detected.`);
  }
}

const tabularExports = packageExports.get(manifest.componentAuthority.tabularOwner.name);
for (const profile of catalog[manifest.componentAuthority.tabularCatalogKey]) {
  assert.ok(tabularExports.has(`./${profile.id}`), `${profile.id}: missing canonical Tabular owner.`);
}

for (const domain of manifest.domainAuthority) {
  assert.equal(domain.classification, 'canonical', `${domain.name}: domain engines must be canonical.`);
  const exports = packageExports.get(domain.name);
  assert.ok(exports.size > 1, `${domain.name}: domain authority must cover runtime subpaths.`);
  for (const subpath of exports) {
    if (subpath === './package.json') continue;
    assert.ok(subpath === '.' || subpath.startsWith('./'), `${domain.name}: invalid export ${subpath}.`);
  }
}

for (const focused of manifest.focusedDomainProjections) {
  assert.ok(packageExports.has(focused.domain), `${focused.domain}: focused domain owner is missing.`);
  assertUnique(focused.projections.map(({ name }) => name), `${focused.domain} focused projection hosts`);
  for (const projection of focused.projections) {
    const pkg = await readJSON(projection.manifest);
    assert.ok(pkg.exports?.[projection.subpath] !== undefined,
      `${focused.domain}: ${projection.name} is missing focused subpath ${projection.subpath}.`);
  }
  assertUnique(focused.excludedHosts, `${focused.domain} excluded hosts`);
  for (const name of focused.excludedHosts) {
    const host = manifest.componentAuthority.hostProjections.find((entry) => entry.name === name);
    assert.notEqual(host, undefined, `${focused.domain}: unknown excluded host ${name}.`);
    const graphEntry = manifest.dependencyGraph.find((entry) => entry.name === name);
    const pkg = await readJSON(graphEntry.manifest);
    assert.equal(pkg.exports?.['./chart'], undefined, `${focused.domain}: ${name} must not expose ./chart.`);
  }
}

for (const projection of manifest.componentAuthority.hostProjections) {
  assert.equal(projection.classification, 'platform-only', `${projection.name}: hosts are projections.`);
  if (projection.migrationException !== undefined) {
    assert.ok(exceptions.has(projection.migrationException),
      `${projection.name}: host semantic exception must be reviewed.`);
  }
}

for (const helperRoot of manifest.hostHelperRoots) {
  assert.equal(helperRoot.classification, 'platform-only', `${helperRoot.root}: helper root must be platform-only.`);
  if (helperRoot.semanticException !== undefined) {
    assert.ok(exceptions.has(helperRoot.semanticException),
      `${helperRoot.root}: semantic helper exception must be reviewed.`);
  }
  assert.ok(
    helperRoot.semanticPaths.length === 0 || helperRoot.semanticException !== undefined,
    `${helperRoot.root}: semantic helper paths require a reviewed exception.`,
  );
  assertUnique(helperRoot.semanticPaths, `${helperRoot.root} semantic helper paths`);
  const files = await sourceFiles(helperRoot.root);
  const fileSet = new Set(files);
  for (const path of helperRoot.semanticPaths) {
    assert.ok(fileSet.has(path), `${path}: declared semantic helper does not exist.`);
  }
  assert.equal(files.length > 0, true, `${helperRoot.root}: helper root is empty.`);
}

const graph = new Map(manifest.dependencyGraph.map((entry) => [entry.name, entry]));
assertUnique([...graph.keys()], 'Semantic dependency packages');
for (const entry of graph.values()) {
  const pkg = await readJSON(entry.manifest);
  const actual = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })
    .filter((name) => graph.has(name))
    .sort();
  assert.deepEqual(actual, [...entry.semanticDependencies].sort(),
    `${entry.name}: semantic dependency declaration drifted.`);
  for (const dependency of entry.semanticDependencies) {
    assert.ok(graph.has(dependency), `${entry.name}: missing dependency owner ${dependency}.`);
  }
}
for (const name of graph.keys()) assert.ok(!dependencyCycle(name, graph), `${name}: semantic dependency cycle detected.`);

console.log(`semantic authority passed: ${componentOwners.size} components, ${catalog.tabularProfiles.length} tabular profiles, ${manifest.domainAuthority.length} domains, ${exceptionIDs.length} reviewed exceptions`);

async function readJSON(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

async function assertAuthorityTarget(target, exportsByPackage) {
  if (target.startsWith('packages/')) {
    assert.equal((await stat(new URL(target, root))).isFile(), true, `Missing alias target ${target}.`);
    return;
  }
  const separator = target.indexOf('/', '@sectile/'.length);
  assert.ok(separator > 0, `Invalid authority target ${target}.`);
  const packageName = target.slice(0, separator);
  const subpath = `./${target.slice(separator + 1)}`;
  assert.ok(exportsByPackage.get(packageName)?.has(subpath), `Missing alias target ${target}.`);
}

function aliasCycle(start, entries) {
  const seen = new Set();
  let current = start;
  while (entries.has(current)) {
    if (seen.has(current)) return true;
    seen.add(current);
    const target = entries.get(current).target;
    current = target.startsWith('@sectile/core/') ? target.slice('@sectile/core/'.length) : '';
  }
  return false;
}

function dependencyCycle(start, entries) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (name) => {
    if (visiting.has(name)) return true;
    if (visited.has(name)) return false;
    visiting.add(name);
    for (const dependency of entries.get(name).semanticDependencies) {
      if (visit(dependency)) return true;
    }
    visiting.delete(name);
    visited.add(name);
    return false;
  };
  return visit(start);
}

async function sourceFiles(directory) {
  const absolute = new URL(`${directory}/`, root);
  const result = [];
  const visit = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.ts')) {
        result.push(relative(new URL('.', root).pathname, path));
      }
    }
  };
  await visit(absolute.pathname);
  return result.sort();
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique.`);
}
