import assert from 'node:assert/strict';
import test from 'node:test';
import { nextClientViewRevision } from '../../.verification-dist/internal/source-view.js';
import {
  createClientTabularSource,
  resolveClientTabularRequest,
  synchronizeTabularView,
} from '../../.verification-dist/source.js';

const records = Object.freeze([
  Object.freeze({ id: 'r1', name: 'Beta', team: 'A', score: 2, active: true }),
  Object.freeze({ id: 'r2', name: 'Alpha', team: 'B', score: 2, active: true }),
  Object.freeze({ id: 'r3', name: 'Gamma', team: 'A', score: 1, active: false }),
  Object.freeze({ id: 'r4', name: 'Delta', team: 'A', score: 2, active: true }),
]);
const columnSchema = Object.freeze({
  revision: 0,
  columns: Object.freeze([
    Object.freeze({ id: 'name' }),
    Object.freeze({ id: 'team' }),
    Object.freeze({ id: 'score' }),
    Object.freeze({ id: 'active' }),
  ]),
  headers: Object.freeze([]),
});

function request(overrides = {}) {
  return {
    protocolVersion: 1,
    requestID: 1,
    sourceGeneration: 0,
    queryRevision: 0,
    expansionRevision: 0,
    query: {
      sort: [], filters: [], groups: [], aggregates: [], pivots: [],
    },
    expansion: [],
    access: { kind: 'page', page: 1, itemsPerPage: 25 },
    columnSchemaRevision: 0,
    ...overrides,
  };
}

function source(sourceRecords = records) {
  return createClientTabularSource({
    records: sourceRecords,
    columnSchema,
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    policies: {
      predicates: {
        equals: (record, descriptor, getValue) => descriptor.scope === 'global'
          ? Object.values(record).includes(descriptor.value)
          : getValue(record, descriptor.columnID) === descriptor.value,
      },
      comparators: {
        value: (left, right, descriptor, getValue) => {
          const a = getValue(left, descriptor.columnID);
          const b = getValue(right, descriptor.columnID);
          return a < b ? -1 : a > b ? 1 : 0;
        },
      },
    },
  });
}

test('TAB-SRC-01: client pipeline filters, ordered stable-sorts, then slices access', () => {
  const result = resolveClientTabularRequest(source(), request({
    queryRevision: 1,
    query: {
      filters: [{ id: 'active', scope: 'column', columnID: 'active', predicate: 'equals', value: true }],
      sort: [
        { id: 'score', columnID: 'score', direction: 'descending', comparator: 'value' },
        { id: 'team', columnID: 'team', direction: 'ascending', comparator: 'value' },
      ],
      groups: [], aggregates: [], pivots: [],
    },
    access: { kind: 'window', start: 1, count: 2 },
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows.map((row) => row.id), ['r4', 'r2']);
  assert.deepEqual(result.value.matchingLeafCount, { kind: 'known', value: 3 });
  assert.deepEqual(result.value.visibleRowCount, { kind: 'known', value: 3 });
  assert.deepEqual(result.value.access, { kind: 'window', start: 1, count: 2 });
});

test('TAB-SRC-02: client source revisions advance strictly per source generation', () => {
  const local = source();
  const first = resolveClientTabularRequest(local, request({ requestID: 1, sourceGeneration: 4 }));
  const second = resolveClientTabularRequest(local, request({ requestID: 2, sourceGeneration: 4 }));
  const independent = resolveClientTabularRequest(local, request({ requestID: 1, sourceGeneration: 5 }));
  assert.equal(first.ok && second.ok && independent.ok, true);
  assert.deepEqual([first.value.viewRevision, second.value.viewRevision, independent.value.viewRevision], [1, 2, 1]);
});

test('TAB-SRC-13: client view revisions use the final safe value and reject exhaustion', () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  const finalSafe = nextClientViewRevision(7, 7, maximum - 1);
  assert.equal(finalSafe.ok, true);
  assert.equal(finalSafe.value, maximum);
  const exhausted = nextClientViewRevision(7, 7, maximum);
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.error.class, 'resource-rejection');
  assert.equal(exhausted.error.code, 'revision-ceiling-reached');
  const reset = nextClientViewRevision(7, 8, maximum);
  assert.equal(reset.ok, true);
  assert.equal(reset.value, 1);
});

