import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createClientTabularSource, resolveClientTabularRequest } from '@sectile/tabular/source';
import { createDataTable } from '../dist/data-table.js';
import { createDataGrid, tryCreateDataGrid } from '../dist/data-grid.js';
import { createDataTreeGrid } from '../dist/data-tree-grid.js';
import manifest from '../package.json' with { type: 'json' };

const columns = [
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter', 'edit'], headerNodeID: 'header:name' },
  { id: 'score', label: 'Score', capabilities: ['sort'], headerNodeID: 'header:score' },
];

function clientResponse(controller, records = [
  { id: 'r1', name: 'Alpha', score: 1 },
  { id: 'r2', name: 'Beta', score: 2 },
]) {
  const source = createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns, headers: [] },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
  });
  const request = controller.getSnapshot().state?.requestState.pendingRequest
    ?? controller.getSnapshot().tabular.state.requestState.pendingRequest;
  assert.notEqual(request, null);
  const response = resolveClientTabularRequest(source, request);
  assert.equal(response.ok, true);
  return response.value;
}

function treeResponse(controller) {
  const request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
  assert.notEqual(request, null);
  const rows = [
    { kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'A', score: 1 } },
    { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
  ];
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: 1,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: 1 },
    visibleRowCount: { kind: 'known', value: 2 },
    rows,
    columnSchema: { revision: 0, columns, headers: [] },
    removedRowIDs: [],
  };
}

test('DOM DataTable preserves native structure, form output, and disposable registration', () => {
  const window = new Window();
  const document = window.document;
  const form = document.createElement('form');
  const table = document.createElement('table');
  form.append(table);
  document.body.append(form);
  const commands = [];
  const connection = createDataTable({ columns, table, onCommand: (command) => commands.push(command) });
  assert.equal(connection.synchronizeView(clientResponse(connection.controller)).ok, true);

  const row = document.createElement('tr');
  const cell = document.createElement('td');
  row.append(cell);
  table.append(row);
  assert.equal(connection.registerRow(row, { rowID: 'r1' }).ok, true);
  const registered = connection.registerCell(cell, { cell: { rowID: 'r1', columnID: 'name' } });
  assert.equal(registered.ok, true);
  assert.equal(table.hasAttribute('role'), false);
  assert.equal(cell.getAttribute('headers'), 'sectile-tabular-header-header%3Aname');

  const selection = document.createElement('input');
  const bulkSelection = document.createElement('button');
  row.append(selection);
  row.append(bulkSelection);
  const unbind = connection.bindSelectionControl(selection, { rowID: 'r1', name: 'users', value: 'r1' });
  const unbindBulk = connection.bindBulkSelectionControl(bulkSelection, { target: { kind: 'all-matching' } });
  assert.equal(bulkSelection.getAttribute('role'), 'checkbox');
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'false');
  assert.equal(bulkSelection.getAttribute('data-state'), 'unchecked');
  selection.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(connection.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1'] });
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'mixed');
  assert.equal(bulkSelection.getAttribute('data-state'), 'indeterminate');
  assert.deepEqual(new window.FormData(form).getAll('users'), ['r1']);
  bulkSelection.click();
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'true');
  assert.equal(bulkSelection.getAttribute('data-state'), 'checked');
  assert.equal(selection.hasAttribute('name'), false);
  assert.deepEqual(new window.FormData(form).getAll('users'), []);
  bulkSelection.click();
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'false');
  assert.equal(bulkSelection.getAttribute('data-state'), 'unchecked');
  assert.deepEqual(connection.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: [] });

  const stale = connection.registerCell(document.createElement('td'), {
    cell: { rowID: 'r1', columnID: 'name' },
    expectedProjectionGeneration: connection.getProjection().generation + 1,
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  registered.value();
  registered.value();
  unbind();
  unbind();
  unbindBulk();
  unbindBulk();
  connection.disconnect();
  connection.disconnect();
  assert.equal(table.hasAttribute('data-scope'), false);
  assert.equal(commands.some((command) => command.type === 'request-view'), false);
});

