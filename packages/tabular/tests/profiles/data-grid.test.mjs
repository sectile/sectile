import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataGrid } from '../../.verification-dist/data-grid.js';
import { createClientTabularSource, resolveClientTabularRequest } from '../../.verification-dist/source.js';

const columns = [
  { id: 'name', capabilities: ['edit'] },
  { id: 'score', capabilities: [] },
];

function source(records = [
  { id: 'r1', name: 'Alpha', score: 1 },
  { id: 'r2', name: 'Beta', score: 2 },
  { id: 'r3', name: 'Gamma', score: 3 },
]) {
  return createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns, headers: [] },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
  });
}

function resolve(controller, records) {
  const request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
  assert.notEqual(request, null);
  const response = resolveClientTabularRequest(source(records), request);
  assert.equal(response.ok, true);
  return response.value;
}

test('TAB-GRD-01: direct focus and axis movement skip disabled cells deterministically', () => {
  const controller = createDataGrid({
    columns,
    isCellDisabled: ({ rowID, columnID }) => rowID === 'r2' && columnID === 'name',
  });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  assert.equal(controller.dispatch({ type: 'focus-cell', cell: { rowID: 'r1', columnID: 'name' } }).ok, true);
  assert.equal(controller.dispatch({ type: 'move-cell', direction: 'down' }).ok, true);
  assert.deepEqual(controller.getSnapshot().cursor.current, { rowID: 'r3', columnID: 'name' });
  assert.equal(controller.dispatch({ type: 'focus-cell', cell: { rowID: 'missing', columnID: 'name' } }).ok, false);
});

test('TAB-GRD-02: edit events emit exact semantic payloads without reveal or native-table commands', () => {
  const controller = createDataGrid({ columns });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  const observed = [];
  controller.subscribeCommands((command) => observed.push(command));

  const cell = { rowID: 'r1', columnID: 'name' };
  controller.dispatch({ type: 'focus-cell', cell });
  const begun = controller.dispatch({ type: 'begin-edit' });
  assert.equal(begun.ok, true);
  assert.deepEqual(begun.value.commands, [{ type: 'begin-edit', cell }]);
  const committed = controller.dispatch({ type: 'commit-edit', value: 'Renamed' });
  assert.equal(committed.ok, true);
  assert.deepEqual(committed.value.commands, [{ type: 'commit-edit', cell, value: 'Renamed' }]);
  assert.equal(observed.some(({ type }) => type.includes('reveal') || type === 'request-value-commit'), false);

  controller.dispatch({ type: 'focus-cell', cell: { rowID: 'r1', columnID: 'score' } });
  assert.equal(controller.dispatch({ type: 'begin-edit' }).ok, false);
  assert.equal(controller.dispatch({ type: 'request-value-commit', cell, value: 'wrong-profile' }).error.code, 'profile-view-mismatch');
});

test('TAB-GRD-03: hierarchical views reject before changing the flat profile state', () => {
  const controller = createDataGrid({ columns });
  const response = resolve(controller);
  const before = controller.getSnapshot();
  const group = {
    kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: false,
    cells: { name: 'A', score: 1 },
  };
  const result = controller.synchronizeView({ ...response, rows: [group], visibleRowCount: { kind: 'known', value: 1 } });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'profile-view-mismatch');
  assert.equal(controller.getSnapshot(), before);
});

test('TAB-GRD-04: removed edit targets cancel before cursor recovery and source reset', () => {
  const controller = createDataGrid({ columns });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  const observed = [];
  controller.subscribeCommands((command) => observed.push(command));
  const edited = { rowID: 'r2', columnID: 'name' };
  controller.dispatch({ type: 'focus-cell', cell: edited });
  controller.dispatch({ type: 'begin-edit' });
  assert.equal(controller.requestView().ok, true);
  const replacement = { ...resolve(controller, [
    { id: 'r1', name: 'Alpha', score: 1 },
    { id: 'r3', name: 'Gamma', score: 3 },
  ]), viewRevision: 2, removedRowIDs: ['r2'] };
  assert.equal(controller.synchronizeView(replacement).ok, true);
  assert.deepEqual(observed.find((command) => command.type === 'cancel-edit'), {
    type: 'cancel-edit', cell: edited, reason: 'cell-removed',
  });
  assert.deepEqual(controller.getSnapshot().cursor.current, { rowID: 'r3', columnID: 'name' });

  controller.dispatch({ type: 'begin-edit' });
  const reset = controller.dispatch({ type: 'replace-source' });
  assert.equal(reset.ok, true);
  assert.equal(reset.value.commands[0].type, 'cancel-edit');
  assert.equal(reset.value.commands[0].reason, 'source-reset');
  assert.equal(reset.value.commands[1].type, 'request-view');
});

