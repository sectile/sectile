import { createDataTable } from '../dist/data-table.js';
import { createDataGrid } from '../dist/data-grid.js';
import { createDataTreeGrid } from '../dist/data-tree-grid.js';

const columns = [
  { id: 'name', label: 'Name', capabilities: ['edit'], headerNodeID: 'header:name' },
  { id: 'score', label: 'Score', capabilities: [], headerNodeID: 'header:score' },
];

function requestOf(controller) {
  const snapshot = controller.getSnapshot();
  return snapshot.state?.requestState.pendingRequest ?? snapshot.tabular.state.requestState.pendingRequest;
}

function response(controller, rows) {
  const request = requestOf(controller);
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: 1,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: rows.filter((row) => row.kind === 'leaf').length },
    visibleRowCount: { kind: 'known', value: rows.length },
    rows,
    columnSchema: { revision: 0, columns, headers: [] },
    removedRowIDs: [],
  };
}

const flatRows = [
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
  { kind: 'leaf', id: 'r2', cells: { name: 'Beta', score: 2 } },
];
const treeRows = [
  { kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'A', score: 1 } },
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
];

const tableSection = document.querySelector('#tabular-native-table');
const table = tableSection.querySelector('table');
const form = tableSection.querySelector('form');
const tableConnection = createDataTable({ columns, table });
tableConnection.synchronizeView(response(tableConnection.controller, flatRows));
const tr = document.createElement('tr');
const td = document.createElement('td');
const selection = document.createElement('input');
tr.append(td, selection);
table.append(tr);
tableConnection.registerRow(tr, { rowID: 'r1' });
tableConnection.registerCell(td, { cell: { rowID: 'r1', columnID: 'name' } });
tableConnection.bindSelectionControl(selection, { rowID: 'r1', name: 'users', value: 'r1' });
selection.click();

const gridSection = document.querySelector('#tabular-grid');
const gridRoot = gridSection.querySelector('.root');
const gridCommands = [];
const grid = createDataGrid({ columns, root: gridRoot, onCommand: (command) => gridCommands.push(command) });
grid.synchronizeView(response(grid.controller, flatRows));
const gridCell = document.createElement('div');
gridCell.textContent = 'Alpha';
gridRoot.append(gridCell);
grid.registerCell(gridCell, { cell: { rowID: 'r1', columnID: 'name' } });
gridCell.focus();
gridRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

const treeSection = document.querySelector('#tabular-treegrid');
const treeRoot = treeSection.querySelector('.root');
const tree = createDataTreeGrid({ columns, root: treeRoot });
tree.synchronizeView(response(tree.controller, treeRows));
const treeRow = document.createElement('div');
treeRoot.append(treeRow);
tree.registerRow(treeRow, { rowID: 'group:a' });

const scenarios = {
  'tabular-native-table': {
    nativeElement: table.tagName === 'TABLE',
    noGridRole: !table.hasAttribute('role'),
    formValue: new FormData(form).get('users') === 'r1',
    cellHeaders: td.getAttribute('headers') === 'sectile-tabular-header-header%3Aname',
  },
  'tabular-grid': {
    role: gridRoot.getAttribute('role') === 'grid',
    rovingFocus: grid.getSnapshot().cursor.current?.rowID === 'r2',
    revealOnce: gridCommands.filter((command) => command.type === 'request-reveal-cell').length === 1,
    staleRevealNoop: grid.requestRevealCell({ rowID: 'r1', columnID: 'name' }, grid.getProjection().generation - 1) === false,
  },
  'tabular-treegrid': {
    role: treeRoot.getAttribute('role') === 'treegrid',
    level: treeRow.getAttribute('aria-level') === '1',
    expanded: treeRow.getAttribute('aria-expanded') === 'true',
    rowCount: treeRoot.getAttribute('aria-rowcount') === '2',
  },
};

const beforeDisconnect = grid.getSnapshot().revision;
grid.disconnect();
gridRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
scenarios['tabular-grid'].listenerTeardown = grid.getSnapshot().revision === beforeDisconnect && !gridRoot.hasAttribute('role');
tableConnection.disconnect();
tree.disconnect();

const result = {
  schemaVersion: 1,
  status: Object.values(scenarios).every((scenario) => Object.values(scenario).every(Boolean)) ? 'passed' : 'failed',
  scenarios,
};
window.__TABULAR_BROWSER_RESULT__ = result;
document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
document.body.dataset.status = result.status;
