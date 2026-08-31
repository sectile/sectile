import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createClientTabularSource, resolveClientTabularRequest } from '@sectile/tabular/source';
import { createDataTable } from '../.verification-dist/data-table.js';
import { createDataGrid, tryCreateDataGrid } from '../.verification-dist/data-grid.js';
import { createDataTreeGrid } from '../.verification-dist/data-tree-grid.js';
import manifest from '../package.json' with { type: 'json' };

const columns = [
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter', 'edit'], headerNodeID: 'header:name' },
  { id: 'score', label: 'Score', capabilities: ['sort'], headerNodeID: 'header:score' },
];

function clientResponse(controller, records = [
  { id: 'r1', name: 'Alpha', score: 1 },
  { id: 'r2', name: 'Beta', score: 2 },
], columnSchema = { revision: 0, columns, headers: [] }) {
  const source = createClientTabularSource({
    records,
    columnSchema,
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

function treeResponse(controller, rows = [
  { kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'A', score: 1 } },
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
], viewRevision = 1) {
  const request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
  assert.notEqual(request, null);
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: rows.filter((row) => row.kind === 'leaf').length },
    visibleRowCount: { kind: 'known', value: rows.length },
    rows,
    columnSchema: { revision: 0, columns, headers: [] },
    removedRowIDs: [],
  };
}

function shiftClick(window, element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
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

  const header = document.createElement('th');
  connection.setHeaderCellAttributes(header, { columnID: 'name' });
  assert.equal(header.id, 'sectile-tabular-header-header%3Aname');
  assert.equal(header.getAttribute('data-header-node-id'), 'header:name');

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
  const styledSelection = document.createElement('button');
  const bulkSelection = document.createElement('button');
  row.append(selection);
  row.append(styledSelection);
  row.append(bulkSelection);
  const unbind = connection.bindSelectionControl(selection, { rowID: 'r1', name: 'users', value: 'r1' });
  const unbindStyled = connection.bindSelectionControl(styledSelection, { rowID: 'r2', name: 'users', value: 'r2' });
  const unbindBulk = connection.bindBulkSelectionControl(bulkSelection, { target: { kind: 'all-matching' } });
  assert.equal(styledSelection.getAttribute('role'), 'checkbox');
  assert.equal(styledSelection.getAttribute('aria-checked'), 'false');
  styledSelection.click();
  assert.equal(styledSelection.getAttribute('aria-checked'), 'true');
  styledSelection.click();
  assert.equal(styledSelection.getAttribute('aria-checked'), 'false');
  assert.equal(bulkSelection.getAttribute('role'), 'checkbox');
  assert.equal(bulkSelection.getAttribute('aria-checked'), 'false');
  assert.equal(bulkSelection.getAttribute('data-state'), 'unchecked');
  selection.click();
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
  unbindStyled();
  unbindStyled();
  unbindBulk();
  unbindBulk();
  connection.disconnect();
  connection.disconnect();
  assert.equal(table.hasAttribute('data-scope'), false);
  assert.equal(commands.some((command) => command.type === 'request-view'), false);
});

test('DOM DataTable header metrics follow contiguous projected intervals after legal reorder hide and pin', () => {
  const window = new Window();
  const document = window.document;
  const table = document.createElement('table');
  document.body.append(table);
  const groupedColumns = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const headers = [
    { kind: 'group', id: 'group:ab', children: [
      { kind: 'column', id: 'header:a', columnID: 'a' },
      { kind: 'column', id: 'header:b', columnID: 'b' },
    ] },
    { kind: 'column', id: 'header:c', columnID: 'c' },
  ];
  const connection = createDataTable({ columns: groupedColumns, headers, table });
  const response = clientResponse(connection.controller, [
    { id: 'r1', a: 1, b: 2, c: 3 },
  ], { revision: 0, columns: groupedColumns, headers });
  assert.equal(connection.synchronizeView(response).ok, true);

  const reordered = connection.controller.dispatch({
    type: 'set-column-state',
    columnState: { order: ['b', 'a', 'c'], hidden: [], pinnedStart: [], pinnedEnd: [] },
  });
  assert.equal(reordered.ok, true);
  const group = document.createElement('th');
  const leafB = document.createElement('th');
  connection.setHeaderCellAttributes(group, { headerNodeID: 'group:ab' });
  connection.setHeaderCellAttributes(leafB, { columnID: 'b' });
  assert.equal(group.colSpan, 2);
  assert.equal(leafB.id, 'sectile-tabular-header-header%3Ab');

  const projected = connection.controller.dispatch({
    type: 'set-column-state',
    columnState: { order: ['b', 'a', 'c'], hidden: ['a'], pinnedStart: ['b'], pinnedEnd: [] },
  });
  assert.equal(projected.ok, true);
  const projectedGroup = document.createElement('th');
  const projectedC = document.createElement('th');
  connection.setHeaderCellAttributes(projectedGroup, { headerNodeID: 'group:ab' });
  connection.setHeaderCellAttributes(projectedC, { columnID: 'c' });
  assert.equal(projectedGroup.colSpan, 1);
  assert.equal(projectedC.id, 'sectile-tabular-header-header%3Ac');
  connection.disconnect();
});

