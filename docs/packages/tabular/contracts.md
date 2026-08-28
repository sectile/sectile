# Shared contracts and capabilities

DataTable, DataGrid, and DataTreeGrid use the same row and column schema, query, source, selection, and access contracts. A profile only changes how that shared data is navigated.

## Columns and header schema

Column IDs remain stable across sources, cells, queries, and column state. `capabilities` declares the operations a source accepts; `initialVisible` and `initialPin` seed the first column state.

```ts
import { defineDataTableColumns } from '@sectile/vue/tabular'

const columns = defineDataTableColumns([
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter'], initialPin: 'start' },
  { id: 'team', label: 'Team', capabilities: ['sort', 'filter', 'group'] },
  { id: 'salary', label: 'Salary', capabilities: ['sort', 'aggregate', 'edit'], initialVisible: false },
])

const headers = [
  {
    kind: 'group', id: 'employment', label: 'Employment', children: [
      { kind: 'column', id: 'team-header', columnID: 'team', label: 'Team' },
      { kind: 'column', id: 'salary-header', columnID: 'salary', label: 'Salary' },
    ],
  },
] as const
```

The schema derives nested-header depth, spans, and ARIA metadata. `HeaderRow` never needs a manual depth prop.

In Vue, bind a leaf with `ColumnHeader column="team"` and only a group with `ColumnHeader header="employment"`. The DOM forms are `{ columnID: 'team' }` and `{ headerNodeID: 'employment' }`. Leaf consumers do not repeat schema-node IDs.

## Query

A query is the canonical list of sort, filter, group, aggregate, and pivot descriptors. UI parts update it and request a new view. The client source or remote server owns the meaning of each policy key.

```ts
import { createTabularQuery } from '@sectile/tabular/query'

const query = createTabularQuery({
  sort: [
    { id: 'team-sort', columnID: 'team', direction: 'ascending', comparator: 'locale' },
    { id: 'name-sort', columnID: 'name', direction: 'ascending', comparator: 'locale' },
  ],
  filters: [
    { id: 'active-users', scope: 'column', columnID: 'status', predicate: 'equals', value: 'active' },
  ],
  groups: [{ id: 'team-group', columnID: 'team', policy: 'exact' }],
  aggregates: [{ id: 'salary-total', columnID: 'salary', policy: 'sum' }],
  pivots: [{ id: 'region-pivot', columnID: 'region', valuePolicy: 'distinct', aggregateIDs: ['salary-total'] }],
})
```

Vue exposes common query controls through `SortTrigger` and `FilterControl`. Application-specific group, aggregate, or pivot builders replace the complete query through a controlled ref or `dispatch({ type: 'set-query' })`.

## Client source

Use `createClientTabularSource` for in-memory records. Policies run outside reducers and compute stable sorting, filtering, grouping, aggregation, pivoting, and page/window slicing through the same request contract.

```ts
import { createClientTabularSource } from '@sectile/tabular/source'

const source = createClientTabularSource({
  records: users,
  columnSchema: { revision: 0, columns, headers: [] },
  getRowID: (user) => user.id,
  getValue: (user, columnID) => user[columnID],
  policies: {
    comparators: {
      locale: (left, right, descriptor, getValue) =>
        String(getValue(left, descriptor.columnID)).localeCompare(String(getValue(right, descriptor.columnID))),
    },
    predicates: {
      contains: (user, descriptor, getValue) =>
        Object.keys(user).some((columnID) =>
          String(getValue(user, columnID)).toLocaleLowerCase().includes(String(descriptor.value).toLocaleLowerCase()),
        ),
    },
  },
})

const response = source.resolve(request)
```

Remote data uses the same request in an [async source](./data-source).

## Page and window access

Page access is suited to server pagination with a known total. A query change returns to page one.

```ts
const table = useDataTable({
  columns,
  defaultAccessState: {
    kind: 'page', page: 1, itemsPerPage: 25,
    visibleRowCount: null, pagination: null,
  },
})

table.dispatch({
  type: 'set-access',
  accessState: { kind: 'page', page: 3, itemsPerPage: 25, visibleRowCount: 240, pagination: { page: 3, itemsPerPage: 25 } },
})
```

Window access requests `{ start, count }` without dividing the result into pages. Use it for infinite scrolling or virtual windows.

## Selection

Explicit selection owns loaded row IDs. All-matching selection is bound to the current source and query revisions and stores exclusions instead of enumerating unloaded IDs.

```ts
table.dispatch({ type: 'toggle-row-selection', rowID: 'user-42' })
table.dispatch({ type: 'select-all-matching' })
table.dispatch({
  type: 'set-row-selection',
  selection: { kind: 'explicit-rows', rowIDs: ['user-7', 'user-42'] },
})
```

DataTable projects native form controls. Grid profiles keep row selection independent from the cell cursor. DataTreeGrid can also emit a group-leaf selection intent without guessing descendant IDs.

## Column order, visibility, pinning, and size

Semantic `columnState` owns order, hidden columns, and logical start/end pinning. Pixel sizes remain host state.

```ts
table.dispatch({
  type: 'set-column-state',
  columnState: {
    order: ['name', 'team', 'salary'],
    hidden: ['salary'],
    pinnedStart: ['name'],
    pinnedEnd: [],
  },
})
```

Vue accepts `columnSizeState` or `defaultColumnSizeState`; `ColumnResizeHandle` changes that host state.

## Controlled and uncontrolled state

`query`, `rowSelection`, `columnState`, `accessState`, and `expansion` can each be controlled independently. A controlled prop and its `default*` counterpart are mutually exclusive.

```ts
const query = ref(createTabularQuery())

const table = useDataTable({
  columns,
  query,
  onQueryChange(next) {
    query.value = next
  },
  defaultRowSelection: { kind: 'explicit-rows', rowIDs: [] },
})
```

A controlled change is proposed first; the source request starts after the external value is synchronized.

## Revisions and atomic synchronization

Every request carries a request ID, source generation, query revision, expansion revision, and access range. A response that does not echo them exactly, or whose view revision is not newer, is rejected as a whole. Identity collisions, malformed hierarchy, profile mismatch, and configured ceiling violations are also failure-atomic.

Use `limits` to bound rows, columns, projected cells, descriptors, group depth, selection IDs, and query values. Failures return structured `class`, `code`, `message`, and `details` through `TabularResult`.

## Choose a profile

- [DataTable](./data-table): native table and form semantics for row-oriented reading
- [DataGrid](./data-grid): flat 2D cursor, roving focus, and editing lifecycle
- [DataTreeGrid](./data-tree-grid): hierarchy, expansion, treegrid metadata, and leaf editing
- [Vue composition](./vue): typed compound components and presentation state
- [DOM composition](./dom): direct element registration and bindings
- [Optional virtualization](./virtual): raw Virtual composition on top of page/window sources
