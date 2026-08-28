<script setup>
import TabularDataGridDemo from '../../.vitepress/theme/components/TabularDataGridDemo.vue'
</script>

# DataGrid

DataGrid is the flat application-grid profile. Use it for task boards, permission matrices, inventories, and editors where a person moves between cells and edits values without leaving the grid.

<TabularDataGridDemo />

Click a cell, move with the arrow keys, press Enter to edit, and press Escape to cancel. Row checkboxes remain independent from the current cell. Sorting changes the accepted view without losing the profile contract.

::: details Complete source for the live example
<<< ../../.vitepress/theme/components/TabularDataGridDemo.vue
:::

## Use Tabular core only

The core controller computes cursor, edit mode, selection, and commands without owning DOM focus or elements.

```ts
import { createDataGrid } from '@sectile/tabular/data-grid'

const columns = [
  { id: 'task', capabilities: ['sort', 'edit'] },
  { id: 'owner', capabilities: ['sort'] },
] as const
const grid = createDataGrid({ columns })

grid.subscribeCommands((command) => {
  if (command.type === 'request-view') loadGridView(command.request)
  if (command.type === 'commit-edit') saveCell(command.cell, command.value)
})
grid.synchronizeView(initialGridResponse)
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'release', columnID: 'task' } })
grid.dispatch({ type: 'move-cell', direction: 'right' })
renderGrid(grid.getProjection(), grid.getSnapshot())
```

## Connect existing DOM

The DOM connection projects ARIA grid semantics, roving focus, keyboard navigation, and editor lifetime onto existing elements.

`RowSelectionControl` also supports Shift-click and Shift-Space range selection across the currently visible leaf rows; cell selection and cursor movement remain unchanged.

```ts
import { createDataGrid } from '@sectile/dom/tabular'

const root = document.querySelector<HTMLElement>('#release-grid')!
const connection = createDataGrid({ columns, root, onCommand: handleGridCommand })
const taskHeader = root.querySelector<HTMLElement>('[data-header="task"]')!
const taskCell = root.querySelector<HTMLElement>('[data-cell="release:task"]')!

connection.setColumnHeaderAttributes(taskHeader, { columnID: 'task' })
connection.registerCell(taskCell, { cell: { rowID: 'release', columnID: 'task' } })
connection.focusCurrent()
```

## Vue grid composition

DataGrid uses ARIA grid semantics rather than native table elements. Rows in an accepted view must all be leaves; a hierarchical response is rejected atomically. Create its typed namespace with `createDataGridComponents(grid)`.

```vue
<script setup lang="ts">
import { createDataGridComponents } from '@sectile/vue/tabular'

const DataGrid = createDataGridComponents(grid)
</script>

<template>
<DataGrid.Provider>
  <DataGrid.Root aria-label="Release tasks" @command="handleCommand">
    <DataGrid.Header>
      <DataGrid.HeaderRow>
        <DataGrid.ColumnHeader column="task">Task</DataGrid.ColumnHeader>
        <DataGrid.ColumnHeader column="owner">Owner</DataGrid.ColumnHeader>
      </DataGrid.HeaderRow>
    </DataGrid.Header>
    <DataGrid.Body v-slot="{ row }">
      <DataGrid.Cell column="task">{{ row.cells.task }}</DataGrid.Cell>
      <DataGrid.Cell column="owner">{{ row.cells.owner }}</DataGrid.Cell>
    </DataGrid.Body>
  </DataGrid.Root>
</DataGrid.Provider>
</template>
```

## Cursor and keyboard navigation

The controller owns a cell address, not DOM focus itself. The DOM connection projects one tab stop, moves across visible editable cells, and emits reveal requests when the current cell is not mounted. Applications can also dispatch `focus-cell` and `move-cell` directly.

```ts
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'task-1', columnID: 'owner' } })
grid.dispatch({ type: 'move-cell', direction: 'down' })
```

`boundary: 'stop'` stops at the edge; `boundary: 'wrap-axis'` continues on the next row or axis. `isCellDisabled` defines cells that navigation and editing skip.

```ts
const grid = useDataGrid({
  columns,
  isCellDisabled: (cell) => cell.columnID === 'approval' && !canApprove(cell.rowID),
})

grid.dispatch({ type: 'move-cell', direction: 'right', boundary: 'wrap-axis' })
```