test('DOM DataGrid projects ARIA, emits one reveal, restores focus, and tears down listeners', async () => {
  const window = new Window();
  const document = window.document;
  const root = document.createElement('div');
  root.tabIndex = 0;
  document.body.append(root);
  const commands = [];
  const connection = createDataGrid({ columns, root, onCommand: (command) => commands.push(command) });
  assert.equal(connection.synchronizeView(clientResponse(connection.controller)).ok, true);

  const first = document.createElement('div');
  root.append(first);
  assert.equal(connection.registerCell(first, { cell: { rowID: 'r1', columnID: 'name' } }).ok, true);
  first.focus();
  assert.deepEqual(connection.getSnapshot().cursor.current, { rowID: 'r1', columnID: 'name' });
  root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert.deepEqual(connection.getSnapshot().cursor.current, { rowID: 'r2', columnID: 'name' });
  const reveals = commands.filter((command) => command.type === 'request-reveal-cell');
  assert.equal(reveals.length, 1);
  connection.focusCurrent();
  assert.equal(commands.filter((command) => command.type === 'request-reveal-cell').length, 1);

  const second = document.createElement('div');
  root.append(second);
  assert.equal(connection.registerCell(second, {
    cell: { rowID: 'r2', columnID: 'name' },
    expectedProjectionGeneration: connection.getProjection().generation,
  }).ok, true);
  await Promise.resolve();
  assert.equal(document.activeElement, second);
  assert.equal(root.getAttribute('role'), 'grid');
  assert.equal(second.getAttribute('role'), 'gridcell');
  assert.equal(second.tabIndex, 0);
  assert.equal(connection.requestRevealCell({ rowID: 'r1', columnID: 'name' }, connection.getProjection().generation - 1), false);

  const bulkSelection = document.createElement('button');
  root.append(bulkSelection);
  connection.bindBulkSelectionControl(bulkSelection, { target: { kind: 'all-matching' } });
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'false');
  connection.handleEvent({ type: 'toggle-row-selection', rowID: 'r1' });
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'mixed');
  bulkSelection.click();
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'true');
  bulkSelection.click();
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'false');

  const revision = connection.getSnapshot().revision;
  connection.disconnect();
  root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  assert.equal(connection.getSnapshot().revision, revision);
  assert.equal(root.hasAttribute('role'), false);
});

test('DOM DataTreeGrid projects hierarchy, disclosure, row reveal, and invalid-part failures', () => {
  const window = new Window();
  const document = window.document;
  const root = document.createElement('div');
  document.body.append(root);
  const commands = [];
  const connection = createDataTreeGrid({ columns, root, onCommand: (command) => commands.push(command) });
  assert.equal(connection.synchronizeView(treeResponse(connection.controller)).ok, true);

  const groupRow = document.createElement('div');
  root.append(groupRow);
  assert.equal(connection.registerRow(groupRow, { rowID: 'group:a' }).ok, true);
  assert.equal(root.getAttribute('role'), 'treegrid');
  assert.equal(groupRow.getAttribute('aria-level'), '1');
  assert.equal(groupRow.getAttribute('aria-expanded'), 'true');

  const disclosure = document.createElement('button');
  groupRow.append(disclosure);
  connection.bindRowDisclosure(disclosure, { rowID: 'group:a' });
  disclosure.click();
  assert.deepEqual(connection.getSnapshot().tabular.state.expansion, ['group:a']);
  assert.equal(commands.some((command) => command.type === 'request-view'), true);
  assert.equal(connection.requestRevealRow('r1'), true);
  assert.equal(commands.at(-1).type, 'request-reveal-row');
  assert.equal(commands.at(-1).expectedProjectionGeneration, connection.getProjection().generation);

  const missing = connection.registerRow(document.createElement('div'), { rowID: 'missing' });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'profile-view-mismatch');
  connection.disconnect();
  assert.equal(root.hasAttribute('role'), false);
});

