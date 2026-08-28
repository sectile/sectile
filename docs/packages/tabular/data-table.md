<script setup>
import TabularDataTableDemo from '../../.vitepress/theme/components/TabularDataTableDemo.vue'
</script>

# DataTable

DataTable is the read-oriented profile. Start here for directories, reports, search results, audit logs, and admin lists where native table semantics and row actions matter more than spreadsheet navigation.

<TabularDataTableDemo />

Try sorting more than once to cycle ascending, descending, and off. Filter the rows, select individual results, then select every matching row. The demo uses the real `DataTable.SortTrigger`, `DataTable.FilterControl`, `DataTable.SelectionControl`, and `DataTable.BulkSelectionControl` parts returned for its controller.

::: details Complete source for the live example
<<< ../../.vitepress/theme/components/TabularDataTableDemo.vue
:::

## Basic composition

`createDataTableComponents` creates the typed compound component namespace for a controller. Its Provider carries that controller through injection without a prop. A source resolves the request envelope into a revision-matched view. Body iterates the accepted rows and provides each schema-typed `row` to its slot; nested cells and controls inherit that row identity.

```vue
<script setup lang="ts">
import {
  defineDataTableColumns, useDataTable,
  createDataTableComponents, useDataTableSource,
} from '@sectile/vue/data-table'

interface UserCells {
  readonly name: string
  readonly role: string
}

const columns = defineDataTableColumns([
  { id: 'name', capabilities: ['sort', 'filter'] },
  { id: 'role', capabilities: ['sort', 'filter'] },
])
const table = useDataTable<UserCells>({ columns })
const DataTable = createDataTableComponents(table)

useDataTableSource(table, async (request) => {
  const page = await fetchUsers(request)
  return toViewResponse(request, columns, page)
})
</script>

<template>
  <DataTable.Provider>
    <DataTable.Root>
      <DataTable.Caption>Users</DataTable.Caption>
      <DataTable.Header><DataTable.HeaderRow>
        <DataTable.ColumnHeader headerNodeID="name">Name</DataTable.ColumnHeader>
        <DataTable.ColumnHeader headerNodeID="role">Role</DataTable.ColumnHeader>
      </DataTable.HeaderRow></DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
        <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
      </DataTable.Body>
    </DataTable.Root>
  </DataTable.Provider>
</template>
```

## Sort and filter

`DataTable.SortTrigger` cycles one column through ascending, descending, and unsorted. `DataTable.FilterControl` binds an input or select to a global or column descriptor. Both update the canonical query and request a new view; the source decides what comparator and predicate keys mean.

```vue
<DataTable.SortTrigger column="name" comparator="locale">
  Name
</DataTable.SortTrigger>

<DataTable.FilterControl
  scope="global"
  id="user-search"
  predicate="contains"
  placeholder="Search people"
/>
```

## Selection and native forms

Use `DataTable.SelectionControl` for explicit rows and `DataTable.BulkSelectionControl` for all matching rows or group leaves. The bulk control projects `aria-checked="false"`, `"mixed"`, and `"true"` for no selection, partial selection, and all matching rows. Inside Body, the row ID and native value default to the current row, so only `name` is required. Set `value` only when a submitted form needs a different value. All-matching selection is revision-bound and stores exclusions rather than every unloaded ID.

```vue
<DataTable.SelectionControl name="selected-users" />

<DataTable.BulkSelectionControl :target="{ kind: 'all-matching' }">
  Select all results
</DataTable.BulkSelectionControl>
```

## Grouped rows and edit intent

DataTable may render group rows returned by the source. `DataTable.Disclosure` changes expansion and requests a new view. `DataTable.Editor` emits value-commit intent from an input, textarea, or select, but the application validates and persists the value. There is no two-dimensional cursor or edit mode; use DataGrid when that interaction is central.

Header rows do not take a depth prop. Multi-level `colspan`, `rowspan`, and ARIA metadata are derived from the header schema and each `headerNodeID`. Give a native DataTable its accessible name with `DataTable.Caption`, or use `aria-labelledby` when a visible title outside the table already names it.

Body owns normal row repetition. Use `<DataTable.Body manual>` with explicit `DataTable.Row rowID="…"` only for low-level rendering such as a virtualized window.

## Source and presentation states

`useDataTableSource` exposes `status`, `error`, `reload`, `cancel`, `replaceResolver`, and `dispose`. Render loading, empty, stale, error, and retry UI according to application policy. SSR does not execute a resolver, so server and client must share the same initial accepted view when hydrating.

## Public Vue API

- Creation: `useDataTable`, `createDataTableComponents`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`
- Context: `DataTable.Provider`, `DataTable.Root` from the returned namespace
- Structure: `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Controls: `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor`

Every part also exports `Props` and `SlotProps` types. The same subpath exports query, view, source, status, error, command, controller, accepted-view, access/request state, change-handler, resolver, and options types.
