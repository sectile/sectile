<script setup>
import TabularDataTableDemo from '../../.vitepress/theme/components/TabularDataTableDemo.vue'
</script>

# DataTable

DataTable is the read-oriented profile. Start here for directories, reports, search results, audit logs, and admin lists where native table semantics and row actions matter more than spreadsheet navigation.

<TabularDataTableDemo />

Try sorting more than once to cycle ascending, descending, and off. Filter the rows, select individual results, then select every matching row. The demo uses the real `DataTableSortTrigger`, `DataTableFilterControl`, `DataTableSelectionControl`, and `DataTableBulkSelectionControl` parts.

::: details Complete source for the live example
<<< ../../.vitepress/theme/components/TabularDataTableDemo.vue
:::

## Basic composition

The Provider receives the controller once. Root and every nested part read it through injection. A source resolves the request envelope into a revision-matched view; rendered row IDs must come from that accepted view.

```vue
<script setup lang="ts">
import {
  DataTableProvider, DataTableRoot, DataTableHeader, DataTableHeaderRow,
  DataTableColumnHeader, DataTableBody, DataTableRow, DataTableCell,
  defineDataTableColumns, useDataTable, useDataTableSource,
} from '@sectile/vue/data-table'

const columns = defineDataTableColumns([
  { id: 'name', capabilities: ['sort', 'filter'] },
  { id: 'role', capabilities: ['sort', 'filter'] },
])
const table = useDataTable({ columns })

useDataTableSource(table, async (request) => {
  const page = await fetchUsers(request)
  return toViewResponse(request, columns, page)
})
</script>

<template>
  <DataTableProvider :controller="table">
    <DataTableRoot aria-label="Users">
      <DataTableHeader><DataTableHeaderRow :depth="0">
        <DataTableColumnHeader headerNodeID="name">Name</DataTableColumnHeader>
        <DataTableColumnHeader headerNodeID="role">Role</DataTableColumnHeader>
      </DataTableHeaderRow></DataTableHeader>
      <DataTableBody>
        <DataTableRow v-for="row in acceptedRows" :key="row.id" :rowID="row.id">
          <DataTableCell :rowID="row.id" columnID="name">{{ row.cells.name }}</DataTableCell>
          <DataTableCell :rowID="row.id" columnID="role">{{ row.cells.role }}</DataTableCell>
        </DataTableRow>
      </DataTableBody>
    </DataTableRoot>
  </DataTableProvider>
</template>
```

## Sort and filter

`DataTableSortTrigger` cycles one column through ascending, descending, and unsorted. `DataTableFilterControl` binds an input or select to a global or column descriptor. Both update the canonical query and request a new view; the source decides what comparator and predicate keys mean.

```vue
<DataTableSortTrigger columnID="name" comparator="locale">
  Name
</DataTableSortTrigger>

<DataTableFilterControl
  scope="global"
  id="directory-search"
  predicate="contains"
  placeholder="Search people"
/>
```

## Selection and native forms

Use `DataTableSelectionControl` for explicit rows and `DataTableBulkSelectionControl` for all matching rows or group leaves. Explicit selection keeps a native `name` and `value`; all-matching selection is revision-bound and stores exclusions rather than every unloaded ID.

```vue
<DataTableSelectionControl
  :rowID="row.id"
  name="selected-users"
  :value="row.id"
/>

<DataTableBulkSelectionControl :target="{ kind: 'all-matching' }">
  Select all results
</DataTableBulkSelectionControl>
```

## Grouped rows and edit intent

DataTable may render group rows returned by the source. `DataTableDisclosure` changes expansion and requests a new view. `DataTableEditor` emits value-commit intent from an input, textarea, or select, but the application validates and persists the value. There is no two-dimensional cursor or edit mode; use DataGrid when that interaction is central.

## Source and presentation states

`useDataTableSource` exposes `status`, `error`, `reload`, `cancel`, `replaceResolver`, and `dispose`. Render loading, empty, stale, error, and retry UI according to application policy. SSR does not execute a resolver, so server and client must share the same initial accepted view when hydrating.

## Public Vue API

- Creation: `useDataTable`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`
- Context: `DataTableProvider`, `DataTableRoot`
- Structure: `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Controls: `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor`

Every part also exports `Props` and `SlotProps` types. The same subpath exports query, view, source, status, error, command, controller, accepted-view, access/request state, change-handler, resolver, and options types.
