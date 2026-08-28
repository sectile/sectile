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

DataGrid uses ARIA grid semantics rather than native table elements. Rows in an accepted view must all be leaves; a hierarchical response is rejected atomically.

```vue
<DataGridProvider :controller="grid">
  <DataGridRoot aria-label="Release tasks" @command="handleCommand">
    <DataGridHeader>
      <DataGridHeaderRow>
        <DataGridColumnHeader headerNodeID="task">Task</DataGridColumnHeader>
        <DataGridColumnHeader headerNodeID="owner">Owner</DataGridColumnHeader>
      </DataGridHeaderRow>
    </DataGridHeader>
    <DataGridBody v-slot="{ row }">
      <DataGridCell column="task">{{ row.cells.task }}</DataGridCell>
      <DataGridCell column="owner">{{ row.cells.owner }}</DataGridCell>
    </DataGridBody>
  </DataGridRoot>
</DataGridProvider>
```

## Cursor and keyboard navigation

The controller owns a cell address, not DOM focus itself. The DOM connection projects one tab stop, moves across visible editable cells, and emits reveal requests when the current cell is not mounted. Applications can also dispatch `focus-cell` and `move-cell` directly.

```ts
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'task-1', columnID: 'owner' } })
grid.dispatch({ type: 'move-cell', direction: 'down' })
```

## Editing and validation

Mark editable columns with the `edit` capability and place a `DataGridEditor` in each editable cell. Enter begins editing, Enter commits, and Escape cancels. `parseValue` can return a structured failure; commit commands remain application-owned so persistence and optimistic updates stay outside the reducer.

```vue
<DataGridCell column="owner" v-slot="{ editState }">
  <span v-if="editState.kind !== 'editing'">{{ row.cells.owner }}</span>
  <DataGridEditor
    column="owner"
    :value="row.cells.owner"
  />
</DataGridCell>
```

When a source response removes the edited row or column, DataGrid cancels the editor before moving the cursor to a deterministic surviving cell. Replacing the source also cancels editing before requesting the replacement view.

Body renders accepted rows by default and gives each slot invocation its typed `row`. Cells, row-selection controls, and editors inherit the row ID. Use `<DataGridBody manual>` and explicit `DataGridRow` only when a custom windowing strategy must own row placement. Header row depth and span metadata come from the header schema rather than a component prop.

## Selection, columns, and large data

`DataGridRowSelectionControl` and `DataGridBulkSelectionControl` manage row selection independently of the cell cursor. Column state covers order, hidden columns, and start/end pinning. `DataGridColumnResizeHandle` projects host-owned sizes. For large surfaces, compose `@sectile/vue/virtual` and the optional Tabular adapter only where needed.

## Public Vue API

- Creation: `useDataGrid`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`
- Context: `DataGridProvider`, `DataGridRoot`
- Structure: `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Controls: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor`

Each part exports `Props` and `SlotProps`; the subpath also exports cursor/edit state, projection, query, view, source, command, controller, error, resolver, status, controlled-state handlers, and options types.