test('TAB-SRC-03: response synchronization rejects stale or mismatched envelopes atomically', () => {
  const active = request({ requestID: 7, sourceGeneration: 2 });
  const response = resolveClientTabularRequest(source(), active);
  assert.equal(response.ok, true);
  const accepted = synchronizeTabularView(active, response.value);
  assert.equal(accepted.ok, true);

  const duplicate = synchronizeTabularView(active, response.value, accepted.value);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'stale-view-revision');

  const wrongRequest = synchronizeTabularView({ ...active, requestID: 8 }, response.value, accepted.value);
  assert.equal(wrongRequest.ok, false);
  assert.equal(wrongRequest.error.code, 'response-envelope-mismatch');
  assert.equal(accepted.value.viewRevision, 1);
});

test('TAB-SRC-04: page responses require known totals while windows allow unknown totals', () => {
  const pageRequest = request();
  const base = resolveClientTabularRequest(source(), pageRequest);
  assert.equal(base.ok, true);
  const unknownPage = synchronizeTabularView(pageRequest, {
    ...base.value,
    visibleRowCount: { kind: 'unknown' },
  });
  assert.equal(unknownPage.ok, false);
  assert.equal(unknownPage.error.code, 'response-envelope-mismatch');

  const windowRequest = request({ access: { kind: 'window', start: 0, count: 2 } });
  const windowResponse = resolveClientTabularRequest(source(), windowRequest);
  assert.equal(windowResponse.ok, true);
  const unknownWindow = synchronizeTabularView(windowRequest, {
    ...windowResponse.value,
    matchingLeafCount: { kind: 'unknown' },
    visibleRowCount: { kind: 'unknown' },
  });
  assert.equal(unknownWindow.ok, true);
});

test('TAB-SRC-05: identity, policy, scan, and wire failures are typed and failure-atomic', () => {
  const duplicate = resolveClientTabularRequest(source([
    { id: 'same', name: 'a', team: 'a', score: 1, active: true },
    { id: 'same', name: 'b', team: 'b', score: 2, active: true },
  ]), request());
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate-identity');

  const missing = resolveClientTabularRequest(source(), request({
    query: {
      sort: [{ id: 's', columnID: 'name', direction: 'ascending', comparator: 'missing' }],
      filters: [], groups: [], aggregates: [], pivots: [],
    },
  }));
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'missing-policy-key');

  const throwing = resolveClientTabularRequest({ resolve: () => { throw new Error('transport escaped'); } }, request());
  assert.equal(throwing.ok, false);
  assert.equal(throwing.error.code, 'source-policy-failed');

  assert.throws(() => createClientTabularSource({
    records,
    columnSchema,
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    limits: { maxScanRecords: 2 },
  }), (error) => error.code === 'scan-record-ceiling-exceeded');
});

test('TAB-SRC-06: every response envelope coordinate and ordering rule rejects independently', () => {
  const active = request({ requestID: 7, sourceGeneration: 2, queryRevision: 3, expansionRevision: 4 });
  const resolved = resolveClientTabularRequest(source(), active);
  assert.equal(resolved.ok, true);
  const accepted = synchronizeTabularView(active, resolved.value);
  assert.equal(accepted.ok, true);

  const mismatches = [
    { ...resolved.value, protocolVersion: 2 },
    { ...resolved.value, requestID: 8 },
    { ...resolved.value, sourceGeneration: 3 },
    { ...resolved.value, queryRevision: 4 },
    { ...resolved.value, expansionRevision: 5 },
    { ...resolved.value, access: { kind: 'window', start: 0, count: 1 } },
  ];
  for (const response of mismatches) {
    const result = synchronizeTabularView(active, response, accepted.value);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'response-envelope-mismatch');
    assert.equal(accepted.value.viewRevision, 1);
  }

  const outOfOrder = synchronizeTabularView(active, { ...resolved.value, viewRevision: 0 }, accepted.value);
  assert.equal(outOfOrder.ok, false);
  assert.equal(outOfOrder.error.code, 'stale-view-revision');

  const schemaAhead = { ...active, columnSchemaRevision: 1 };
  const staleSchema = synchronizeTabularView(schemaAhead, resolved.value);
  assert.equal(staleSchema.ok, false);
  assert.equal(staleSchema.error.code, 'response-envelope-mismatch');
});

