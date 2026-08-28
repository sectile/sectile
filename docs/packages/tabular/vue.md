# Tabular with Vue

Install Vue for the base profiles. `@sectile/tabular` and `@sectile/dom` are direct dependencies of `@sectile/vue`, so application code does not install them merely to receive public component types.

```sh
pnpm add @sectile/vue vue
```

## Choose a profile

- [DataTable](./data-table) includes a live directory with sorting, filtering, explicit and all-matching selection, grouped disclosure, native forms, and edit intent.
- [DataGrid](./data-grid) includes live two-dimensional navigation, row selection, editing, commit/cancel, and recovery behavior.
- [DataTreeGrid](./data-tree-grid) includes live hierarchy disclosure, leaf selection, editing, and collapse recovery.

Each page includes the complete source of its running example plus focused patterns for individual features.

## Provider and injection

Create the controller in `setup`, then call `createData*Components` once to obtain the schema-typed component namespace. Its Provider injects the bound controller through the subtree and takes no controller prop.

```vue
<script setup lang="ts">
import {
  defineDataGridColumns,
  useDataGrid,
  createDataGridComponents,
  useDataGridSource,
} from '@sectile/vue/data-grid'

interface UserCells {
  readonly name: string
}

const columns = defineDataGridColumns([
  { id: 'name', capabilities: ['sort', 'filter', 'edit'] },
])
const grid = useDataGrid<UserCells>({ columns })
const DataGrid = createDataGridComponents(grid)
const source = useDataGridSource(grid, (request, { signal }) =>
  resolveUsers(request, signal),
)
</script>

<template>
  <DataGrid.Provider>
    <DataGrid.Root aria-label="Users">
      <!-- Header, Body, Row, Cell, and controls inject grid here. -->
    </DataGrid.Root>
  </DataGrid.Provider>

  <p v-if="source.status.value === 'loading'">Loading…</p>
  <button v-if="source.status.value === 'error'" @click="source.reload">Retry</button>
</template>
```

Nested Providers form nested scopes and each part resolves the nearest matching Provider. A part used outside a matching Provider fails immediately. Body renders accepted source rows and exposes each schema-typed `row` to its slot. Nested cells and controls inherit the current row ID; arbitrary local IDs that are absent from the current projection cannot be registered as interactive rows or cells.

## Public API by profile

| Profile | Creation and context | Structure | Controls and editing |
| --- | --- | --- | --- |
| DataTable | `useDataTable`, `createDataTableComponents`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns` | `DataTable.Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor` |
| DataGrid | `useDataGrid`, `createDataGridComponents`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns` | `DataGrid.Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor` |
| DataTreeGrid | `useDataTreeGrid`, `createDataTreeGridComponents`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns` | `DataTreeGrid.Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor` |

Every part exports its `Props` and `SlotProps` types. Each profile also exports row/column/query/view/source/status/error/command/controller/context types, accepted-view and access/request state, change handlers, a source resolver, and `Use*Options`, `Use*SourceOptions`, and `Use*SourceReturn` from the same `@sectile/vue/data-*` subpath and the Vue package root.

## Source execution and UI states

`useData*Source` attaches exactly one executor to a controller and starts after mount. It exposes reactive `status` and `error`, cancels replaced work, and ignores stale completion. Its resolver owns transport only. The application owns loading, empty, stale, error, retry, cache, and suspense presentation.

SSR does not execute a source resolver. Hydration must begin from the same accepted view. `sourceKey` replaces a semantic source generation; `replaceResolver` changes transport logic without changing the controller.

## Rendering contracts

- `as` selects the rendered element; `asChild` adopts exactly one valid child.
- Body repeats accepted rows by default. Its slot exposes `{ row, rowIndex, isGroup }`; `manual` enables explicit low-level Row composition.
- Cell-oriented parts use `column="name"`. Explicit `rowID` is needed only outside automatic Body composition. Header nodes keep `headerNodeID` because a node may represent a column or a group.
- `HeaderRow` has no depth prop. Header schema and `headerNodeID` determine nested depth, spans, and ARIA metadata.
- Body slot rows preserve the cell schema carried by the controller. Getter-based columns infer their value types; remote projections can declare the schema with `useData*<Cells>()`. Leaf and group schemas can be distinct.
- Name a native DataTable with `Caption` or `aria-labelledby`. Grid and TreeGrid use `aria-label` or `aria-labelledby`.
- Native DataTable markup retains table semantics and form submission.
- DataGrid and DataTreeGrid project grid/treegrid ARIA, a roving tab stop, cursor, and edit state.
- Controlled ownership is fixed for the mounted Provider.
- Column sizes, measurement, scroll, and resize remain host state, not semantic state.
