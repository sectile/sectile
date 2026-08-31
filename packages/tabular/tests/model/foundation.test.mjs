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
  assert.deepEqual(state.query, query);

  const illegal = reconcileTabularState(model, state, { query, rowSelection: state.rowSelection });
  assert.equal(illegal.ok, false);
  assert.equal(illegal.error.code, 'uncontrolled-value-update');

  const snapshot = Object.freeze({ revision: 2, state });
  const stale = applyTabularEvent(model, snapshot, 1, { type: 'sync-controlled', values: { query } });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.error.details.currentRevision, 2);
});

test('TAB-MOD-06: every state slice is canonical, bounded, and detached from caller containers', () => {
  const query = {
    sort: [],
    filters: [{ id: 'active', scope: 'column', columnID: 'status', predicate: 'equals', value: ['open'] }],
    groups: [],
    aggregates: [],
    pivots: [],
  };
  const rowIDs = ['row-a'];
  const order = ['name', 'status'];
  const expansion = ['group-a'];
  const model = createTabularModel({
    columns,
    initialValues: {
      query,
      rowSelection: { kind: 'explicit-rows', rowIDs },
      columnState: { order, hidden: [], pinnedStart: [], pinnedEnd: ['status'] },
      expansion,
    },
  });
  rowIDs.push('row-b');
  order.reverse();
  expansion.push('group-b');
  query.filters[0].value.push('closed');

  const state = tryCreateTabularState(model).value;
  assert.deepEqual(state.rowSelection.rowIDs, ['row-a']);
  assert.deepEqual(state.columnState.order, ['name', 'status']);
  assert.deepEqual(state.expansion, ['group-a']);
  assert.deepEqual(state.query.filters[0].value, ['open']);
  assert.equal(Object.isFrozen(state.query.filters[0].value), true);

  const invalidCases = [
    [{ query: { sort: [{ id: 'x', columnID: 'missing', direction: 'ascending', comparator: 'text' }], filters: [], groups: [], aggregates: [], pivots: [] } }, 'invalid-query-descriptor'],
    [{ columnState: { order: ['name', 'missing'], hidden: [], pinnedStart: [], pinnedEnd: [] } }, 'invalid-controlled-shape'],
    [{ accessState: { kind: 'page', page: 0, itemsPerPage: 25, visibleRowCount: null, pagination: null } }, 'invalid-controlled-shape'],
    [{ expansion: ['same', 'same'] }, 'duplicate-identity'],
  ];
  for (const [initialValues, code] of invalidCases) {
    const result = tryCreateTabularModel({ columns, initialValues });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }
  const bounded = tryCreateTabularModel({
    columns,
    limits: { maxSelectionIDs: 1 },
    initialValues: { expansion: ['one', 'two'] },
  });
  assert.equal(bounded.ok, false);
  assert.equal(bounded.error.code, 'selection-id-ceiling-exceeded');
});

test('TAB-MOD-07: fallback headers and explicit group topology are complete unique and contiguous', () => {
  const invalidFallback = tryCreateTabularModel({ columns: [{ id: 'a', headerNodeID: '' }] });
  assert.equal(invalidFallback.ok, false);
  assert.equal(invalidFallback.error.code, 'invalid-id');

  const duplicateFallback = tryCreateTabularModel({
    columns: [{ id: 'a', headerNodeID: 'shared' }, { id: 'b', headerNodeID: 'shared' }],
  });
  assert.equal(duplicateFallback.ok, false);
  assert.equal(duplicateFallback.error.code, 'duplicate-identity');

  const missingLeaf = tryCreateTabularModel({
    columns: [{ id: 'a' }, { id: 'b' }],
    headers: [{ kind: 'column', id: 'header:a', columnID: 'a' }],
  });
  assert.equal(missingLeaf.ok, false);
  assert.equal(missingLeaf.error.code, 'invalid-header-node');

  const nonContiguous = tryCreateTabularModel({
    columns: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    headers: [
      { kind: 'group', id: 'group:ac', children: [
        { kind: 'column', id: 'header:a', columnID: 'a' },
        { kind: 'column', id: 'header:c', columnID: 'c' },
      ] },
      { kind: 'column', id: 'header:b', columnID: 'b' },
    ],
  });
  assert.equal(nonContiguous.ok, false);
  assert.equal(nonContiguous.error.code, 'invalid-header-node');

  const model = createTabularModel({
    columns: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    headers: [
      { kind: 'group', id: 'group:ab', children: [
        { kind: 'column', id: 'header:a', columnID: 'a' },
        { kind: 'column', id: 'header:b', columnID: 'b' },
      ] },
      { kind: 'column', id: 'header:c', columnID: 'c' },
    ],
  });
  const invalidState = tryCreateTabularState(model, {
    columnState: { order: ['a', 'c', 'b'], hidden: [], pinnedStart: [], pinnedEnd: [] },
  });
  assert.equal(invalidState.ok, false);
  assert.equal(invalidState.error.code, 'invalid-header-node');
});