test('DOM Tabular column sizes preserve controlled ownership and validate host input', () => {
  const window = new Window();
  const root = window.document.createElement('div');
  const invalid = tryCreateDataGrid({ columns, root, defaultColumnSizes: { name: 0 } });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'invalid-column-definition');

  const proposals = [];
  const connection = createDataGrid({
    columns,
    root,
    columnSizes: { name: 100 },
    onColumnSizesChange: (state) => proposals.push(state),
  });
  const handle = window.document.createElement('div');
  connection.bindColumnResizeHandle(handle, { columnID: 'name', step: 12 });
  handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(connection.getColumnSizeState().values.name, 100);
  assert.equal(proposals.at(-1).values.name, 112);
  assert.equal(connection.syncControlledValues({ columnSizes: { name: 112 } }).ok, true);
  assert.equal(connection.getColumnSizeState().values.name, 112);
  connection.disconnect();
});

test('DOM DataTable native editor emits parsed commit intent and suppresses IME commits', () => {
  const window = new Window();
  const table = window.document.createElement('table');
  const commands = [];
  const connection = createDataTable({ columns, table, onCommand: (command) => commands.push(command) });
  assert.equal(connection.synchronizeView(clientResponse(connection.controller)).ok, true);
  const editor = window.document.createElement('input');
  table.append(editor);
  const unbind = connection.bindEditor(editor, {
    cell: { rowID: 'r1', columnID: 'name' },
    parseValue: (value) => value === 'invalid'
      ? { ok: false, error: { class: 'transition-rejection', code: 'profile-view-mismatch', message: 'Rejected editor value.' } }
      : { ok: true, value: Number(value) },
  });

  editor.value = '12';
  editor.dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true }));
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
  assert.equal(commands.some((command) => command.type === 'request-value-commit'), false);
  editor.dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true }));
  editor.value = 'invalid';
  editor.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(editor.getAttribute('aria-invalid'), 'true');
  assert.equal(commands.some((command) => command.type === 'request-value-commit'), false);
  editor.value = '12';
  editor.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(commands.at(-1), { type: 'request-value-commit', cell: { rowID: 'r1', columnID: 'name' }, value: 12 });
  unbind();
  unbind();
  connection.disconnect();
});

test('DOM DataGrid editor coordinates begin, validation, IME, commit, and teardown', async () => {
  const window = new Window();
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const commands = [];
  const connection = createDataGrid({ columns, root, onCommand: (command) => commands.push(command) });
  assert.equal(connection.synchronizeView(clientResponse(connection.controller)).ok, true);
  const cell = window.document.createElement('div');
  const editor = window.document.createElement('input');
  cell.append(editor);
  root.append(cell);
  assert.equal(connection.registerCell(cell, { cell: { rowID: 'r1', columnID: 'name' } }).ok, true);
  const unbind = connection.bindEditor(editor, {
    cell: { rowID: 'r1', columnID: 'name' },
    parseValue: (value) => value.length === 0
      ? { ok: false, error: { class: 'transition-rejection', code: 'profile-view-mismatch', message: 'Value is required.' } }
      : { ok: true, value },
  });
  cell.focus();
  root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
  await Promise.resolve();
  assert.equal(connection.getSnapshot().edit.kind, 'editing');
  assert.equal(window.document.activeElement, editor);
  assert.equal(commands.some((command) => command.type === 'begin-edit'), true);

  editor.value = 'IME';
  editor.dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true }));
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
  assert.equal(connection.getSnapshot().edit.kind, 'editing');
  editor.dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true }));
  editor.value = '';
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(editor.getAttribute('aria-invalid'), 'true');
  assert.equal(connection.getSnapshot().edit.kind, 'editing');
  editor.value = 'Gamma';
  editor.dispatchEvent(new window.Event('input', { bubbles: true }));
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await Promise.resolve();
  assert.equal(connection.getSnapshot().edit.kind, 'navigation');
  assert.deepEqual(commands.at(-1), { type: 'commit-edit', cell: { rowID: 'r1', columnID: 'name' }, value: 'Gamma' });

  const count = commands.length;
  unbind();
  connection.disconnect();
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(commands.length, count);
});

