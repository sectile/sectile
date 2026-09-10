import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataGrid } from '../../.verification-dist/data-grid.js';
import { nextRevision } from '../../.verification-dist/internal/foundation.js';
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

test('ISSUE-060: grid profile validation only inspects bounded canonical response rows', () => {
  const controller = createDataGrid({ columns, limits: { maxRows: 1 } });
  const base = resolve(controller);
  let kindReads = 0;
  const rows = base.rows.slice(0, 2).map((row) => ({
    get kind() { kindReads += 1; return row.kind; },
    id: row.id,
    cells: row.cells,
  }));
  const oversized = controller.synchronizeView({ ...base, rows });
  assert.equal(oversized.ok, false);
  assert.equal(oversized.error.code, 'row-ceiling-exceeded');
  assert.equal(kindReads, 0);

  const malformed = controller.synchronizeView({ ...base, rows: null });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, 'row-ceiling-exceeded');
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
  const pendingFirst = controller.getProjection();
  const pendingSecond = controller.getProjection();
  assert.equal(pendingSecond.rows, pendingFirst.rows);
  assert.equal(pendingSecond.columns, pendingFirst.columns);
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

test('ISSUE-059: failed controlled Grid synchronization leaves the shared base and requests untouched', () => {
  const visible = { order: ['name', 'score'], hidden: [], pinnedStart: [], pinnedEnd: [] };
  const hidden = { ...visible, hidden: ['name'] };
  const cell = { rowID: 'r1', columnID: 'name' };
  const controller = createDataGrid({
    columns,
    controlled: { columnState: true, cursor: true },
    initialValues: { columnState: visible, cursor: { current: null } },
  });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  assert.equal(controller.syncControlledValues({ columnState: visible, cursor: { current: cell } }).ok, true);
  const before = controller.getSnapshot();
  const beforeProjection = controller.getProjection();
  const rejected = controller.syncControlledValues({ columnState: hidden, cursor: { current: cell } });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'invalid-edit-target');
  assert.equal(controller.getSnapshot(), before);
  assert.deepEqual(controller.getProjection().columns, beforeProjection.columns);

  const query = controller.getSnapshot().tabular.state.query;
  const requestController = createDataGrid({
    columns,
    controlled: { query: true, cursor: true },
    initialValues: { query, cursor: { current: null } },
  });
  assert.equal(requestController.synchronizeView(resolve(requestController)).ok, true);
  const currentQuery = requestController.getSnapshot().tabular.state.query;
  assert.equal(requestController.syncControlledValues({ query: currentQuery, cursor: { current: cell } }).ok, true);
  let requests = 0;
  assert.equal(requestController.attachRequestExecutor(() => { requests += 1; }).ok, true);
  requests = 0;
  const requestBefore = requestController.getSnapshot();
  const nextQuery = { ...currentQuery, sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }] };
  const requestRejected = requestController.syncControlledValues({
    query: nextQuery,
    cursor: { current: { rowID: 'missing', columnID: 'name' } },
  });
  assert.equal(requestRejected.ok, false);
  assert.equal(requestRejected.error.code, 'invalid-edit-target');
  assert.equal(requests, 0);
  assert.equal(requestController.getSnapshot(), requestBefore);
});

test('ISSUE-064: committed Grid publication completes callbacks and a stable observer cohort', () => {
  const trace = [];
  const cursorError = new Error('cursor callback failed');
  const controller = createDataGrid({
    columns,
    onCursorChange() { trace.push('cursor'); throw cursorError; },
    onEditStateChange() { trace.push('edit'); },
  });
  assert.equal(controller.synchronizeView(resolve(controller)).ok, true);
  controller.subscribeCommands((command) => trace.push(`command:${command.type}`));
  const cell = { rowID: 'r1', columnID: 'name' };
  assert.throws(
    () => controller.dispatch({ type: 'begin-edit', cell }),
    (error) => error === cursorError,
  );
  assert.deepEqual(trace, ['command:begin-edit', 'cursor', 'edit']);
  assert.deepEqual(controller.getSnapshot().cursor.current, cell);
  assert.deepEqual(controller.getSnapshot().edit, { kind: 'editing', cell });

  const observers = createDataGrid({ columns });
  assert.equal(observers.synchronizeView(resolve(observers)).ok, true);
  const delivered = [];
  const observerError = new Error('observer failed');
  let stopSecond = () => undefined;
  let failOnce = true;
  observers.subscribeCommands((command) => {
    delivered.push(`first:${command.type}`);
    if (command.type === 'begin-edit') {
      stopSecond();
      observers.subscribeCommands((next) => delivered.push(`late:${next.type}`));
      if (failOnce) { failOnce = false; throw observerError; }
    }
  });
  stopSecond = observers.subscribeCommands((command) => delivered.push(`second:${command.type}`));
  observers.subscribeCommands((command) => delivered.push(`third:${command.type}`));
  assert.throws(
    () => observers.dispatch({ type: 'begin-edit', cell }),
    (error) => error === observerError,
  );
  assert.deepEqual(delivered, ['first:begin-edit', 'second:begin-edit', 'third:begin-edit']);
  delivered.length = 0;
  assert.equal(observers.dispatch({ type: 'commit-edit', value: 'done' }).ok, true);
  assert.deepEqual(delivered, ['first:commit-edit', 'third:commit-edit', 'late:commit-edit']);

  const multiple = createDataGrid({ columns });
  assert.equal(multiple.synchronizeView(resolve(multiple)).ok, true);
  assert.equal(multiple.dispatch({ type: 'begin-edit', cell }).ok, true);
  const multiTrace = [];
  const multiError = new Error('cancel observer failed');
  multiple.subscribeCommands((command) => {
    multiTrace.push(`first:${command.type}`);
    if (command.type === 'cancel-edit') throw multiError;
  });
  multiple.subscribeCommands((command) => multiTrace.push(`second:${command.type}`));
  assert.throws(
    () => multiple.dispatch({ type: 'replace-source' }),
    (error) => error === multiError,
  );
  assert.deepEqual(multiTrace, [
    'first:cancel-edit', 'second:cancel-edit',
    'first:request-view', 'second:request-view',
  ]);
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

test('TAB-GRD-09: grid profile revisions stop at the safe-integer ceiling', () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  const finalSafe = nextRevision(maximum - 1);
  assert.equal(finalSafe.ok, true);
  assert.equal(finalSafe.value, maximum);
  const exhausted = nextRevision(maximum);
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.error.class, 'resource-rejection');
  assert.equal(exhausted.error.code, 'revision-ceiling-reached');
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