test('DOM Tabular checkbox controls select and clear visible leaf ranges from one anchor', () => {
  const records = [
    { id: 'r1', name: 'Alpha', score: 1 },
    { id: 'r2', name: 'Beta', score: 2 },
    { id: 'r3', name: 'Gamma', score: 3 },
    { id: 'r4', name: 'Delta', score: 4 },
  ];

  const tableWindow = new Window();
  const table = createDataTable({ columns, table: tableWindow.document.createElement('table') });
  assert.equal(table.synchronizeView(clientResponse(table.controller, records)).ok, true);
  const tableControls = records.map((record) => {
    const element = tableWindow.document.createElement('button');
    table.bindSelectionControl(element, { rowID: record.id, name: 'rows', value: record.id });
    return element;
  });
  tableControls[0].click();
  shiftClick(tableWindow, tableControls[3]);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1', 'r2', 'r3', 'r4'] });
  tableControls[1].click();
  shiftClick(tableWindow, tableControls[3]);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1'] });
  assert.equal(table.requestView().ok, true);
  const reordered = clientResponse(table.controller, [...records].reverse());
  assert.equal(table.synchronizeView({ ...reordered, viewRevision: 2 }).ok, true);
  shiftClick(tableWindow, tableControls[2]);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1', 'r3'] });
  const shiftSpace = new tableWindow.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true, shiftKey: true });
  tableControls[1].dispatchEvent(shiftSpace);
  assert.equal(shiftSpace.defaultPrevented, true);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1', 'r3', 'r2'] });
  table.disconnect();

  const gridWindow = new Window();
  const grid = createDataGrid({ columns, root: gridWindow.document.createElement('div') });
  assert.equal(grid.synchronizeView(clientResponse(grid.controller, records)).ok, true);
  const gridControls = records.map((record) => {
    const element = gridWindow.document.createElement('button');
    grid.bindRowSelectionControl(element, { rowID: record.id, name: 'rows', value: record.id });
    return element;
  });
  gridControls[0].click();
  shiftClick(gridWindow, gridControls[3]);
  assert.deepEqual(grid.getSnapshot().tabular.state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1', 'r2', 'r3', 'r4'] });
  grid.disconnect();

  const treeWindow = new Window();
  const treeRows = [
    { kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'A', score: 3 } },
    { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
    { kind: 'leaf', id: 'r2', cells: { name: 'Beta', score: 2 } },
    { kind: 'leaf', id: 'r3', cells: { name: 'Gamma', score: 3 } },
  ];
  const tree = createDataTreeGrid({ columns, root: treeWindow.document.createElement('div') });
  assert.equal(tree.synchronizeView(treeResponse(tree.controller, treeRows)).ok, true);
  const firstLeaf = treeWindow.document.createElement('button');
  const lastLeaf = treeWindow.document.createElement('button');
  tree.bindRowSelectionControl(firstLeaf, { rowID: 'r1', name: 'rows', value: 'r1' });
  tree.bindRowSelectionControl(lastLeaf, { rowID: 'r3', name: 'rows', value: 'r3' });
  firstLeaf.click();
  shiftClick(treeWindow, lastLeaf);
  assert.deepEqual(tree.getSnapshot().tabular.state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1', 'r2', 'r3'] });
  tree.disconnect();
});

