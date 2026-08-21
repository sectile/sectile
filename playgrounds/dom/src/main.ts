import { connectTreeGrid, createTreeGridController } from '@sectile/dom/tree-grid';
import { createGrid } from '@sectile/primitives/grid';
import { unwrap } from '@sectile/primitives/result';
import { createTree } from '@sectile/primitives/tree';
import { createTreeGridModel } from '@sectile/primitives/tree-grid';
import './styles.css';

interface LogEntry {
  readonly revision: number;
  readonly event: string;
  readonly accepted: boolean;
  readonly effects: readonly string[];
}

const tree = unwrap(createTree([
  { id: 'projects', parentID: null },
  { id: 'atlas', parentID: 'projects' },
  { id: 'atlas-design', parentID: 'atlas' },
  { id: 'atlas-build', parentID: 'atlas' },
  { id: 'beacon', parentID: 'projects' },
  { id: 'archive', parentID: null },
]));
const rowIDs = tree.preorder().ids;
const grid = unwrap(createGrid(rowIDs.map((row) => [`${row}-name`, `${row}-status`])));
const model = unwrap(createTreeGridModel(tree, grid, rowIDs));

const initialValues = new Map<string, string>([
  ['projects-name', 'Projects'],
  ['projects-status', 'Portfolio'],
  ['atlas-name', 'Atlas'],
  ['atlas-status', 'In progress'],
  ['atlas-design-name', 'Design system'],
  ['atlas-design-status', 'Review'],
  ['atlas-build-name', 'Implementation'],
  ['atlas-build-status', 'Active'],
  ['beacon-name', 'Beacon'],
  ['beacon-status', 'Planning'],
  ['archive-name', 'Archive'],
  ['archive-status', '12 items'],
]);

const gridElement = requiredElement<HTMLElement>('#tree-grid');
const stateOutput = requiredElement<HTMLElement>('#state-output');
const eventLog = requiredElement<HTMLOListElement>('#event-log');
const revisionBadge = requiredElement<HTMLElement>('#revision-badge');
const focusButton = requiredElement<HTMLButtonElement>('#focus-button');
const resetButton = requiredElement<HTMLButtonElement>('#reset-button');

let values = new Map(initialValues);
let logEntries: LogEntry[] = [];
let connection = createConnection();

focusButton.addEventListener('click', () => connection.focusCurrent());
resetButton.addEventListener('click', () => {
  connection.disconnect();
  values = new Map(initialValues);
  logEntries = [];
  connection = createConnection();
  render();
  connection.focusCurrent();
});

render();

function createConnection() {
  return connectTreeGrid<(typeof rowIDs)[number], string>({
    controller: unwrap(createTreeGridController({
      model,
      defaultExpandedValue: ['projects', 'atlas'],
      defaultHighlightedValue: 'projects-name',
    })),
    root: gridElement,
    getCellValue: (id) => values.get(id) ?? '',
    setCellValue: (id, value) => values.set(id, value),
    onTransition: ({ event, result }) => {
      logEntries = [
        {
          revision: result.snapshot.revision,
          event,
          accepted: result.ok,
          effects: result.commands.map((effect) => `${effect.type}:${effect.id}`),
        },
        ...logEntries,
      ].slice(0, 12);
    },
    onUpdate: render,
  });
}

function render(): void {
  const { revision, state } = connection.getSnapshot();
  const visibleRows = new Set(tree.visible(state.expansion).ids);
  gridElement.replaceChildren();
  connection.setGridAttributes(visibleRows.size, grid.columnCount);

  let visibleRowIndex = 0;
  for (let rowIndex = 0; rowIndex < grid.rowCount; rowIndex += 1) {
    const rowID = model.rowIDs[rowIndex];
    if (rowID === undefined || !visibleRows.has(rowID)) continue;
    visibleRowIndex += 1;
    const rowElement = document.createElement('div');
    rowElement.className = 'tree-row';
    const level = (tree.depthOf(rowID) ?? 0) + 1;
    connection.setRowAttributes(rowElement, {
      rowIndex: visibleRowIndex,
      level,
      ...(tree.isLeaf(rowID) === false ? { expanded: state.expansion.has(rowID) } : {}),
    });

    for (let column = 0; column < grid.columnCount; column += 1) {
      const cellID = grid.cellAt(rowIndex, column);
      if (cellID === null) continue;
      const current = state.cursor.current === cellID;
      const selected = state.selection.has(cellID);
      const editing = current && state.editMode === 'editing';
      const cell = document.createElement('div');
      cell.className = ['tree-cell', current ? 'current' : '', selected ? 'selected' : '']
        .filter(Boolean)
        .join(' ');
      connection.setCellAttributes(cell, { id: cellID, columnIndex: column + 1 });

      if (editing) {
        const input = document.createElement('input');
        input.className = 'cell-editor';
        connection.bindEditor(input, { id: cellID });
        cell.append(input);
      } else if (column === 0) {
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.style.paddingLeft = `${(tree.depthOf(rowID) ?? 0) * 1.15}rem`;
        const disclosure = document.createElement('span');
        disclosure.className = 'disclosure';
        disclosure.textContent = tree.isLeaf(rowID) === false
          ? state.expansion.has(rowID) ? '▾' : '▸'
          : '·';
        const text = document.createElement('span');
        text.textContent = values.get(cellID) ?? '';
        label.append(disclosure, text);
        if (selected) label.append(selectionDot());
        cell.append(label);
      } else {
        const text = document.createElement('span');
        text.textContent = values.get(cellID) ?? '';
        cell.append(text);
        if (selected) cell.append(selectionDot());
      }
      rowElement.append(cell);
    }
    gridElement.append(rowElement);
  }

  revisionBadge.textContent = `revision ${revision}`;
  stateOutput.textContent = JSON.stringify({
    revision,
    expanded: state.expansion.ids,
    current: state.cursor.current,
    selected: state.selection.selected,
    editMode: state.editMode,
  }, null, 2);
  renderLog();
}

function renderLog(): void {
  eventLog.replaceChildren();
  if (logEntries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-log';
    empty.textContent = 'Keyboard input will appear here.';
    eventLog.append(empty);
    return;
  }
  for (const entry of logEntries) {
    const item = document.createElement('li');
    item.className = 'event-entry';
    const revision = document.createElement('span');
    revision.className = 'event-revision';
    revision.textContent = `r${entry.revision}`;
    const detail = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'event-name';
    name.textContent = `${entry.event} · ${entry.accepted ? 'accepted' : 'rejected'}`;
    const effects = document.createElement('div');
    effects.className = 'event-effects';
    effects.textContent = entry.effects.length === 0 ? 'no effects' : entry.effects.join(', ');
    detail.append(name, effects);
    item.append(revision, detail);
    eventLog.append(item);
  }
}

function selectionDot(): HTMLElement {
  const dot = document.createElement('span');
  dot.className = 'selection-dot';
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector(selector);
  if (element === null) throw new Error(`Missing playground element: ${selector}`);
  return element as T;
}