test('TAB-GRD-05: request execution remains single-owner and disposable', () => {
  const controller = createDataGrid({ columns });
  const requests = [];
  const attached = controller.attachRequestExecutor((command) => requests.push(command));
  assert.equal(attached.ok, true);
  assert.equal(requests.length, 1);
  assert.equal(controller.attachRequestExecutor(() => {}).error.code, 'duplicate-source-executor');
  attached.value();
  const reattached = controller.attachRequestExecutor(() => {});
  assert.equal(reattached.ok, true);
  const before = controller.getSnapshot();
  controller.dispose();
  controller.dispose();
  reattached.value();
  const failures = [
    controller.dispatch({ type: 'request-view' }),
    controller.synchronizeView({}),
    controller.syncControlledValues({}),
    controller.requestView(),
    controller.abandonRequest(1),
    controller.attachRequestExecutor(() => assert.fail('disposed executor attached')),
  ];
  for (const result of failures) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'controller-disposed');
    assert.equal(controller.getSnapshot(), before);
  }
  controller.subscribeCommands(() => assert.fail('disposed observer attached'))();
  assert.doesNotThrow(() => controller.getProjection());
});

test('TAB-GRD-06: projection cells and indexes are retained across adjacent movement', () => {
  let disabledChecks = 0;
  const controller = createDataGrid({
    columns,
    isCellDisabled: () => { disabledChecks += 1; return false; },
  });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  const first = controller.getProjection();
  const second = controller.getProjection();
  assert.notEqual(second, first);
  assert.equal(second.rows, first.rows);
  assert.equal(second.columns, first.columns);
  assert.equal(second.rows[0].cells[0], first.rows[0].cells[0]);

  assert.equal(controller.dispatch({ type: 'focus-cell', cell: first.rows[0].cells[0] }).ok, true);
  const afterFocus = disabledChecks;
  assert.equal(controller.dispatch({ type: 'move-cell', direction: 'down' }).ok, true);
  assert.equal(disabledChecks, afterFocus + 1);
  const afterMove = controller.getProjection();
  assert.equal(afterMove.rows, first.rows);
  assert.equal(afterMove.rows[1].cells[0], first.rows[1].cells[0]);
});

test('controlled DataGrid callback synchronization preserves the latest shared-base revision', () => {
  const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
  const next = { ...query, sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }] };
  let controller;
  controller = createDataGrid({
    columns,
    controlled: { query: true },
    initialValues: { query },
    onQueryChange(value) {
      assert.equal(controller.syncControlledValues({ query: value }).ok, true);
    },
  });
  const requests = [];
  controller.subscribeCommands((command) => {
    if (command.type === 'request-view') requests.push(command.request);
  });

  const outer = controller.dispatch({ type: 'set-query', query: next });
  assert.equal(outer.ok, true);
  assert.deepEqual(controller.getSnapshot().tabular.state.query, next);
  assert.notEqual(controller.getSnapshot().tabular.state.query, next);
  assert.equal(controller.getSnapshot().revision, 1);
  assert.equal(controller.getSnapshot().tabular.revision, 2);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].requestID, controller.getSnapshot().tabular.state.requestState.pendingRequest.requestID);
});

test('TAB-GRD-07: controlled cursor and edit proposals wait for owner sync including null and navigation', () => {
  const cursorProposals = [];
  const editProposals = [];
  const controller = createDataGrid({
    columns,
    controlled: { cursor: true, edit: true },
    initialValues: { cursor: { current: null }, edit: { kind: 'navigation' } },
    onCursorChange: (value) => cursorProposals.push(value),
    onEditStateChange: (value) => editProposals.push(value),
  });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  const cell = { rowID: 'r2', columnID: 'name' };
  const focused = controller.dispatch({ type: 'focus-cell', cell });
  assert.equal(focused.ok, true);
  assert.deepEqual(focused.value.commands, []);
  assert.equal(controller.getSnapshot().cursor.current, null);
  assert.deepEqual(cursorProposals.at(-1), { current: cell });

  assert.equal(controller.syncControlledValues({ cursor: { current: cell }, edit: { kind: 'navigation' } }).ok, true);
  assert.deepEqual(controller.getSnapshot().cursor.current, cell);
  const begun = controller.dispatch({ type: 'begin-edit' });
  assert.equal(begun.ok, true);
  assert.deepEqual(begun.value.commands, []);
  assert.deepEqual(controller.getSnapshot().edit, { kind: 'navigation' });
  assert.deepEqual(editProposals.at(-1), { kind: 'editing', cell });

  assert.equal(controller.syncControlledValues({ cursor: { current: cell }, edit: { kind: 'editing', cell } }).ok, true);
  assert.deepEqual(controller.getSnapshot().edit, { kind: 'editing', cell });
  assert.equal(controller.syncControlledValues({ cursor: { current: null }, edit: { kind: 'navigation' } }).ok, true);
  assert.equal(controller.getSnapshot().cursor.current, null);
  assert.deepEqual(controller.getSnapshot().edit, { kind: 'navigation' });
});

test('TAB-GRD-08: async first-view default cursor is applied exactly once', () => {
  const preferred = { rowID: 'r2', columnID: 'score' };
  const controller = createDataGrid({ columns, initialValues: { cursor: { current: preferred } } });
  assert.equal(controller.getSnapshot().cursor.current, null);
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  assert.deepEqual(controller.getSnapshot().cursor.current, preferred);
  const replacement = { rowID: 'r1', columnID: 'name' };
  assert.equal(controller.dispatch({ type: 'focus-cell', cell: replacement }).ok, true);
  assert.equal(controller.requestView().ok, true);
  assert.equal(controller.synchronizeView({ ...resolve(controller), viewRevision: 2 }).ok, true);
  assert.deepEqual(controller.getSnapshot().cursor.current, replacement);
});
