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
  assert.equal(controller.attachRequestExecutor(() => {}).ok, true);
  controller.dispose();
  controller.dispose();
  assert.equal(controller.dispatch({ type: 'request-view' }).ok, false);
});