Cursor and edit mode can each be controlled or uncontrolled.

```ts
const cursor = ref<DataGridCursorState>({ current: null })
const editState = ref<DataGridEditState>({ kind: 'navigation' })

const grid = useDataGrid({
  columns,
  cursor,
  onCursorChange: (next) => { cursor.value = next },
  editState,
  onEditStateChange: (next) => { editState.value = next },
})
```

## Editing and validation

Mark editable columns with the `edit` capability and place a `DataGrid.Editor` in each editable cell. Enter begins editing, Enter commits, and Escape cancels. `parseValue` can return a structured failure; commit commands remain application-owned so persistence and optimistic updates stay outside the reducer.

```vue
<DataGrid.Cell column="owner" v-slot="{ editState }">
  <span v-if="editState.kind !== 'editing'">{{ row.cells.owner }}</span>
  <DataGrid.Editor
    column="owner"
    :value="row.cells.owner"
  />
</DataGrid.Cell>
```

When a source response removes the edited row or column, DataGrid cancels the editor before moving the cursor to a deterministic surviving cell. Replacing the source also cancels editing before requesting the replacement view.

Body renders accepted rows by default and gives each slot invocation its typed `row`. Cells, row-selection controls, and editors inherit the row ID. Use `<DataGrid.Body manual>` and explicit `DataGrid.Row` only when a custom windowing strategy must own row placement. Header row depth and span metadata come from the header schema rather than a component prop.

```ts
function handleCommand(command: DataGridCommand) {
  if (command.type === 'commit-edit') {
    saveCell(command.cell, command.value)
    grid.requestView()
  }
  if (command.type === 'cancel-edit') releaseDraft(command.cell, command.reason)
  if (command.type === 'request-reveal-cell') {
    const target = adapter.locateCell(command.cell)
    if (target !== null) virtualizer.scrollTo(target.id)
  }
}
```

Begin, commit, and cancel commands keep editor DOM behavior separate from persistence. Composition never commits prematurely; a focus transfer cancels the previous edit first.

## Selection, columns, and large data

`DataGrid.RowSelectionControl` and `DataGrid.BulkSelectionControl` manage row selection independently of the cell cursor. Column state covers order, hidden columns, and start/end pinning. `DataGrid.ColumnResizeHandle` projects host-owned sizes. For large surfaces, compose `@sectile/vue/virtual` and the optional Tabular adapter only where needed.

```vue
<DataGrid.RowSelectionControl name="selected-work-items" />
<DataGrid.BulkSelectionControl :target="{ kind: 'all-matching' }">Select every result</DataGrid.BulkSelectionControl>
<DataGrid.ColumnResizeHandle column="task" :min-size="220" />
```

## Query and source

DataGrid shares the same query and source envelope as DataTable. Sort and filter controls request a new flat view rather than rewriting mounted cells. Server pagination, abort, and stale-response behavior are covered in [async data sources](./data-source). A response containing group rows is rejected atomically by the flat profile.

## Parts by responsibility

| Part | Responsibility |
| --- | --- |
| `Provider` · `Root` | Controller scope, ARIA grid, and command/error boundary |
| `Header` · `HeaderRow` · `ColumnHeader` | Header rowgroup and schema metadata |
| `SortTrigger` · `FilterControl` | Query update and fresh source request |
| `Body` · `Row` · `Cell` | Flat accepted view and 2D cell registration |
| `RowSelectionControl` · `BulkSelectionControl` | Row selection independent from the cursor |
| `ColumnResizeHandle` | Host-owned column size |
| `Editor` | Navigation/edit mode and commit/cancel wiring |

## Public API by layer

- Tabular core: `createDataGrid`, `tryCreateDataGrid`, controller view/source lifecycle, `dispatch`, and cursor/edit projection
- DOM: `createDataGrid`, `connectDataGrid`, header/row/cell registration, interaction bindings, `focusCurrent`, and `requestRevealCell`
- Vue creation: `useDataGrid`, `createDataGridComponents`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`
- Vue structure: `Provider`, `Root`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Vue controls: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor`

Each layer exports cursor/edit state, projection, query, view, source, command, controller, error, and option types from the same subpath. Vue adds every part's `Props` and `SlotProps`.
