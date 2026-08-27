import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTabularQueryEvent,
  createTabularQuery,
  tryCreateTabularQuery,
} from '../../.verification-dist/query.js';

const complete = Object.freeze({
  sort: [{ id: 'sort-name', columnID: 'name', direction: 'ascending', comparator: 'text' }],
  filters: [{
    id: 'filter-active', scope: 'column', columnID: 'active', predicate: 'equals',
    value: { expected: true, tags: ['stable', 'remote'] },
  }],
  groups: [{ id: 'group-team', columnID: 'team', policy: 'team-key' }],
  aggregates: [{ id: 'sum-hours', columnID: 'hours', policy: 'sum' }],
  pivots: [{ id: 'pivot-quarter', columnID: 'quarter', valuePolicy: 'quarter-key', aggregateIDs: ['sum-hours'] }],
});

test('TAB-QRY-01: complete descriptors normalize into immutable ordered query state', () => {
  const query = createTabularQuery(complete);
  assert.deepEqual(query.sort.map((descriptor) => descriptor.id), ['sort-name']);
  assert.equal(query.filters[0].enabled, true);
  assert.deepEqual(Object.keys(query.filters[0].value), ['expected', 'tags']);
  assert.equal(Object.isFrozen(query), true);
  assert.equal(Object.isFrozen(query.filters), true);
  assert.equal(Object.isFrozen(query.filters[0].value.tags), true);

  complete.filters[0].value.tags.push?.('mutation');
  assert.deepEqual(query.filters[0].value.tags, ['stable', 'remote']);
});

test('TAB-QRY-02: descriptor identity, policy, scope, and pivot references reject atomically', () => {
  const cases = [
    [{ sort: [{ ...complete.sort[0] }, { ...complete.sort[0] }] }, 'duplicate-identity'],
    [{ groups: [{ id: 'g', columnID: 'x', policy: '' }] }, 'missing-policy-key'],
    [{ filters: [{ id: 'f', scope: 'global', columnID: 'x', predicate: 'p', value: null }] }, 'invalid-query-descriptor'],
    [{ pivots: [{ id: 'p', columnID: 'x', valuePolicy: 'v', aggregateIDs: ['missing'] }] }, 'invalid-query-descriptor'],
  ];
  for (const [input, code] of cases) {
    const result = tryCreateTabularQuery(input);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }
});

test('TAB-QRY-03: bounded JSON-like values reject executable, cyclic, sparse, and exotic input', () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const sparse = [];
  sparse.length = 1;
  const accessor = {};
  Object.defineProperty(accessor, 'secret', { enumerable: true, get: () => 1 });
  class Box { value = 1; }
  const invalid = [undefined, () => 1, Symbol('x'), 1n, Number.NaN, Infinity, cyclic, sparse, accessor, new Box()];
  for (const value of invalid) {
    const result = tryCreateTabularQuery({
      filters: [{ id: 'f', scope: 'global', predicate: 'accept', value }],
    });
    assert.equal(result.ok, false, String(value));
    assert.equal(result.error.code, 'invalid-query-value');
  }
});

test('TAB-QRY-04: value depth, node, and UTF-16 budgets have distinct failures', () => {
  const descriptor = (value) => ({ filters: [{ id: 'f', scope: 'global', predicate: 'p', value }] });
  const depth = tryCreateTabularQuery(descriptor([[true]]), {
    maxIDCodeUnits: 10,
    maxSortRules: 1,
    maxFilterRules: 1,
    maxGroupDescriptors: 1,
    maxAggregateDescriptors: 1,
    maxPivotDescriptors: 1,
    maxQueryValueDepth: 1,
    maxQueryValueCodeUnits: 20,
    maxQueryValueNodes: 20,
  });
  assert.equal(depth.ok, false);
  assert.equal(depth.error.code, 'query-value-depth-ceiling-exceeded');

  const nodes = tryCreateTabularQuery(descriptor([true, false]), {
    maxIDCodeUnits: 10,
    maxSortRules: 1,
    maxFilterRules: 1,
    maxGroupDescriptors: 1,
    maxAggregateDescriptors: 1,
    maxPivotDescriptors: 1,
    maxQueryValueDepth: 4,
    maxQueryValueCodeUnits: 20,
    maxQueryValueNodes: 2,
  });
  assert.equal(nodes.ok, false);
  assert.equal(nodes.error.code, 'query-value-node-ceiling-exceeded');

  const text = tryCreateTabularQuery(descriptor({ abc: 'def' }), {
    maxIDCodeUnits: 10,
    maxSortRules: 1,
    maxFilterRules: 1,
    maxGroupDescriptors: 1,
    maxAggregateDescriptors: 1,
    maxPivotDescriptors: 1,
    maxQueryValueDepth: 4,
    maxQueryValueCodeUnits: 5,
    maxQueryValueNodes: 20,
  });
  assert.equal(text.ok, false);
  assert.equal(text.error.code, 'query-value-code-unit-ceiling-exceeded');
});

test('TAB-QRY-05: update and reset events preserve prior state on rejection', () => {
  const query = createTabularQuery(complete);
  const rejected = applyTabularQueryEvent(query, { type: 'set-aggregates', aggregates: [] });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.class, 'transition-rejection');
  assert.deepEqual(query.aggregates.map((descriptor) => descriptor.id), ['sum-hours']);
  assert.deepEqual(query.pivots.map((descriptor) => descriptor.id), ['pivot-quarter']);

  const reset = applyTabularQueryEvent(query, { type: 'reset' });
  assert.equal(reset.ok, true);
  assert.deepEqual(reset.value, { sort: [], filters: [], groups: [], aggregates: [], pivots: [] });
});
