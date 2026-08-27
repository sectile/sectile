import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTabularEvent,
  createTabularModel,
  encodeTabularCellID,
  reconcileTabularState,
  tryCreateTabularModel,
  tryCreateTabularState,
  tryDecodeTabularCellID,
} from '../../.verification-dist/model.js';

const columns = Object.freeze([
  Object.freeze({ id: 'name', label: 'Name', capabilities: Object.freeze(['sort', 'filter']) }),
  Object.freeze({ id: 'status', label: 'Status', initialPin: 'end' }),
]);

test('TAB-MOD-01: canonical limits, immutable columns, and deterministic initial state', () => {
  const model = createTabularModel({ columns });
  assert.deepEqual(model.limits, {
    maxIDCodeUnits: 1_024,
    maxRows: 100_000,
    maxColumns: 10_000,
    maxProjectedCells: 1_000_000,
    maxGroupDepth: 1_024,
    maxSortRules: 64,
    maxFilterRules: 256,
    maxGroupDescriptors: 64,
    maxAggregateDescriptors: 256,
    maxPivotDescriptors: 64,
    maxPivotColumns: 10_000,
    maxSelectionIDs: 100_000,
    maxScanRecords: 1_000_000,
    maxQueryValueDepth: 32,
    maxQueryValueCodeUnits: 1_048_576,
    maxQueryValueNodes: 100_000,
    maxLiveRequestGenerations: 1,
  });
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.columns), true);
  const state = tryCreateTabularState(model);
  assert.equal(state.ok, true);
  assert.deepEqual(state.value.columnState, {
    order: ['name', 'status'],
    hidden: [],
    pinnedStart: [],
    pinnedEnd: ['status'],
  });
  assert.deepEqual(state.value.requestState, { kind: 'idle', pendingRequest: null });
  assert.deepEqual(state.value.acceptedViewState, { kind: 'none' });
});

test('TAB-MOD-02: every resource limit is a positive safe integer', () => {
  const keys = [
    'maxIDCodeUnits', 'maxRows', 'maxColumns', 'maxProjectedCells', 'maxGroupDepth',
    'maxSortRules', 'maxFilterRules', 'maxGroupDescriptors', 'maxAggregateDescriptors',
    'maxPivotDescriptors', 'maxPivotColumns', 'maxSelectionIDs', 'maxScanRecords',
    'maxQueryValueDepth', 'maxQueryValueCodeUnits', 'maxQueryValueNodes',
    'maxLiveRequestGenerations',
  ];
  for (const key of keys) {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = tryCreateTabularModel({ columns: [], limits: { [key]: value } });
      assert.equal(result.ok, false, `${key} accepted ${value}`);
      assert.equal(result.error.code, 'invalid-limit');
    }
  }
});

test('TAB-MOD-03: column and header identities reject malformed, duplicate, and over-depth input', () => {
  for (const id of ['', '\ud800', '\udc00']) {
    const result = tryCreateTabularModel({ columns: [{ id }] });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'invalid-id');
  }
  const duplicate = tryCreateTabularModel({ columns: [{ id: 'a' }, { id: 'a' }] });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate-identity');

  const deepHeader = {
    kind: 'group', id: 'one', children: [{
      kind: 'group', id: 'two', children: [{ kind: 'column', id: 'leaf', columnID: 'a' }],
    }],
  };
  const depth = tryCreateTabularModel({ columns: [{ id: 'a' }], headers: [deepHeader], limits: { maxGroupDepth: 2 } });
  assert.equal(depth.ok, false);
  assert.equal(depth.error.code, 'group-depth-ceiling-exceeded');
});

test('TAB-MOD-04: cell IDs round-trip without collisions across delimiter and Unicode data', () => {
  const ids = ['', ':', '1:', 'a:b', '한글', '🧱', '0', '00', '\n'];
  const encoded = new Set();
  let validPairs = 0;
  for (const rowID of ids) {
    for (const columnID of ids) {
      if (rowID === '' || columnID === '') continue;
      const cellID = encodeTabularCellID({ rowID, columnID });
      assert.equal(encoded.has(cellID), false, cellID);
      encoded.add(cellID);
      const decoded = tryDecodeTabularCellID(cellID);
      assert.equal(decoded.ok, true);
      assert.deepEqual(decoded.value, { rowID, columnID });
      validPairs += 1;
    }
  }
  assert.equal(encoded.size, validPairs);
  for (const malformed of ['', 'c2:1:ab', 'c1:x:ab', 'c1:2:a1:b', 'c1:1:a2:b']) {
    const result = tryDecodeTabularCellID(malformed);
    assert.equal(result.ok, false, malformed);
    assert.equal(result.error.code, 'invalid-cell-codec');
  }
});

test('TAB-MOD-05: controlled ownership is fixed and stale revisions reject atomically', () => {
  const query = Object.freeze({ sort: [], filters: [], groups: [], aggregates: [], pivots: [] });
  const model = createTabularModel({
    columns,
    controlled: { query: true },
    initialValues: { query },
  });
  const stateResult = tryCreateTabularState(model);
  assert.equal(stateResult.ok, true);
  const state = stateResult.value;

  const missing = reconcileTabularState(model, state, {});
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'controlled-value-required');
  assert.equal(state.query, query);

  const illegal = reconcileTabularState(model, state, { query, rowSelection: state.rowSelection });
  assert.equal(illegal.ok, false);
  assert.equal(illegal.error.code, 'uncontrolled-value-update');

  const snapshot = Object.freeze({ revision: 2, state });
  const stale = applyTabularEvent(model, snapshot, 1, { type: 'sync-controlled', values: { query } });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.error.details.currentRevision, 2);
});
