import { createTreeGrid, type TreeGridConnection } from '@sectile/dom/tree-grid';
import { effectLabels, eventLabel, type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

const rows = [
  { id: 'projects', parentID: null, cells: ['projects-name', 'projects-status'] },
  { id: 'atlas', parentID: 'projects', cells: ['atlas-name', 'atlas-status'] },
  { id: 'atlas-design', parentID: 'atlas', cells: ['atlas-design-name', 'atlas-design-status'] },
  { id: 'atlas-build', parentID: 'atlas', cells: ['atlas-build-name', 'atlas-build-status'] },
  { id: 'beacon', parentID: 'projects', cells: ['beacon-name', 'beacon-status'] },
  { id: 'archive', parentID: null, cells: ['archive-name', 'archive-status'] },
] as const;
const initialValues = new Map<string, string>([
  ['projects-name', 'Projects'], ['projects-status', 'Portfolio'],
  ['atlas-name', 'Atlas'], ['atlas-status', 'In progress'],
  ['atlas-design-name', 'Design system'], ['atlas-design-status', 'Review'],
  ['atlas-build-name', 'Implementation'], ['atlas-build-status', 'Active'],
  ['beacon-name', 'Beacon'], ['beacon-status', 'Planning'],
  ['archive-name', 'Archive'], ['archive-status', '12 items'],
]);
type RowID = typeof rows[number]['id'];
type CellID = typeof rows[number]['cells'][number];

export const treeGridDemo: DemoDefinition = {
  id: 'tree-grid',
  label: 'Tree grid',
  title: 'Project tree grid',
  description: 'Navigate hierarchy and columns, select cells, and edit text in place.',
  shortcuts: [
    { keys: ['↑', '↓', '←', '→'], label: 'move' },
    { keys: ['Alt', '← / →'], label: 'collapse / expand' },
    { keys: ['Space'], label: 'select' },
    { keys: ['Enter'], label: 'edit / commit' },
    { keys: ['Esc'], label: 'cancel' },
  ],
  cases: [
    { id: 'expanded', title: 'Expanded project tree grid', mount: (context) => mountTreeGrid(context, { expanded: ['projects', 'atlas'], disabled: [], controlled: false }) },
    { id: 'collapsed', title: 'Collapsed portfolio rows', mount: (context) => mountTreeGrid(context, { expanded: [], disabled: [], controlled: false }) },
    { id: 'unavailable-cells', title: 'Unavailable status cells', mount: (context) => mountTreeGrid(context, { expanded: ['projects'], disabled: ['atlas-status', 'beacon-status'], controlled: false }) },
    { id: 'controlled', title: 'Controlled tree grid', mount: (context) => mountTreeGrid(context, { expanded: ['projects', 'atlas'], disabled: [], controlled: true }) },
  ],
};

function mountTreeGrid(context: DemoContext, scenario: { readonly expanded: readonly RowID[]; readonly disabled: readonly CellID[]; readonly controlled: boolean }): DemoSession {
    const root = document.createElement('div');
    root.className = 'tree-grid';
    context.surface.append(root);
    const values = new Map(initialValues);
    let externalExpanded = [...scenario.expanded]; let externalValue: CellID | null = null; let externalHighlight: CellID | null = 'projects-name'; let externalEdit: 'navigation' | 'editing' = 'navigation';
    let connection!: TreeGridConnection<RowID, CellID>;
    connection = createTreeGrid({
      rows,
      root,
      ...context.interaction,
      policies: { eligible: (id) => !scenario.disabled.includes(id) },
      ...(scenario.controlled ? {
        expandedValue: externalExpanded, value: externalValue, highlightedValue: externalHighlight, editMode: externalEdit,
        onExpandedValueChange: ({ value }) => { externalExpanded = [...value]; queueMicrotask(syncControlled); },
        onValueChange: ({ value }) => { externalValue = value; queueMicrotask(syncControlled); },
        onHighlightedValueChange: ({ value }) => { externalHighlight = value; queueMicrotask(syncControlled); },
        onEditModeChange: ({ value }) => { externalEdit = value; queueMicrotask(syncControlled); },
      } : { defaultExpandedValue: scenario.expanded, defaultHighlightedValue: externalHighlight }),
      getCellValue: (id) => values.get(id) ?? '',
      setCellValue: (id, value) => values.set(id, value),
      onTransition: ({ event, result }) => context.record({
        revision: result.snapshot.revision,
        event: eventLabel(event),
        accepted: result.ok,
        effects: effectLabels(result.commands),
      }),
      onUpdate: render,
    });

    function render(): void {
      const { model } = connection;
      const { tree, grid } = model;
      const { revision, state } = connection.getSnapshot();
      const visibleRows = new Set(tree.visible(state.expansion).ids);
      root.replaceChildren();
      connection.setGridAttributes(visibleRows.size, grid.columnCount);

      let visibleRowIndex = 0;
      for (let rowIndex = 0; rowIndex < grid.rowCount; rowIndex += 1) {
        const rowID = model.rowIDs[rowIndex];
        if (rowID === undefined || !visibleRows.has(rowID)) continue;
        visibleRowIndex += 1;
        const row = document.createElement('div');
        row.className = 'tree-row';
        connection.setRowAttributes(row, {
          rowIndex: visibleRowIndex,
          level: (tree.depthOf(rowID) ?? 0) + 1,
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
            .filter(Boolean).join(' ');
          if (scenario.disabled.includes(cellID)) { cell.classList.add('disabled'); cell.setAttribute('aria-disabled', 'true'); }
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
            if (tree.isLeaf(rowID) === false) {
              connection.setDisclosureAttributes(disclosure, rowID);
            } else {
              disclosure.setAttribute('aria-hidden', 'true');
            }
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
          row.append(cell);
        }
        root.append(row);
      }
      context.showState(revision, {
        expanded: state.expansion.ids,
        current: state.cursor.current,
        selected: state.selection.selected,
        editMode: state.editMode,
        disabled: scenario.disabled,
        ownership: scenario.controlled ? 'controlled' : 'uncontrolled',
      });
    }

    function syncControlled(): void { connection.syncControlledValues({ expandedValue: externalExpanded, value: externalValue, highlightedValue: externalHighlight, editMode: externalEdit }); }

    render();
    return { focus: () => connection.focusCurrent(), disconnect: () => connection.disconnect() };
}

function selectionDot(): HTMLElement {
  const dot = document.createElement('span');
  dot.className = 'selection-dot';
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}