test('DOM grid emits removed-cell cancellation before moving focus', async () => {
  const window = new Window();
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const timeline = [];
  const connection = createDataGrid({ columns, root, onCommand: (command) => timeline.push(command.type) });
  assert.equal(connection.synchronizeView(clientResponse(connection.controller)).ok, true);
  const first = window.document.createElement('div');
  const second = window.document.createElement('div');
  const editor = window.document.createElement('input');
  first.append(editor);
  root.append(first, second);
  assert.equal(connection.registerCell(first, { cell: { rowID: 'r1', columnID: 'name' } }).ok, true);
  assert.equal(connection.registerCell(second, { cell: { rowID: 'r2', columnID: 'name' } }).ok, true);
  connection.bindEditor(editor, { cell: { rowID: 'r1', columnID: 'name' } });
  second.addEventListener('focus', () => timeline.push('focus-fallback'));
  first.focus();
  connection.handleEvent({ type: 'begin-edit' });
  await Promise.resolve();
  timeline.length = 0;
  assert.equal(connection.requestView().ok, true);
  const response = clientResponse(connection.controller, [{ id: 'r2', name: 'Beta', score: 2 }]);
  const synchronized = connection.synchronizeView({ ...response, viewRevision: 2, removedRowIDs: ['r1'] });
  assert.equal(synchronized.ok, true, JSON.stringify(synchronized));
  assert.deepEqual(connection.getSnapshot().edit, { kind: 'navigation' });
  await Promise.resolve();
  assert.ok(timeline.indexOf('cancel-edit') >= 0);
  assert.ok(timeline.indexOf('focus-fallback') > timeline.indexOf('cancel-edit'));
  connection.disconnect();
});

test('DOM DataTreeGrid uses the shared explicit editor contract', async () => {
  const window = new Window();
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const commands = [];
  const connection = createDataTreeGrid({ columns, root, onCommand: (command) => commands.push(command) });
  assert.equal(connection.synchronizeView(treeResponse(connection.controller)).ok, true);
  const cell = window.document.createElement('div');
  const editor = window.document.createElement('input');
  cell.append(editor);
  root.append(cell);
  assert.equal(connection.registerCell(cell, { cell: { rowID: 'r1', columnID: 'name' } }).ok, true);
  connection.bindEditor(editor, { cell: { rowID: 'r1', columnID: 'name' } });
  cell.focus();
  root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await Promise.resolve();
  assert.equal(connection.getSnapshot().edit.kind, 'editing');
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(connection.getSnapshot().edit.kind, 'navigation');
  assert.equal(commands.at(-1).reason, 'escape');
  connection.disconnect();
});

test('DOM Tabular subpaths declare direct Tabular dependency and no profile Virtual imports', async () => {
  assert.equal(manifest.dependencies['@sectile/tabular'], 'workspace:*');
  for (const name of ['data-table', 'data-grid', 'data-tree-grid']) {
    assert.deepEqual(Object.keys(manifest.exports[`./${name}`]).sort(), ['default', 'import', 'types']);
    const source = await readFile(new URL(`../dist/${name}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /@sectile\/virtual|\.\/virtual/u);
  }
  const root = await import('../dist/index.js');
  assert.equal(typeof root.createDataTable, 'function');
  assert.equal(typeof root.createDataGrid, 'function');
  assert.equal(typeof root.createDataTreeGrid, 'function');
});
