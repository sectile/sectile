import assert from 'node:assert/strict';

const packageNames = Object.freeze(['core', 'dom', 'terminal', 'vue']);
const familyNames = Object.freeze(['meter', 'meter-group', 'progress']);

export function validateComponentPublicApiManifest(manifest) {
  assert.equal(manifest?.schemaVersion, 1, 'Unsupported component public API schema.');
  assert.deepEqual(Object.keys(manifest.families ?? {}).sort(), [...familyNames], 'API families must be exact.');
  assert.deepEqual(Object.keys(manifest.forbiddenImports ?? {}).sort(), [...packageNames], 'Import boundaries must cover every package.');
  for (const family of familyNames) {
    const packages = manifest.families[family];
    assert.deepEqual(Object.keys(packages ?? {}).sort(), [...packageNames], `${family}: package contracts must be exact.`);
    for (const packageName of packageNames) {
      const contract = packages[packageName];
      assert.equal(contract.subpath, `./${family}`, `${family}/${packageName}: subpath mismatch.`);
      assert.equal(typeof contract.root, 'boolean', `${family}/${packageName}: root policy required.`);
      for (const key of ['runtime', 'types']) {
        assert.ok(Array.isArray(contract[key]), `${family}/${packageName}: ${key} allowlist required.`);
        assert.deepEqual(contract[key], sortedUnique(contract[key]), `${family}/${packageName}: ${key} must be sorted and unique.`);
      }
    }
  }
  return manifest;
}

export function checkComponentPackageModel(contract, model) {
  const issues = [];
  if (model.subpath !== contract.subpath) issues.push(`subpath: expected ${contract.subpath}, received ${model.subpath}`);
  if (model.hasDefault === true) issues.push('default export is forbidden');
  if (model.hasWildcard === true) issues.push('wildcard export is forbidden');
  compareSet('runtime', contract.runtime, model.runtime, issues);
  compareSet('types', contract.types, model.types, issues);
  for (const name of [...contract.runtime, ...contract.types]) {
    const present = model.rootExports.includes(name);
    if (contract.root && !present) issues.push(`root export missing: ${name}`);
    if (!contract.root && present) issues.push(`root export forbidden: ${name}`);
  }
  for (const specifier of model.imports) {
    if (model.forbiddenImports.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`))) {
      issues.push(`forbidden import: ${specifier}`);
    }
    if (specifier.includes('/src/') || specifier.includes('/internal/')) issues.push(`deep import forbidden: ${specifier}`);
  }
  return Object.freeze(issues);
}

function compareSet(label, expected, actual, issues) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  for (const name of expected) if (!actualSet.has(name)) issues.push(`${label} export missing: ${name}`);
  for (const name of actual) if (!expectedSet.has(name)) issues.push(`${label} export unexpected: ${name}`);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