test('TAB-SRC-07: page one may bootstrap an empty total while later unknown pages reject', () => {
  const empty = source([]);
  const first = resolveClientTabularRequest(empty, request({
    access: { kind: 'page', page: 1, itemsPerPage: 25 },
  }));
  assert.equal(first.ok, true);
  assert.deepEqual(first.value.visibleRowCount, { kind: 'known', value: 0 });

  const later = resolveClientTabularRequest(empty, request({
    access: { kind: 'page', page: 2, itemsPerPage: 25 },
  }));
  assert.equal(later.ok, false);
  assert.equal(later.error.code, 'response-envelope-mismatch');
});

test('TAB-SRC-08: authoritative deletion deltas require unique valid row identities', () => {
  const active = request({ requestID: 9 });
  const resolved = resolveClientTabularRequest(source(), active);
  assert.equal(resolved.ok, true);
  assert.equal(synchronizeTabularView(active, { ...resolved.value, removedRowIDs: ['removed:r4'] }).ok, true);

  const duplicate = synchronizeTabularView(active, { ...resolved.value, removedRowIDs: ['removed:r4', 'removed:r4'] });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate-identity');

  const malformed = synchronizeTabularView(active, { ...resolved.value, removedRowIDs: [''] });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, 'invalid-id');

  let descriptorReads = 0;
  const oversized = new Proxy(['removed:a', 'removed:b'], {
    getOwnPropertyDescriptor(target, key) { descriptorReads += 1; return Reflect.getOwnPropertyDescriptor(target, key); },
  });
  const bounded = synchronizeTabularView(
    active,
    { ...resolved.value, removedRowIDs: oversized },
    null,
    { maxScanRecords: 1 },
  );
  assert.equal(bounded.ok, false);
  assert.equal(bounded.error.class, 'resource-rejection');
  assert.equal(bounded.error.code, 'scan-record-ceiling-exceeded');
  assert.equal(descriptorReads, 0);
});

test('ISSUE-056: response row identity is captured once before canonicalization', () => {
  const active = request();
  const resolved = resolveClientTabularRequest(source(), active);
  assert.equal(resolved.ok, true);
  let reads = 0;
  const row = {
    kind: 'leaf',
    get id() { reads += 1; return reads === 1 ? 'r2' : 'r1'; },
    cells: resolved.value.rows[1].cells,
  };
  const accepted = synchronizeTabularView(active, {
    ...resolved.value,
    rows: [resolved.value.rows[0], row, ...resolved.value.rows.slice(2)],
  });
  assert.equal(accepted.ok, true);
  assert.equal(reads, 1);
  assert.deepEqual(accepted.value.rows.map(({ id }) => id), ['r1', 'r2', 'r3', 'r4']);
});

test('TAB-SRC-11: response cross-invariants reject overlap, impossible counts, and incomplete ranges', () => {
  const active = request();
  const resolved = resolveClientTabularRequest(source(), active);
  assert.equal(resolved.ok, true);
  const cases = [
    { ...resolved.value, removedRowIDs: ['r1'] },
    { ...resolved.value, matchingLeafCount: { kind: 'known', value: 3 } },
    { ...resolved.value, visibleRowCount: { kind: 'known', value: 3 } },
  ];
  for (const response of cases) {
    const result = synchronizeTabularView(active, response);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'response-envelope-mismatch');
  }

  const windowRequest = request({ access: { kind: 'window', start: 0, count: 2 } });
  const windowResponse = resolveClientTabularRequest(source(), windowRequest);
  assert.equal(windowResponse.ok, true);
  const overfilled = synchronizeTabularView(windowRequest, {
    ...windowResponse.value,
    rows: [...windowResponse.value.rows, resolved.value.rows[2]],
  });
  assert.equal(overfilled.ok, false);
  assert.equal(overfilled.error.code, 'response-envelope-mismatch');
  const incomplete = synchronizeTabularView(windowRequest, {
    ...windowResponse.value,
    rows: windowResponse.value.rows.slice(0, 1),
  });
  assert.equal(incomplete.ok, false);
  assert.equal(incomplete.error.code, 'response-envelope-mismatch');
});

