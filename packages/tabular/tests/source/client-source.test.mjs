import assert from 'node:assert/strict';
import test from 'node:test';
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
