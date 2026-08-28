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

## Use Tabular core only

`@sectile/tabular/data-table` knows nothing about elements or frameworks. Attach a source executor, dispatch events, and send its projection to any renderer.

```ts
import { createDataTable } from '@sectile/tabular/data-table'
import { createClientTabularSource, resolveClientTabularRequest } from '@sectile/tabular/source'

const columns = [
  { id: 'name', capabilities: ['sort', 'filter'] },
  { id: 'role', capabilities: ['sort', 'filter'] },
] as const
const source = createClientTabularSource({
  records: [
    { id: 'ada', name: 'Ada Lovelace', role: 'Platform' },
    { id: 'grace', name: 'Grace Hopper', role: 'Compiler' },
  ],
  columnSchema: { revision: 0, columns, headers: [] },
  getRowID: (record) => record.id,
  getValue: (record, columnID) => columnID === 'name' ? record.name : record.role,
})
const table = createDataTable({ columns })
const attached = table.attachRequestExecutor(({ request }) => {
  const response = resolveClientTabularRequest(source, request)
  if (response.ok) table.synchronizeView(response.value)
})
if (!attached.ok) throw new Error(attached.error.message)

table.dispatch({ type: 'toggle-row-selection', rowID: 'ada' })
renderRows(table.getProjection().rows)
```

## Connect existing DOM

`@sectile/dom/tabular` binds the same controller contract to native table elements, form controls, and events while preserving application styling.

```ts
import { createDataTable } from '@sectile/dom/tabular'

const connection = createDataTable({
  columns,
  table: document.querySelector<HTMLTableElement>('#users')!,
  onCommand: handleTableCommand,
  onSnapshotChange: renderTable,
})
const nameHeader = document.querySelector<HTMLTableCellElement>('#name-header')!
const nameSort = nameHeader.querySelector<HTMLButtonElement>('button')!
connection.setHeaderCellAttributes(nameHeader, { columnID: 'name' })
const releaseSort = connection.bindSortTrigger(nameSort, { columnID: 'name', comparator: 'locale' })
```

## Vue composition

`createDataTableComponents` creates the typed compound component namespace for a controller. Its Provider carries that controller through injection without a prop. A source resolves the request envelope into a revision-matched view. Body iterates the accepted rows and provides each schema-typed `row` to its slot; nested cells and controls inherit that row identity.

```vue
<script setup lang="ts">
import {
  defineDataTableColumns, useDataTable,
  createDataTableComponents, useDataTableSource,
} from '@sectile/vue/tabular'

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
        <DataTable.ColumnHeader column="name">Name</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="role">Role</DataTable.ColumnHeader>
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

These controls do not reorder mounted DOM rows. They update the query and request a fresh view. A client source computes an in-memory result; a remote source serializes `request.query.sort` and `request.query.filters`. See [async data sources](./data-source) for cancellation, page reset, and stale-response handling.

Bind a filter to one column by including its ID.

```vue
<DataTable.FilterControl as-child scope="column" column="status" id="status-filter" predicate="equals">
  <select aria-label="Account status">
    <option value="">Every status</option>
    <option value="active">Active</option>
    <option value="suspended">Suspended</option>
  </select>
</DataTable.FilterControl>
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

Header rows do not take a depth prop. Bind leaf headers with `column`; only nested group headers use `header` to identify a schema node. The schema derives multi-level spans and ARIA metadata. Give a native DataTable its accessible name with `DataTable.Caption`, or use `aria-labelledby` when a visible title outside the table already names it.

```vue
<DataTable.HeaderRow>
  <DataTable.ColumnHeader column="name">Name</DataTable.ColumnHeader>
  <DataTable.ColumnHeader header="employment">Employment</DataTable.ColumnHeader>
</DataTable.HeaderRow>
<DataTable.HeaderRow>
  <DataTable.ColumnHeader column="team">Team</DataTable.ColumnHeader>
  <DataTable.ColumnHeader column="role">Role</DataTable.ColumnHeader>
</DataTable.HeaderRow>
```

Body owns normal row repetition. Use `<DataTable.Body manual>` with explicit `DataTable.Row rowID="…"` only for low-level rendering such as a virtualized window.

```vue
<DataTable.Body v-slot="{ row, isGroup }">
  <DataTable.Cell column="name">
    <DataTable.Disclosure v-if="isGroup" :aria-label="`Toggle ${row.cells.name}`" />
    {{ row.cells.name }}
  </DataTable.Cell>
  <DataTable.Cell column="quota">
    <DataTable.Editor v-if="row.kind === 'leaf'" as-child column="quota" :parse-value="parseQuota">
      <input :value="row.cells.quota">
    </DataTable.Editor>
  </DataTable.Cell>
</DataTable.Body>
```

A `request-value-commit` command carries the cell address and parsed wire value. Persist it, then reload the source or synchronize an optimistic view.

## Column state and access

Semantic column state owns order, visibility, and start/end pinning. Pixel size is host state.

```vue
<DataTable.ColumnHeader column="name">
  Name
  <DataTable.ColumnResizeHandle column="name" :min-size="160" :max-size="480" aria-label="Resize name column" />
</DataTable.ColumnHeader>
```

The default access mode is a 25-row page. `set-access` selects another page or window and issues a new source request. A page response returns the full visible count; window access is suited to infinite scrolling or virtualization. See [shared contracts](./contracts#page-and-window-access).

## Source and presentation states

`useDataTableSource` exposes `status`, `error`, `reload`, `cancel`, `replaceResolver`, and `dispose`. Render loading, empty, stale, error, and retry UI according to application policy. SSR does not execute a resolver, so server and client must share the same initial accepted view when hydrating.

Root and part slots expose `acceptedViewState`, `requestState`, `query`, `rowSelection`, `columnState`, `accessState`, `expansion`, and `rows`. Body adds the typed `row`, `rowIndex`, and `isGroup` values.

## Parts by responsibility

| Part | Responsibility |
| --- | --- |
| `Provider` | Inject the controller bound to this namespace |
| `Root` | Native table plus command/error boundary |
| `Caption` | Accessible name for the native table |
| `Header` · `HeaderRow` · `ColumnHeader` | Header schema and native header elements |
| `SortTrigger` · `FilterControl` | Canonical query updates and source requests |
| `Body` · `Row` · `Cell` | Automatic accepted-view iteration or manual registration |
| `SelectionControl` · `BulkSelectionControl` | Explicit, all-matching, and group-leaf selection |
| `Disclosure` | Group expansion and a new view request |
| `ColumnResizeHandle` | Host-owned column size |
| `Editor` | Parsed native input commit intent |

## Public API by layer

- Tabular core: `createDataTable`, `tryCreateDataTable`, and controller `dispatch`, view/source lifecycle, snapshots, and projections
- DOM: `createDataTable`, `connectDataTable`, header/row/cell attributes and registration, plus sort/filter/selection/disclosure/resize/editor bindings
- Vue creation: `useDataTable`, `createDataTableComponents`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`
- Vue structure: `Provider`, `Root`, `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Vue controls: `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor`

Each layer exports its query, view, source, error, command, controller, state, and option types from the same subpath. Vue adds `Props` and `SlotProps` for every part.