test('ISSUE-052: cold source work exposes each configurable descriptor axis', () => {
  const axisRecords = Array.from({ length: 10 }, (_, index) => ({ id: `axis-${index}`, value: index }));
  const run = (axis, count) => {
    const counters = { filter: 0, sort: 0, group: 0, aggregateElements: 0, pivotElements: 0 };
    const axisSource = createClientTabularSource({
      records: axisRecords,
      columnSchema: { revision: 0, columns: [{ id: 'value' }], headers: [] },
      getRowID: (record) => record.id,
      getValue: (record) => record.value,
      policies: {
        predicates: { all: () => { counters.filter += 1; return true; } },
        comparators: { equal: () => { counters.sort += 1; return 0; } },
        grouping: { all: (_record, _descriptor, depth) => { counters.group += 1; return { groupID: `group:${depth}`, label: depth }; } },
        aggregation: { sum: (items) => { counters.aggregateElements += items.length; return 0; } },
        pivot: {
          one: (items, descriptor) => {
            counters.pivotElements += items.length;
            return [{
              column: { id: `pivot:${descriptor.id}` },
              header: { kind: 'column', id: `header:${descriptor.id}`, columnID: `pivot:${descriptor.id}` },
              aggregateID: 'sum', matches: () => false,
            }];
          },
        },
      },
    });
    const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
    if (axis === 'filter') query.filters = Array.from({ length: count }, (_, index) => ({ id: `f${index}`, scope: 'global', predicate: 'all', value: null }));
    if (axis === 'sort') query.sort = Array.from({ length: count }, (_, index) => ({ id: `s${index}`, columnID: 'value', direction: 'ascending', comparator: 'equal' }));
    if (axis === 'group') query.groups = Array.from({ length: count }, (_, index) => ({ id: `g${index}`, columnID: 'value', policy: 'all' }));
    if (axis === 'aggregate') {
      query.groups = [{ id: 'g', columnID: 'value', policy: 'all' }];
      query.aggregates = Array.from({ length: count }, (_, index) => ({ id: `a${index}`, columnID: 'value', policy: 'sum' }));
    }
    if (axis === 'pivot') {
      query.groups = [{ id: 'g', columnID: 'value', policy: 'all' }];
      query.aggregates = [{ id: 'sum', columnID: 'value', policy: 'sum' }];
      query.pivots = Array.from({ length: count }, (_, index) => ({ id: `p${index}`, columnID: 'value', valuePolicy: 'one', aggregateIDs: ['sum'] }));
    }
    const result = resolveClientTabularRequest(axisSource, {
      protocolVersion: 1, requestID: 1, sourceGeneration: 0, queryRevision: 1, expansionRevision: 0,
      query, expansion: [], access: { kind: 'window', start: 0, count: 1 }, columnSchemaRevision: 0,
    });
    assert.equal(result.ok, true);
    return counters;
  };
  assert.equal(run('filter', 4).filter, 40);
  const sort = run('sort', 4).sort;
  assert.ok(sort > 0 && sort % 4 === 0);
  assert.equal(run('group', 4).group, 40);
  assert.equal(run('aggregate', 4).aggregateElements, 40);
  assert.equal(run('pivot', 4).pivotElements, 40);
});

test('TAB-SRC-12: initial client schema bootstrap advances later request echo monotonically', () => {
  const versioned = createClientTabularSource({
    records,
    columnSchema: { ...columnSchema, revision: 2 },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
  });
  const initial = request({ columnSchemaRevision: 0 });
  const first = resolveClientTabularRequest(versioned, initial);
  assert.equal(first.ok, true);
  assert.equal(first.value.columnSchema.revision, 2);
  assert.equal(synchronizeTabularView(initial, first.value).ok, true);

  const next = resolveClientTabularRequest(versioned, request({ requestID: 2, columnSchemaRevision: 2 }));
  assert.equal(next.ok, true);
  assert.equal(next.value.columnSchema.revision, 2);
  const stale = resolveClientTabularRequest(versioned, request({ requestID: 3, columnSchemaRevision: 1 }));
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'response-envelope-mismatch');
});

