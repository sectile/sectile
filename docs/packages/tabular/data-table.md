<script setup>
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# DataTable

DataTable is a table for reading and comparing rows. Use it for directories, search results, and audit logs where **native table semantics and row selection** matter. Choose [DataGrid](./data-grid) when every cell must support keyboard navigation and editing.

<TabularExample kind="table-overview" />

The **Code** tab switches the same UI between Vue compound components, DOM bindings for existing HTML, and renderer-free Core APIs.

## Search and sort

Repeatedly activate a heading to cycle ascending, descending, and off. Search and sort update one query and request a new view instead of mutating mounted DOM rows. The same UI therefore works with both in-memory and server-backed data.

<TabularExample kind="table-query" />

- `SortTrigger` records a column and comparator in the query.
- `FilterControl` records a global or column filter.
- A client source evaluates that query locally; a remote source serializes it for HTTP or RPC.

See [async data sources](./data-source) for a complete request, cancellation, failure, and retry flow.

## Select rows and all matching results

Individual checkboxes, Shift ranges, and selecting every row matched by the current query share one selection contract. The header checkbox exposes false, mixed, and true for none, some, and all matching rows.

<TabularExample kind="table-selection" />

`SelectionControl` inherits the current Body row. `BulkSelectionControl` with `all-matching` stores the query revision and exclusions rather than every unloaded ID. Set `name` for native form submission and override `value` only when it differs from the row ID.

## Multi-level headers and edit intent

Do not specify a header-row depth. Bind leaf headers with `column`, and only bind a spanning group with `header`. Tabular derives depth, colspan, rowspan, and accessibility metadata from the schema.

<TabularExample kind="table-structure" />

`Editor` does not persist data. It converts a native input commit into a typed command; the application owns validation, storage, and optimistic updates. Use DataGrid when a cell cursor and edit mode are central.

## Column visibility, pinning, and size

Order, visibility, and start/end pinning are portable semantic state. Pixel width belongs to the DOM or Vue host. This keeps Core platform-independent while each rendered surface can use real measurements.

<TabularExample kind="table-columns" />

`ColumnResizeHandle` supports pointer and keyboard input and respects min/max limits. Column visibility and pinning update controller `columnState`, so they can be persisted or controlled by the application.

## Connect data and render request states

`useDataTableSource` executes requests and exposes `status`, `error`, `reload`, and `cancel`. Tabular does not prescribe the spinner, empty state, error copy, or retry control. It keeps the last accepted view while exposing the new request separately.

| Situation | Read this state |
| --- | --- |
| Initial request | `status === 'loading'` with no accepted view |
| Sorting request | Existing `rows` remain while a request is pending |
| Empty result | Accepted view has `rows.length === 0` |
| Failure and retry | `error`, `reload()` |

See [async data sources](./data-source) for the complete flow.

## Preserve row types in Vue

`createDataTableComponents(table)` creates a component namespace bound to the controller schema. A Body slot therefore preserves the `useDataTable<UserCells>` type for `row.cells`, and Cell inherits the row ID from Body.

```vue
<DataTable.Body v-slot="{ row }">
  <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
  <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
</DataTable.Body>
```

Body owns normal row iteration. Use `<DataTable.Body manual>` and explicit `DataTable.Row` only for low-level rendering such as a virtual window.

## Find a public part

| Goal | Vue part | DOM/Core equivalent |
| --- | --- | --- |
| Table and name | `Root`, `Caption` | native table / controller projection |
| Headers | `Header`, `HeaderRow`, `ColumnHeader` | header attributes / schema |
| Query | `SortTrigger`, `FilterControl` | bind functions / `set-query` event |
| Rows | `Body`, `Row`, `Cell` | element registration / projection rows |
| Selection | `SelectionControl`, `BulkSelectionControl` | checkbox binding / selection event |
| Groups | `Disclosure` | disclosure binding / expansion event |
| Editing | `Editor` | editor binding / commit command |
| Column size | `ColumnResizeHandle` | resize binding / host size state |

See [Vue composition](./vue), [DOM composition](./dom), and [shared contracts](./contracts) for installation paths and full state shapes.
