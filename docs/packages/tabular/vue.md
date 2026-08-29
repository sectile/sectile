<script setup>
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# Tabular with Vue

The Vue Tabular API is split by profile across `@sectile/vue/data-table`, `@sectile/vue/data-grid`, and `@sectile/vue/data-tree-grid`. Install the optional `@sectile/tabular` peer when using one of these entry points.

```sh
pnpm add @sectile/vue @sectile/tabular vue
```

<TabularExample kind="table-overview" />

Open **Code → Vue** to see controller creation, typed compound components, Provider, and source composition in one file.

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
  useDataGrid,
  createDataGridComponents,
} from '@sectile/vue/data-grid'

const grid = useDataGrid({
  source: (request, { signal }) => resolveUsers(request, signal),
})
const DataGrid = createDataGridComponents(grid)
</script>

<template>
  <DataGrid.Provider>
    <DataGrid.Root aria-label="Users">
      <!-- Header, Body, Row, Cell, and controls inject grid here. -->
    </DataGrid.Root>
  </DataGrid.Provider>

  <p v-if="grid.status.value === 'loading'">Loading…</p>
  <button v-if="grid.status.value === 'error'" @click="grid.reload">Retry</button>
</template>
```

Nested Providers form nested scopes and each part resolves the nearest matching Provider. A part used outside a matching Provider fails immediately. Body renders accepted source rows and exposes each schema-typed `row` to its slot. Nested cells and controls inherit the current row ID; arbitrary local IDs that are absent from the current projection cannot be registered as interactive rows or cells.

## Public API by profile

| Profile | Creation and context | Structure | Controls and editing |
| --- | --- | --- | --- |
| DataTable | `useDataTable`, `createDataTableComponents`, `useDataTableContext` | `DataTable.Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor` |
| DataGrid | `useDataGrid`, `createDataGridComponents`, `useDataGridContext` | `DataGrid.Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor` |
| DataTreeGrid | `useDataTreeGrid`, `createDataTreeGridComponents`, `useDataTreeGridContext` | `DataTreeGrid.Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor` |

Every profile entry point exports its own parts, `Props`, `SlotProps`, controller contracts, source contracts, and helpers. The Vue package root does not export these APIs.

## Source execution and UI states

`useData*` owns exactly one source executor and starts it after mount. The returned controller exposes reactive `status` and `error`, cancels replaced work, and ignores stale completion. Its resolver owns transport only. The application owns loading, empty, stale, error, retry, cache, and suspense presentation.

SSR does not execute a source resolver. Hydration must begin from the same accepted view. `sourceKey` replaces a semantic source generation; `replaceResolver` changes transport logic without changing the controller.

The [async data source](./data-source) guide includes a working sort, search, and pagination request plus loading, stale, error, and retry presentation.

## Type inference

The source response is the schema owner. `useData*` infers leaf and group cell types from `rows[].cells`, and `createData*Components(controller)` carries them into every part and Body slot. `column` accepts inferred nested paths, including array indexes. A direct cell key wins over path traversal, so an existing flat key such as `"profile.name"` remains valid.

Do not copy that schema into a second client-side `columns` configuration. Declare stable presentation directly with Compound parts. If the server truly returns a dynamic schema, iterate the accepted source schema in the template instead.

```ts
const inferred = useDataTable({
  source: async (request) => ({
    ...request,
    viewRevision: 1,
    matchingLeafCount: { kind: 'known', value: 1 },
    visibleRowCount: { kind: 'known', value: 1 },
    rows: [{
      kind: 'leaf',
      id: 'user-1',
      cells: { profile: { name: 'Ada' }, items: [{ price: 10 }] },
    }],
    columnSchema: {
      revision: request.columnSchemaRevision,
      columns: [{ id: 'profile.name' }, { id: 'items[0].price' }],
      headers: [],
    },
    removedRowIDs: [],
  }),
})
const InferredTable = createDataTableComponents(inferred)
// accepted: profile.name, items[0].price
```

```vue
<InferredTable.Body v-slot="{ row }">
  <InferredTable.Cell column="profile.name">{{ row.cells.profile.name }}</InferredTable.Cell>
  <InferredTable.Cell column="items[0].price">{{ row.cells.items[0]?.price }}</InferredTable.Cell>
</InferredTable.Body>
```

There is no separate broad component API. The namespace created for a controller is the single public component API for its schema and Provider scope.

## Controlled state and slots

Pass a ref for controlled ownership or a `default*` value for uncontrolled ownership. A controlled callback proposes a value; synchronize the ref before its source request starts.

```ts
const query = ref(createTabularQuery())
const selection = ref<DataTableRowSelection>({ kind: 'explicit-rows', rowIDs: [] })

const table = useDataTable({
  source: resolveUsers,
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
- Body slot rows preserve the leaf or group cell schema inferred from the source response. Compound `column` props accept its nested object and array paths.
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
