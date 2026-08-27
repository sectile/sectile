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
  row.append(selection);
  const unbind = connection.bindSelectionControl(selection, { rowID: 'r1', name: 'users', value: 'r1' });
  selection.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(connection.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['r1'] });
  assert.deepEqual(new window.FormData(form).getAll('users'), ['r1']);
  connection.handleEvent({ type: 'select-all-matching' });
  assert.equal(selection.hasAttribute('name'), false);
  assert.deepEqual(new window.FormData(form).getAll('users'), []);

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
