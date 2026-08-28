import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compareRuntimeCoverage,
  complexityRank,
  expandOperation,
  validateAliasContracts,
  validateFragment,
  validateTemplates,
} from './lib/complexity-contracts.mjs';

const templates = validateTemplates(JSON.parse(await readFile('verification/complexity-contracts/templates.json', 'utf8'))).templates;

test('complexity ranks constant, logarithmic, linear, n-log-n, and quadratic bounds', () => {
  assert.deepEqual(
    ['O(1)', 'O(log n)', 'O(n + k)', 'O(n log n + k)', 'O(n^2)'].map(complexityRank),
    [0, 1, 2, 3, 4],
  );
});

test('intentional fixture rejects an unclassified runtime key', () => {
  assert.deepEqual(compareRuntimeCoverage(['core:./sequence:createSequence'], []), {
    missing: ['core:./sequence:createSequence'],
    extra: [],
  });
});

test('intentional fixture rejects an extra stale runtime key', () => {
  assert.deepEqual(compareRuntimeCoverage([], ['core:./sequence:stale']), {
    missing: [],
    extra: ['core:./sequence:stale'],
  });
});

test('intentional fixture rejects implicit alias inheritance', () => {
  assert.throws(() => validateFragment({
    schemaVersion: 1,
    package: 'core',
    surface: 'fixture',
    kind: 'public-runtime',
    aliases: 'implicit',
    families: { function: 'public-callable-v1', object: 'public-callable-v1', primitive: 'public-value-v1' },
  }, templates), /identical-binding inheritance/u);
});

test('intentional fixture rejects incompatible explicit alias inheritance', () => {
  assert.throws(() => validateAliasContracts([
    { key: 'core:./sequence:createSequence', aliasOf: null, kind: 'function', inherits: 'public-callable-v1' },
    { key: 'core:.:createSequence', aliasOf: 'core:./sequence:createSequence', kind: 'function', inherits: 'public-value-v1' },
  ]), /alias contract is incompatible/u);
});

test('intentional fixture rejects a weaker specification bound without rationale', () => {
  assert.throws(() => expandOperation({
    id: 'fixture.weaker',
    inherits: 'linear-v1',
    source: 'fixture.ts',
    benchmarkIDs: ['VAL-fixture'],
    specificationCeiling: 'O(n)',
    contract: { time: { bound: 'O(n^2)', kind: 'worst-case', runtimeState: 'external' } },
  }, templates), /reviewed rationale/u);
});

test('same-degree extra variables require dominance proof or reviewed rationale', () => {
  assert.throws(() => expandOperation({
    id: 'fixture.extra-variable',
    inherits: 'linear-v1',
    source: 'fixture.ts',
    benchmarkIDs: ['VAL-fixture'],
    specificationCeiling: 'O(n)',
    contract: {
      variables: [
        { name: 'n', meaning: 'input', ceiling: 'maxItems' },
        { name: 'k', meaning: 'unrelated work', ceiling: 'separate ceiling' },
      ],
    },
  }, templates), /reviewed rationale/u);
  assert.doesNotThrow(() => expandOperation({
    id: 'fixture.dominated-variable',
    inherits: 'linear-v1',
    source: 'fixture.ts',
    benchmarkIDs: ['VAL-fixture'],
    specificationCeiling: 'O(n)',
    contract: {
      variables: [
        { name: 'n', meaning: 'input', ceiling: 'maxItems' },
        { name: 'k', meaning: 'output', ceiling: 'k <= n' },
      ],
    },
  }, templates));
});

test('intentional fixture rejects missing variables and evidence fields', () => {
  const malformed = structuredClone(templates['linear-v1']);
  delete malformed.variables;
  assert.throws(() => validateTemplates({ schemaVersion: 1, templates: { malformed } }), /variables required/u);
});
