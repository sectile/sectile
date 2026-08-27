import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientTabularSource, resolveClientTabularRequest } from '../../.verification-dist/source.js';

const records = [
  { id: 'r1', name: 'Beta', team: 'A', score: 2 },
  { id: 'r2', name: 'Alpha', team: 'B', score: 4 },
  { id: 'r3', name: 'Gamma', team: 'A', score: 3 },
];
const schema = {
  revision: 0,
  columns: [{ id: 'name' }, { id: 'team' }, { id: 'score' }],
  headers: [],
};

function makeSource(groupID = (record, _descriptor, depth) => `${depth}:team:${record.team}`) {
  return createClientTabularSource({
    records,
    columnSchema: schema,
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    policies: {
      predicates: {
        none: () => false,
      },
      comparators: {
        text: (left, right, descriptor, getValue) => String(getValue(left, descriptor.columnID)).localeCompare(String(getValue(right, descriptor.columnID))),
      },
      grouping: {
        team: (record, descriptor, depth, getValue) => ({
          groupID: groupID(record, descriptor, depth),
          label: getValue(record, descriptor.columnID),
        }),
      },
      aggregation: {
        sum: (groupRecords, descriptor, getValue) => groupRecords.reduce((total, record) => total + getValue(record, descriptor.columnID), 0),
      },
    },
  });
}

function request(expansion = []) {
  return {
    protocolVersion: 1,
    requestID: 1,
    sourceGeneration: 0,
    queryRevision: 1,
    expansionRevision: expansion.length,
    query: {
      sort: [{ id: 'by-name', columnID: 'name', direction: 'ascending', comparator: 'text' }],
      filters: [],
      groups: [{ id: 'by-team', columnID: 'team', policy: 'team' }],
      aggregates: [{ id: 'sum-score', columnID: 'score', policy: 'sum' }],
      pivots: [],
    },
    expansion,
    access: { kind: 'page', page: 1, itemsPerPage: 25 },
    columnSchemaRevision: 0,
  };
}

test('TAB-ADV-01: groups follow first-seen stable sorted order and aggregate filtered descendants', () => {
  const result = resolveClientTabularRequest(makeSource(), request());
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows.map((row) => row.id), ['0:team:B', '0:team:A']);
  assert.deepEqual(result.value.rows.map((row) => row.cells.score), [4, 5]);
  assert.deepEqual(result.value.visibleRowCount, { kind: 'known', value: 2 });
  assert.deepEqual(result.value.matchingLeafCount, { kind: 'known', value: 3 });
});

test('TAB-ADV-02: expansion inserts ordered leaf rows without changing matching leaf count', () => {
  const result = resolveClientTabularRequest(makeSource(), request(['0:team:A']));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows.map((row) => row.id), ['0:team:B', '0:team:A', 'r1', 'r3']);
  assert.deepEqual(result.value.rows.map((row) => row.kind), ['group', 'group', 'leaf', 'leaf']);
  assert.deepEqual(result.value.visibleRowCount, { kind: 'known', value: 4 });
  assert.deepEqual(result.value.matchingLeafCount, { kind: 'known', value: 3 });
});

test('TAB-ADV-03: synthetic group identities cannot collide with records or another path', () => {
  const collision = resolveClientTabularRequest(makeSource(() => 'r1'), request());
  assert.equal(collision.ok, false);
  assert.equal(collision.error.code, 'duplicate-identity');

  const unknownExpansion = resolveClientTabularRequest(makeSource(), request(['missing-group']));
  assert.equal(unknownExpansion.ok, false);
  assert.equal(unknownExpansion.error.code, 'response-envelope-mismatch');
});

test('TAB-ADV-04: aggregate and group policies are required and failures stay atomic', () => {
  const missing = createClientTabularSource({
    records,
    columnSchema: schema,
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
  });
  const result = resolveClientTabularRequest(missing, request());
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'missing-policy-key');
});

