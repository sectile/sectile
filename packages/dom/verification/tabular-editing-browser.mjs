import { createDataTable } from '../dist/data-table.js';
import { createDataGrid } from '../dist/data-grid.js';
import { createDataTreeGrid } from '../dist/data-tree-grid.js';

const columns = [
  { id: 'name', label: 'Name', capabilities: ['edit'], headerNodeID: 'header:name' },
  { id: 'score', label: 'Score', capabilities: [], headerNodeID: 'header:score' },
];
const flatRows = [
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
  { kind: 'leaf', id: 'r2', cells: { name: 'Beta', score: 2 } },
];
const treeRows = [
  { kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'A', score: 1 } },
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
];

function requestOf(controller) {
  const snapshot = controller.getSnapshot();
  return snapshot.state?.requestState.pendingRequest ?? snapshot.tabular.state.requestState.pendingRequest;
}

function response(controller, rows, viewRevision = 1, removedRowIDs = []) {
  const request = requestOf(controller);
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
    removedRowIDs,
  };
}

const parseRequired = (value) => value.length === 0
  ? { ok: false, error: { class: 'transition-rejection', code: 'profile-view-mismatch', message: 'Value is required.' } }
  : { ok: true, value };

const table = document.querySelector('#tabular-table-native-editor table');
const tableCommands = [];
const tableConnection = createDataTable({ columns, table, onCommand: (command) => tableCommands.push(command) });
tableConnection.synchronizeView(response(tableConnection.controller, flatRows));
const tableEditor = document.createElement('input');
table.append(tableEditor);
tableConnection.bindEditor(tableEditor, { cell: { rowID: 'r1', columnID: 'name' }, parseValue: parseRequired });
tableEditor.value = 'IME';
tableEditor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
tableEditor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
const tableIMESuppressed = !tableCommands.some((command) => command.type === 'request-value-commit');
tableEditor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
tableEditor.value = '';
tableEditor.dispatchEvent(new Event('change', { bubbles: true }));
const tableValidationRejected = tableEditor.getAttribute('aria-invalid') === 'true';
tableEditor.value = 'Gamma';
tableEditor.dispatchEvent(new Event('change', { bubbles: true }));

const gridRoot = document.querySelector('#tabular-grid-editing .root');
const gridCommands = [];
const gridTimeline = [];
const grid = createDataGrid({ columns, root: gridRoot, onCommand: (command) => { gridCommands.push(command); gridTimeline.push(command.type); } });
grid.synchronizeView(response(grid.controller, flatRows));
const firstCell = document.createElement('div');
const secondCell = document.createElement('div');
const gridEditor = document.createElement('input');
firstCell.append(gridEditor);
gridRoot.append(firstCell, secondCell);
grid.registerCell(firstCell, { cell: { rowID: 'r1', columnID: 'name' } });
grid.registerCell(secondCell, { cell: { rowID: 'r2', columnID: 'name' } });
grid.bindEditor(gridEditor, { cell: { rowID: 'r1', columnID: 'name' }, parseValue: parseRequired });
firstCell.focus();
gridRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
await Promise.resolve();
const gridBegan = grid.getSnapshot().edit.kind === 'editing' && document.activeElement === gridEditor;
gridEditor.value = 'IME';
gridEditor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
gridEditor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true, cancelable: true }));
const gridIMESuppressed = grid.getSnapshot().edit.kind === 'editing';
gridEditor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
gridEditor.value = '';
gridEditor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
const gridValidationRejected = gridEditor.getAttribute('aria-invalid') === 'true' && grid.getSnapshot().edit.kind === 'editing';
gridEditor.value = 'Gamma';
gridEditor.dispatchEvent(new Event('input', { bubbles: true }));
gridEditor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
await Promise.resolve();
const gridCommitted = gridCommands.some((command) => command.type === 'commit-edit' && command.value === 'Gamma');

firstCell.focus();
grid.handleEvent({ type: 'begin-edit' });
await Promise.resolve();
gridTimeline.length = 0;
secondCell.addEventListener('focus', () => gridTimeline.push('focus-fallback'));
grid.requestView();
grid.synchronizeView(response(grid.controller, [flatRows[1]], 2, ['r1']));
await Promise.resolve();
const cancelIndex = gridTimeline.indexOf('cancel-edit');
const focusIndex = gridTimeline.indexOf('focus-fallback');
const removedCellCancelBeforeFocus = cancelIndex >= 0 && focusIndex > cancelIndex;

const beforeDisconnect = gridCommands.length;
grid.disconnect();
gridEditor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
const teardown = gridCommands.length === beforeDisconnect && !gridRoot.hasAttribute('role');
const reconnectCommands = [];
const reconnected = createDataGrid({ columns, root: gridRoot, onCommand: (command) => reconnectCommands.push(command) });
reconnected.synchronizeView(response(reconnected.controller, flatRows));
reconnected.registerCell(firstCell, { cell: { rowID: 'r1', columnID: 'name' } });
firstCell.focus();
gridRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
const reconnectSingleBegin = reconnectCommands.filter((command) => command.type === 'begin-edit').length === 1;
reconnected.disconnect();

const treeRoot = document.querySelector('#tabular-treegrid-editing .root');
const treeCommands = [];
const tree = createDataTreeGrid({ columns, root: treeRoot, onCommand: (command) => treeCommands.push(command) });
tree.synchronizeView(response(tree.controller, treeRows));
const treeCell = document.createElement('div');
const treeEditor = document.createElement('input');
treeCell.append(treeEditor);
treeRoot.append(treeCell);
tree.registerCell(treeCell, { cell: { rowID: 'r1', columnID: 'name' } });
tree.bindEditor(treeEditor, { cell: { rowID: 'r1', columnID: 'name' } });
treeCell.focus();
treeRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
await Promise.resolve();
const treeBegan = tree.getSnapshot().edit.kind === 'editing' && document.activeElement === treeEditor;
treeEditor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
const treeCancelled = tree.getSnapshot().edit.kind === 'navigation' && treeCommands.at(-1)?.reason === 'escape';

const scenarios = {
  'tabular-table-native-editor': {
    imeCommitSuppressed: tableIMESuppressed,
    validationRejected: tableValidationRejected,
    nativeCommitIntent: tableCommands.some((command) => command.type === 'request-value-commit' && command.value === 'Gamma'),
  },
  'tabular-grid-editing': {
    beganAndFocused: gridBegan,
    imeCommitSuppressed: gridIMESuppressed,
    validationRejected: gridValidationRejected,
    committed: gridCommitted,
    removedCellCancelBeforeFocus,
    teardown,
    reconnectSingleBegin,
  },
  'tabular-treegrid-editing': {
    beganAndFocused: treeBegan,
    escapedToNavigation: treeCancelled,
  },
};

tableConnection.disconnect();
tree.disconnect();
const result = {
  schemaVersion: 1,
  status: Object.values(scenarios).every((scenario) => Object.values(scenario).every(Boolean)) ? 'passed' : 'failed',
  scenarios,
};
window.__TABULAR_EDITING_BROWSER_RESULT__ = result;
document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
document.body.dataset.status = result.status;
