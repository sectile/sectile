import assert from 'node:assert/strict';

export const COMPLEXITY_SCHEMA_VERSION = 1;
export const PACKAGE_NAMES = Object.freeze([
  'core',
  'dom',
  'form',
  'tabular',
  'temporal',
  'terminal',
  'virtual',
  'vue',
]);

const BOUND_KINDS = new Set(['worst-case', 'expected', 'amortized']);
const RUNTIME_STATES = new Set([
  'all',
  'trusted',
  'external',
  'mounted',
  'connected',
  'mounted-or-connected',
]);

export function validateTemplates(document) {
  assert.equal(document?.schemaVersion, COMPLEXITY_SCHEMA_VERSION, 'Unsupported complexity template schema.');
  assert.ok(document.templates !== null && typeof document.templates === 'object', 'Complexity templates are required.');
  for (const [id, contract] of Object.entries(document.templates)) validateContract(contract, `template:${id}`);
  return document;
}

export function validateFragment(fragment, templates) {
  assert.equal(fragment?.schemaVersion, COMPLEXITY_SCHEMA_VERSION, 'Unsupported complexity fragment schema.');
  assert.ok(PACKAGE_NAMES.includes(fragment.package), `Unknown complexity package ${fragment.package}.`);
  assert.match(fragment.surface, /^[a-z0-9][a-z0-9-]*$/u, 'Complexity surface must be kebab-case.');
  if (fragment.kind === 'public-runtime') {
    assert.deepEqual(Object.keys(fragment.families ?? {}).sort(), ['function', 'object', 'primitive'], `${fragment.package}/${fragment.surface}: exact public families required.`);
    for (const [kind, templateID] of Object.entries(fragment.families)) {
      assert.ok(Object.hasOwn(templates, templateID), `${fragment.package}/${fragment.surface}: unknown ${kind} template ${templateID}.`);
    }
    assert.equal(fragment.aliases, 'identical-binding', `${fragment.package}/${fragment.surface}: aliases must explicitly use identical-binding inheritance.`);
  } else if (fragment.kind === 'internal-operations') {
    assert.ok(Array.isArray(fragment.operations) && fragment.operations.length > 0, `${fragment.package}/${fragment.surface}: operations required.`);
    const ids = fragment.operations.map(({ id }) => id);
    assert.deepEqual(ids, sortedUnique(ids), `${fragment.package}/${fragment.surface}: operation ids must be sorted and unique.`);
    for (const operation of fragment.operations) validateOperation(operation, templates, `${fragment.package}:${operation.id}`);
  } else {
    assert.fail(`${fragment.package}/${fragment.surface}: unknown fragment kind.`);
  }
  return fragment;
}

export function validateContract(contract, label) {
  assert.ok(Array.isArray(contract.variables), `${label}: variables required.`);
  for (const variable of contract.variables) {
    assert.match(variable.name, /^[A-Za-z][A-Za-z0-9]*$/u, `${label}: invalid variable name.`);
    assert.equal(typeof variable.meaning, 'string', `${label}: variable meaning required.`);
    assert.ok(variable.meaning.length > 0, `${label}: variable meaning required.`);
    assert.equal(typeof variable.ceiling, 'string', `${label}: variable ceiling required.`);
  }
  assert.equal(typeof contract.time?.bound, 'string', `${label}: time bound required.`);
  assert.ok(BOUND_KINDS.has(contract.time?.kind), `${label}: bound kind required.`);
  assert.ok(RUNTIME_STATES.has(contract.time?.runtimeState), `${label}: runtime state required.`);
  for (const field of ['auxiliary', 'output', 'retained']) {
    assert.equal(typeof contract.space?.[field], 'string', `${label}: ${field} space required.`);
  }
  for (const field of ['allocations', 'cacheEntries', 'listeners', 'observers', 'timers', 'subscriptions']) {
    assert.equal(typeof contract.resources?.[field], 'string', `${label}: ${field} resource bound required.`);
  }
  const declaredVariables = new Set(contract.variables.map(({ name }) => name));
  for (const expression of [
    contract.time.bound,
    contract.space.auxiliary,
    contract.space.output,
    contract.space.retained,
    ...Object.values(contract.resources),
  ]) {
    if (!expression.startsWith('O(')) continue;
    for (const variable of expression.match(/[A-Za-z][A-Za-z0-9]*/gu) ?? []) {
      if (variable === 'O' || variable === 'log') continue;
      assert.ok(declaredVariables.has(variable), `${label}: bound variable ${variable} is not declared.`);
    }
  }
  for (const field of ['assumptions', 'ceilings', 'evidence', 'benchmarkIDs', 'deterministicWork']) {
    assert.ok(Array.isArray(contract[field]) && contract[field].length > 0, `${label}: ${field} required.`);
  }
  assert.equal(typeof contract.resourceRationale, 'string', `${label}: resource rationale required.`);
  assert.ok(contract.resourceRationale.length > 0, `${label}: resource rationale required.`);
  assert.equal(typeof contract.fullScan?.allowed, 'boolean', `${label}: full-scan classification required.`);
  assert.equal(typeof contract.fullScan?.rationale, 'string', `${label}: full-scan rationale required.`);
  assert.ok(contract.fullScan.rationale.length > 0, `${label}: full-scan rationale required.`);
  if (contract.time.bound !== 'O(1)') {
    assert.equal(typeof contract.proof, 'string', `${label}: source proof required for non-trivial bounds.`);
    assert.ok(contract.proof.length > 0, `${label}: source proof required for non-trivial bounds.`);
    assert.equal(typeof contract.adversarialWitness, 'string', `${label}: adversarial witness required for non-trivial bounds.`);
    assert.ok(contract.adversarialWitness.length > 0, `${label}: adversarial witness required for non-trivial bounds.`);
  }
  return contract;
}