test('TAB-ADV-05: pivot columns keep policy order, stable IDs, and read-only aggregate cells', () => {
  const pivotRecords = [
    { id: 'r1', name: 'Beta', team: 'A', score: 2, quarter: 'Q2' },
    { id: 'r2', name: 'Alpha', team: 'B', score: 4, quarter: 'Q1' },
    { id: 'r3', name: 'Gamma', team: 'A', score: 3, quarter: 'Q1' },
  ];
  const pivotSource = createClientTabularSource({
    records: pivotRecords,
    columnSchema: {
      revision: 0,
      columns: [...schema.columns, { id: 'quarter' }],
      headers: [],
    },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    policies: {
      comparators: {
        text: (left, right, descriptor, getValue) => String(getValue(left, descriptor.columnID)).localeCompare(String(getValue(right, descriptor.columnID))),
      },
      grouping: {
        team: (record) => ({ groupID: `team:${record.team}`, label: record.team }),
      },
      aggregation: {
        sum: (groupRecords, descriptor, getValue) => groupRecords.reduce((total, record) => total + getValue(record, descriptor.columnID), 0),
      },
      pivot: {
        quarter: (sourceRecords) => [...new Set(sourceRecords.map((record) => record.quarter))].map((quarter) => ({
          column: { id: `pivot:${quarter}:sum`, capabilities: [] },
          header: { kind: 'column', id: `header:${quarter}:sum`, columnID: `pivot:${quarter}:sum`, label: quarter },
          aggregateID: 'sum-score',
          matches: (record) => record.quarter === quarter,
        })),
      },
    },
  });
  const pivotRequest = {
    ...request(),
    queryRevision: 2,
    query: {
      ...request().query,
      groups: [{ id: 'by-team', columnID: 'team', policy: 'team' }],
      aggregates: [{ id: 'sum-score', columnID: 'score', policy: 'sum' }],
      pivots: [{ id: 'by-quarter', columnID: 'quarter', valuePolicy: 'quarter', aggregateIDs: ['sum-score'] }],
    },
  };
  const result = resolveClientTabularRequest(pivotSource, pivotRequest);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.columnSchema.columns.map((column) => column.id), [
    'name', 'team', 'score', 'quarter', 'pivot:Q1:sum', 'pivot:Q2:sum',
  ]);
  assert.deepEqual(result.value.rows.map((row) => [row.id, row.cells['pivot:Q1:sum'], row.cells['pivot:Q2:sum']]), [
    ['team:B', 4, 0],
    ['team:A', 3, 2],
  ]);
  assert.deepEqual(result.value.columnSchema.columns.slice(-2).map((column) => column.capabilities), [[], []]);
});

test('TAB-ADV-06: sliced descendants retain context-only ancestors outside the access range', () => {
  const nestedRequest = {
    ...request(['0:team:A', '1:team:A']),
    queryRevision: 2,
    expansionRevision: 2,
    query: {
      ...request().query,
      groups: [
        { id: 'by-team', columnID: 'team', policy: 'team' },
        { id: 'by-team-again', columnID: 'team', policy: 'team' },
      ],
    },
    access: { kind: 'window', start: 3, count: 1 },
  };
  const result = resolveClientTabularRequest(makeSource(), nestedRequest);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows.map(({ id, contextOnly }) => [id, contextOnly ?? false]), [
    ['0:team:A', true],
    ['1:team:A', true],
    ['r1', false],
  ]);
  assert.deepEqual(result.value.visibleRowCount, { kind: 'known', value: 5 });
});

test('TAB-ADV-07: client grouping does not fabricate empty groups after filtering', () => {
  const emptyRequest = {
    ...request(),
    queryRevision: 2,
    query: {
      ...request().query,
      filters: [{ id: 'none', scope: 'global', predicate: 'none', value: null }],
    },
  };
  const result = resolveClientTabularRequest(makeSource(), emptyRequest);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows, []);
  assert.deepEqual(result.value.matchingLeafCount, { kind: 'known', value: 0 });
  assert.deepEqual(result.value.visibleRowCount, { kind: 'known', value: 0 });
});