test('TAB-SRC-09: one current source, query, and expansion stage is retained by explicit revisions', () => {
  const counters = {
    getRowID: 0, getValue: 0, predicate: 0, comparator: 0,
    grouping: 0, aggregation: 0, pivot: 0,
  };
  const mutableRecords = [
    { id: 'r1', name: 'Alpha', team: 'A', score: 2, quarter: 'Q1', active: true },
    { id: 'r2', name: 'Beta', team: 'B', score: 4, quarter: 'Q2', active: true },
    { id: 'r3', name: 'Gamma', team: 'A', score: 1, quarter: 'Q2', active: false },
  ];
  const local = createClientTabularSource({
    records: mutableRecords,
    columnSchema: {
      revision: 0,
      columns: ['name', 'team', 'score', 'quarter', 'active'].map((id) => ({ id })),
      headers: [],
    },
    getRowID: (record) => { counters.getRowID += 1; return record.id; },
    getValue: (record, columnID) => { counters.getValue += 1; return record[columnID]; },
    policies: {
      predicates: {
        equals: (record, descriptor, getValue) => {
          counters.predicate += 1;
          return getValue(record, descriptor.columnID) === descriptor.value;
        },
      },
      comparators: {
        value: (left, right, descriptor, getValue) => {
          counters.comparator += 1;
          return getValue(left, descriptor.columnID) - getValue(right, descriptor.columnID);
        },
      },
      grouping: {
        team: (record, descriptor, depth, getValue) => {
          counters.grouping += 1;
          const value = getValue(record, descriptor.columnID);
          return { groupID: `${depth}:team:${value}`, label: value };
        },
      },
      aggregation: {
        sum: (items, descriptor, getValue) => {
          counters.aggregation += 1;
          return items.reduce((total, record) => total + getValue(record, descriptor.columnID), 0);
        },
      },
      pivot: {
        quarter: (items) => {
          counters.pivot += 1;
          return [...new Set(items.map((record) => record.quarter))].sort().map((quarter) => ({
            column: { id: `pivot:${quarter}:sum`, capabilities: [] },
            header: { kind: 'column', id: `header:${quarter}:sum`, columnID: `pivot:${quarter}:sum`, label: quarter },
            aggregateID: 'sum-score',
            matches: (record) => record.quarter === quarter,
          }));
        },
      },
    },
  });
  const query = {
    filters: [{ id: 'active', scope: 'column', columnID: 'active', predicate: 'equals', value: true }],
    sort: [{ id: 'score', columnID: 'score', direction: 'ascending', comparator: 'value' }],
    groups: [{ id: 'team', columnID: 'team', policy: 'team' }],
    aggregates: [{ id: 'sum-score', columnID: 'score', policy: 'sum' }],
    pivots: [{ id: 'quarter', columnID: 'quarter', valuePolicy: 'quarter', aggregateIDs: ['sum-score'] }],
  };
  const cold = resolveClientTabularRequest(local, request({ requestID: 1, queryRevision: 1, query }));
  assert.equal(cold.ok, true);
  const afterCold = { ...counters };

  const warm = resolveClientTabularRequest(local, request({
    requestID: 2,
    queryRevision: 1,
    query: structuredClone(query),
    access: { kind: 'window', start: 1, count: 1 },
  }));
  assert.equal(warm.ok, true);
  assert.deepEqual(counters, afterCold);

  const invalidatedQuery = resolveClientTabularRequest(local, request({ requestID: 3, queryRevision: 2, query: structuredClone(query) }));
  assert.equal(invalidatedQuery.ok, true);
  assert.equal(counters.getRowID, afterCold.getRowID);
  assert.ok(counters.predicate > afterCold.predicate);
  assert.ok(counters.comparator > afterCold.comparator);
  assert.ok(counters.grouping > afterCold.grouping);
  assert.ok(counters.pivot > afterCold.pivot);
  const afterQuery = { ...counters };

  const expanded = resolveClientTabularRequest(local, request({
    requestID: 4,
    queryRevision: 2,
    expansionRevision: 1,
    query: structuredClone(query),
    expansion: ['0:team:A'],
  }));
  assert.equal(expanded.ok, true);
  assert.equal(counters.getRowID, afterQuery.getRowID);
  assert.equal(counters.predicate, afterQuery.predicate);
  assert.equal(counters.comparator, afterQuery.comparator);
  assert.equal(counters.grouping, afterQuery.grouping);
  assert.equal(counters.aggregation, afterQuery.aggregation);
  assert.equal(counters.pivot, afterQuery.pivot);
  assert.ok(counters.getValue > afterQuery.getValue);

  mutableRecords[0].name = 'Changed';
  const retained = resolveClientTabularRequest(local, request({
    requestID: 5, queryRevision: 2, expansionRevision: 1, query, expansion: ['0:team:A'],
  }));
  assert.equal(retained.ok, true);
  assert.equal(retained.value.rows.find((row) => row.id === 'r1').cells.name, 'Alpha');

  const refreshed = resolveClientTabularRequest(local, request({
    requestID: 6, sourceGeneration: 1, queryRevision: 2, expansionRevision: 1, query, expansion: ['0:team:A'],
  }));
  assert.equal(refreshed.ok, true);
  assert.equal(refreshed.value.rows.find((row) => row.id === 'r1').cells.name, 'Changed');
  assert.ok(counters.getRowID > afterQuery.getRowID);

  const stale = resolveClientTabularRequest(local, request({ requestID: 7, sourceGeneration: 0, queryRevision: 2, query }));
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-source-generation');
});