export function expandOperation(operation, templates) {
  const template = templates[operation.inherits];
  assert.ok(template !== undefined, `${operation.id}: unknown template ${operation.inherits}.`);
  const merged = deepMerge(template, operation.contract ?? {});
  validateContract(merged, operation.id);
  assert.equal(typeof operation.source, 'string', `${operation.id}: source required.`);
  assert.ok(operation.source.length > 0, `${operation.id}: source required.`);
  assert.ok(Array.isArray(operation.benchmarkIDs) && operation.benchmarkIDs.length > 0, `${operation.id}: benchmark IDs required.`);
  if (operation.specificationCeiling !== undefined) {
    const actualRank = complexityRank(merged.time.bound);
    const ceilingRank = complexityRank(operation.specificationCeiling);
    const specificationVariables = boundVariables(operation.specificationCeiling);
    const undominatedVariables = boundVariables(merged.time.bound).filter((variable) =>
      !specificationVariables.includes(variable)
      && !variableIsDominated(variable, specificationVariables, merged.variables));
    if (actualRank > ceilingRank || (actualRank === ceilingRank && undominatedVariables.length > 0)) {
      assert.equal(typeof operation.reviewedWeakening, 'string', `${operation.id}: weaker-than-specification bound requires reviewed rationale.`);
      assert.ok(operation.reviewedWeakening.length > 0, `${operation.id}: weaker-than-specification bound requires reviewed rationale.`);
    }
  }
  return Object.freeze({
    id: operation.id,
    source: operation.source,
    benchmarkIDs: Object.freeze([...operation.benchmarkIDs]),
    specificationCeiling: operation.specificationCeiling ?? null,
    reviewedWeakening: operation.reviewedWeakening ?? null,
    contract: deepFreeze(merged),
  });
}

export function deriveRuntimeContracts(packageName, inventory, fragment, templates) {
  const seenBindings = new Map();
  return Object.freeze(inventory.map((entry) => {
    const templateID = fragment.families[entry.kind];
    const bindingKey = entry.binding;
    const aliasOf = seenBindings.get(bindingKey) ?? null;
    if (aliasOf === null) seenBindings.set(bindingKey, entry.key);
    return Object.freeze({
      key: entry.key,
      package: packageName,
      subpath: entry.subpath,
      exportName: entry.exportName,
      kind: entry.kind,
      aliasOf,
      inherits: templateID,
      contract: templates[templateID],
    });
  }));
}

export function compareRuntimeCoverage(expectedKeys, aggregateKeys) {
  const expected = new Set(expectedKeys);
  const actual = new Set(aggregateKeys);
  return Object.freeze({
    missing: Object.freeze([...expected].filter((key) => !actual.has(key)).sort()),
    extra: Object.freeze([...actual].filter((key) => !expected.has(key)).sort()),
  });
}

export function validateAliasContracts(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    if (entry.aliasOf !== null) {
      const target = byKey.get(entry.aliasOf);
      assert.ok(target !== undefined, `${entry.key}: alias target must precede the alias.`);
      assert.equal(entry.kind, target.kind, `${entry.key}: alias kind is incompatible with ${entry.aliasOf}.`);
      assert.equal(entry.inherits, target.inherits, `${entry.key}: alias contract is incompatible with ${entry.aliasOf}.`);
    }
    byKey.set(entry.key, entry);
  }
  return entries;
}

export function complexityRank(bound) {
  const normalized = bound.replace(/\s+/gu, '').toLowerCase();
  if (normalized === 'o(1)') return 0;
  if (/^o\(log[^)]*\)$/u.test(normalized)) return 1;
  if (normalized.includes('²') || normalized.includes('^2') || /\b[a-z]+\*[a-z]+\b/u.test(normalized)) return 4;
  if (/^o\([^)]*log[^)]*\)$/u.test(normalized)) return 3;
  if (/^o\([^)]*\)$/u.test(normalized)) return 2;
  return 5;
}

function boundVariables(bound) {
  return [...new Set((bound.match(/[A-Za-z][A-Za-z0-9]*/gu) ?? [])
    .filter((value) => value !== 'O' && value !== 'log'))];
}

function variableIsDominated(variable, specificationVariables, declarations) {
  const declaration = declarations.find(({ name }) => name === variable);
  if (declaration === undefined) return false;
  return specificationVariables.some((specificationVariable) =>
    new RegExp(`\\b${variable}\\s*<=\\s*${specificationVariable}\\b`, 'u').test(declaration.ceiling));
}

function validateOperation(operation, templates, label) {
  assert.match(operation.id, /^[a-z0-9][a-z0-9.:/-]*$/u, `${label}: invalid operation id.`);
  expandOperation(operation, templates);
}

function deepMerge(base, override) {
  if (override === null || typeof override !== 'object' || Array.isArray(override)) return override;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const previous = result[key];
    result[key] = previous !== null && typeof previous === 'object' && !Array.isArray(previous)
      && value !== null && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(previous, value)
      : value;
  }
  return result;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