test('DOM Tabular generic checkbox controls own Space while native controls keep one activation path', () => {
  const window = new Window();
  const table = createDataTable({ columns, table: window.document.createElement('table') });
  assert.equal(table.synchronizeView(clientResponse(table.controller)).ok, true);
  const generic = window.document.createElement('div');
  table.bindSelectionControl(generic, { rowID: 'r1', name: 'rows', value: 'r1' });
  assert.equal(generic.tabIndex, 0);
  const space = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  generic.dispatchEvent(space);
  assert.equal(space.defaultPrevented, true);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1'] });

  const native = window.document.createElement('button');
  table.bindSelectionControl(native, { rowID: 'r2', name: 'rows', value: 'r2' });
  const nativeSpace = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  native.dispatchEvent(nativeSpace);
  assert.equal(nativeSpace.defaultPrevented, false);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1'] });
  native.click();
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1', 'r2'] });

  const bulk = window.document.createElement('div');
  table.bindBulkSelectionControl(bulk, { target: { kind: 'all-matching' } });
  assert.equal(bulk.tabIndex, 0);
  bulk.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: [] });
  table.disconnect();
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

  const header = document.createElement('div');
  connection.setColumnHeaderAttributes(header, { columnID: 'name' });
  assert.equal(header.id, 'sectile-tabular-header-header%3Aname');
  assert.equal(header.getAttribute('aria-colindex'), '1');

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
  const styledSelection = document.createElement('button');
  root.append(styledSelection);
  root.append(bulkSelection);
  connection.bindRowSelectionControl(styledSelection, { rowID: 'r1', name: 'rows', value: 'r1' });
  assert.equal(styledSelection.getAttribute('role'), 'checkbox');
  assert.equal(styledSelection.getAttribute('aria-checked'), 'false');
  styledSelection.click();
  assert.equal(styledSelection.getAttribute('aria-checked'), 'true');
  styledSelection.click();
  assert.equal(styledSelection.getAttribute('aria-checked'), 'false');
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
  connection.bindColumnResizeHandle(handle, { columnID: 'name', minSize: 50, maxSize: 150, step: 12 });
  assert.equal(handle.getAttribute('aria-valuemin'), '50');
  assert.equal(handle.getAttribute('aria-valuemax'), '150');
  assert.equal(handle.getAttribute('aria-valuenow'), '100');
  handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(connection.getColumnSizeState().values.name, 100);
  assert.equal(proposals.at(-1).values.name, 112);
  assert.equal(handle.getAttribute('aria-valuenow'), '100');
  handle.dispatchEvent(new window.PointerEvent('pointerdown', { button: 0, clientX: 10, bubbles: true }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { clientX: 30 }));
  window.dispatchEvent(new window.PointerEvent('pointerup'));
  assert.equal(proposals.at(-1).values.name, 120);
  assert.equal(handle.getAttribute('aria-valuenow'), '100');
  assert.equal(connection.syncControlledValues({ columnSizes: { name: 120 } }).ok, true);
  assert.equal(connection.getColumnSizeState().values.name, 120);
  assert.equal(handle.getAttribute('aria-valuenow'), '120');
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

test('DOM Tabular profiles remain Virtual-free behind the aggregate subpath', async () => {
  assert.deepEqual(Object.keys(manifest.exports['./tabular']).sort(), ['default', 'import', 'types']);
  assert.equal(manifest.exports['./data-table'], undefined);
  assert.equal(manifest.exports['./data-grid'], undefined);
  assert.equal(manifest.exports['./data-tree-grid'], undefined);
  for (const name of ['data-table', 'data-grid', 'data-tree-grid']) {
    const source = await readFile(new URL(`../.verification-dist/${name}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /@sectile\/virtual|\.\/virtual/u);
  }
  const root = await import('../.verification-dist/index.js');
  assert.equal(root.createDataTable, undefined);
  assert.equal(root.createDataGrid, undefined);
  assert.equal(root.createDataTreeGrid, undefined);
});