test('TAB-SRC-10: response columns resolve nested object and array cell paths while direct keys win', () => {
  const active = request();
  const response = {
    ...active,
    viewRevision: 1,
    matchingLeafCount: { kind: 'known', value: 1 },
    visibleRowCount: { kind: 'known', value: 1 },
    rows: [{
      kind: 'leaf',
      id: 'nested',
      cells: {
        profile: { name: 'Nested' },
        items: [{ price: 42 }],
        'profile.name': 'Direct',
      },
    }],
    columnSchema: {
      revision: 0,
      columns: [{ id: 'profile.name' }, { id: 'items[0].price' }],
      headers: [],
    },
    removedRowIDs: [],
  };
  const accepted = synchronizeTabularView(active, response);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value.rows[0].cells.profile.name, 'Nested');
  assert.equal(accepted.value.rows[0].cells.items[0].price, 42);
  assert.equal(accepted.value.rows[0].cells['profile.name'], 'Direct');
  assert.equal(Object.isFrozen(accepted.value.rows[0].cells.profile), true);

  const missing = synchronizeTabularView(active, {
    ...response,
    rows: [{ kind: 'leaf', id: 'nested', cells: { profile: { name: 'Nested' }, items: [] } }],
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'response-envelope-mismatch');

  const malformed = synchronizeTabularView(active, {
    ...response,
    rows: [{ kind: 'leaf', id: 'nested', cells: { items: [{ price: 42 }] } }],
    columnSchema: { revision: 0, columns: [{ id: 'items.[0].price' }], headers: [] },
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, 'response-envelope-mismatch');

  let getterReads = 0;
  const accessorItems = [null];
  Object.defineProperty(accessorItems, 0, { enumerable: true, configurable: true, get() { getterReads += 1; throw new Error('must not execute'); } });
  const accessor = synchronizeTabularView(active, {
    ...response,
    rows: [{
      kind: 'leaf', id: 'nested',
      cells: { profile: { name: 'Nested' }, items: accessorItems, 'profile.name': 'Direct' },
    }],
  });
  assert.equal(accessor.ok, false);
  assert.equal(accessor.error.code, 'invalid-query-value');
  assert.equal(getterReads, 0);
});
