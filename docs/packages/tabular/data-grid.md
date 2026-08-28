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

## Grid composition

DataGrid uses ARIA grid semantics rather than native table elements. Rows in an accepted view must all be leaves; a hierarchical response is rejected atomically. Create its typed namespace with `createDataGridComponents(grid)`.

```vue
<script setup lang="ts">
import { createDataGridComponents } from '@sectile/vue/data-grid'

const DataGrid = createDataGridComponents(grid)
</script>

<template>
<DataGrid.Provider>
  <DataGrid.Root aria-label="Release tasks" @command="handleCommand">
    <DataGrid.Header>
      <DataGrid.HeaderRow>
        <DataGrid.ColumnHeader headerNodeID="task">Task</DataGrid.ColumnHeader>
        <DataGrid.ColumnHeader headerNodeID="owner">Owner</DataGrid.ColumnHeader>
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

## Selection, columns, and large data

`DataGrid.RowSelectionControl` and `DataGrid.BulkSelectionControl` manage row selection independently of the cell cursor. Column state covers order, hidden columns, and start/end pinning. `DataGrid.ColumnResizeHandle` projects host-owned sizes. For large surfaces, compose `@sectile/vue/virtual` and the optional Tabular adapter only where needed.

## Public Vue API

- Creation: `useDataGrid`, `createDataGridComponents`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`
- Context: `DataGrid.Provider`, `DataGrid.Root`
- Structure: `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Controls: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor`

Each part exports `Props` and `SlotProps`; the subpath also exports cursor/edit state, projection, query, view, source, command, controller, error, resolver, status, controlled-state handlers, and options types.
