# Tabular with Vue

The Vue Tabular API is collected under `@sectile/vue/tabular`. Install its optional peer dependency, `@sectile/tabular`, when using this subpath. Applications that do not use Tabular do not need it.

```sh
pnpm add @sectile/vue @sectile/tabular vue
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
} from '@sectile/vue/tabular'

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

Every part exports its `Props` and `SlotProps` types. `@sectile/vue/tabular` also exports the row/column/query/view/source/status/error/command/controller/context types, accepted-view and access/request state, change handlers, source resolvers, `Use*Options`, `Use*SourceOptions`, and `Use*SourceReturn` for all three profiles. The Vue package root does not export these APIs.

## Source execution and UI states

`useData*Source` attaches exactly one executor to a controller and starts after mount. It exposes reactive `status` and `error`, cancels replaced work, and ignores stale completion. Its resolver owns transport only. The application owns loading, empty, stale, error, retry, cache, and suspense presentation.

SSR does not execute a source resolver. Hydration must begin from the same accepted view. `sourceKey` replaces a semantic source generation; `replaceResolver` changes transport logic without changing the controller.

The [async data source](./data-source) guide includes a working sort, search, and pagination request plus loading, stale, error, and retry presentation.

## Type inference

`defineData*Columns` infers IDs and value types from `getValue`. Remote projections without record accessors declare their cell schema once through `useData*<Cells>()`. `createData*Components(controller)` carries that schema into every part and Body slot.

```ts
interface UserRecord {
  readonly id: string
  readonly profile: { readonly name: string }
  readonly quota: number
}

const columns = defineDataTableColumns([
  { id: 'name', getValue: (user: UserRecord) => user.profile.name },
  { id: 'quota', getValue: (user: UserRecord) => user.quota },
])

const inferred = useDataTable({ columns })
const InferredTable = createDataTableComponents(inferred)

interface RemoteCells { readonly name: string; readonly quota: number }
const remote = useDataTable<RemoteCells>({ columns })
const RemoteTable = createDataTableComponents(remote)
```

There is no separate broad component API. The namespace created for a controller is the single public component API for its schema and Provider scope.

## Controlled state and slots

Pass a ref for controlled ownership or a `default*` value for uncontrolled ownership. A controlled callback proposes a value; synchronize the ref before its source request starts.

```ts
const query = ref(createTabularQuery())
const selection = ref<DataTableRowSelection>({ kind: 'explicit-rows', rowIDs: [] })

const table = useDataTable({
  columns,
  query,
  onQueryChange: (next) => { query.value = next },
  rowSelection: selection,
  onRowSelectionChange: (next) => { selection.value = next },
})
```

Root and part slots expose the source and interaction state near the template that renders it.

```vue
<DataGrid.Root v-slot="{ acceptedViewState, requestState, cursor, editState }">
  <p v-if="requestState.kind === 'pending'" aria-live="polite">Updating…</p>
  <p v-if="acceptedViewState.kind === 'stale'">Showing the previous result.</p>
  <span>Cell: {{ cursor.current?.rowID }} / {{ cursor.current?.columnID }}</span>
  <span>Mode: {{ editState.kind }}</span>
</DataGrid.Root>
```

Use `useData*Context()` when a descendant component needs the same values in script. Calling it outside a matching Provider fails immediately.

## Rendering contracts

- `as` selects the rendered element; `asChild` adopts exactly one valid child.
- Body repeats accepted rows by default. Its slot exposes `{ row, rowIndex, isGroup }`; `manual` enables explicit low-level Row composition.
- Cells and leaf headers use `column="name"`. Explicit `rowID` is needed only outside automatic Body composition.
- Only a nested group header uses `header="employment"` to identify its schema node. `HeaderRow` has no depth prop; the schema determines depth, spans, and ARIA metadata.
- Body slot rows preserve the cell schema carried by the controller. Getter-based columns infer their value types; remote projections can declare the schema with `useData*<Cells>()`. Leaf and group schemas can be distinct.
- Name a native DataTable with `Caption` or `aria-labelledby`. Grid and TreeGrid use `aria-label` or `aria-labelledby`.
- Native DataTable markup retains table semantics and form submission.
- DataGrid and DataTreeGrid project grid/treegrid ARIA, a roving tab stop, cursor, and edit state.
- Controlled ownership is fixed for the mounted Provider.
- Column sizes, measurement, scroll, and resize remain host state, not semantic state.

## `as` and `asChild`

`as` changes the default element. `asChild` merges a part's attributes, events, and ref into one valid child, so an existing design-system input or button can adopt Tabular behavior without recreating its styling.

```vue
<DataTable.FilterControl as-child scope="global" id="search" predicate="contains">
  <TextField type="search" aria-label="Search users" />
</DataTable.FilterControl>

<DataGrid.Editor as-child column="quota">
  <NumberField aria-label="Quota" />
</DataGrid.Editor>
```

The adopted child must resolve to one element. When replacing a structural part, the application remains responsible for satisfying the native or ARIA host contract.
