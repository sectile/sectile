# Tabular with Vue

Install only Vue for the base profiles. `@sectile/tabular` and `@sectile/dom`
are direct dependencies of `@sectile/vue`; application code does not install
them merely to receive public component types.

```sh
pnpm add @sectile/vue vue
```

## Complete DataGrid example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  DataGridBody,
  DataGridCell,
  DataGridColumnHeader,
  DataGridEditor,
  DataGridHeader,
  DataGridHeaderRow,
  DataGridProvider,
  DataGridRoot,
  DataGridRow,
  defineDataGridColumns,
  useDataGrid,
} from '@sectile/vue/data-grid'

interface User { id: string; name: string; role: string }

const rows = ref<User[]>([
  { id: 'u1', name: 'Ada', role: 'Admin' },
  { id: 'u2', name: 'Grace', role: 'Editor' },
])
const columns = defineDataGridColumns([
  { id: 'name', getValue: (row: User) => row.name },
  { id: 'role', getValue: (row: User) => row.role },
])
const grid = useDataGrid({ columns })
</script>

<template>
  <DataGridProvider :controller="grid">
    <DataGridRoot aria-label="Users">
      <DataGridHeader>
        <DataGridHeaderRow>
          <DataGridColumnHeader
            v-for="column in columns"
            :key="column.id"
            :header-node-id="column.id"
          >{{ column.id }}</DataGridColumnHeader>
        </DataGridHeaderRow>
      </DataGridHeader>
      <DataGridBody>
        <DataGridRow v-for="row in rows" :key="row.id" :row-id="row.id">
          <DataGridCell
            v-for="column in columns"
            :key="`${row.id}:${column.id}`"
            :row-id="row.id"
            :column-id="column.id"
          >
            {{ column.getValue?.(row) }}
            <DataGridEditor :row-id="row.id" :column-id="column.id" />
          </DataGridCell>
        </DataGridRow>
      </DataGridBody>
    </DataGridRoot>
  </DataGridProvider>
</template>
```

The Provider receives the controller once. Root and every compound part obtain
it through injection. Nested Providers are rejected, and parts used outside the
matching Provider fail immediately.

## Public API by profile

| Profile | Creation and context | Structure | Controls and editing |
| --- | --- | --- | --- |
| DataTable | `useDataTable`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`, `DataTableProvider`, `DataTableRoot` | `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor` |
| DataGrid | `useDataGrid`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`, `DataGridProvider`, `DataGridRoot` | `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor` |
| DataTreeGrid | `useDataTreeGrid`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`, `DataTreeGridProvider`, `DataTreeGridRoot` | `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor` |

Every part exports its `Props` and `SlotProps` types. Each profile also exports
its row/column/query/view/source/status/error/command/controller/context types,
accepted-view and access state, request state, change handlers, source resolver,
and `Use*Options`, `Use*SourceOptions`, and `Use*SourceReturn`. These types are
available from the same `@sectile/vue/data-*` subpath and the Vue package root.

## Source execution

`useData*Source` attaches exactly one executor to a controller and defers work
until mount. It exposes status, request and error refs; cancels replaced work;
and ignores stale completion. The resolver owns transport only. Loading, empty,
error, retry, cache and suspense UI remain application-owned.

## Rendering contracts

- `as` selects the rendered element; `as-child` adopts exactly one valid child.
- Native DataTable markup retains table semantics and native form submission.
- DataGrid and DataTreeGrid expose grid/treegrid ARIA, cursor and edit state.
- Controlled ownership is fixed for the mounted Provider.
- SSR never executes a source resolver. Hydration requires the same initial view.
- Column sizes, measurement, scroll and resize remain host state, not semantic state.
