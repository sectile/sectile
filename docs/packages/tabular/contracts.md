<script setup>
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# Shared contracts

DataTable, DataGrid, and DataTreeGrid have different interaction density, but share data identity, query, selection, column state, and response acceptance. These contracts let an application change profile or renderer without redesigning data ownership.

<TabularExample kind="contracts" />

Use the controls to request a view, select a row, and submit a stale response. Core receives events and determines state plus host commands; it does not touch DOM or network APIs.

## IDs represent data identity

Rows, columns, cells, groups, and headers need stable IDs. The same record keeps its ID through sorting and paging so selection and cursors can survive. Duplicate IDs make a target ambiguous, so the whole view is rejected.

## A query describes the required result

A query contains sort, filter, group, aggregate, and pivot descriptors. Descriptors use serializable keys and values rather than functions, allowing local and server sources to interpret the same request.

- A client source applies comparators and predicates to an in-memory collection.
- A remote source serializes descriptors for HTTP or RPC.
- The controller does not distinguish them; it waits for a matching view.

See [async data sources](./data-source) for the server lifecycle.

## Selection has two forms

`explicit` selection stores known row IDs. `all-matching` represents every row matched by the current query and stores its query revision plus exclusions instead of every unloaded ID. Group-leaf selection similarly preserves source-resolvable intent.

A checkbox Shift range follows current visible leaf order. Unlike all-matching selection, it never guesses IDs that are not visible.

## Page and window are access modes

Page access represents numbered navigation and totals; window access represents an offset and requested range. Both belong to a source request, not rendering. Virtual may lay out a window result but does not own access state.

## Separate column state from host state

Column order, visibility, and pinning are platform-independent `columnState`. Pixel width, DOM measurement, and scroll position are host state. Core can calculate and persist the former; DOM or Vue applies the latter to real elements.

## Controlled and uncontrolled ownership

Query, selection, column, access, and expansion can use internal defaults or application-controlled values. A controlled owner accepts a change callback and passes the chosen value back; the controller never silently overwrites it.

## Revisions stop late responses

Every request and view carries source, query, access, and expansion revisions. A response that does not match the current pending request is rejected atomically. Rapid filtering or paging therefore cannot be undone by an older response arriving late.

Structured failures distinguish the cause.

| Failure | Meaning |
| --- | --- |
| stale response | A newer request already exists |
| duplicate ID | One view contains the same identity twice |
| profile mismatch | A grid view answered a table request |
| schema/revision mismatch | Response columns or state basis differ from the request |
| limit violation | Agreed row, column, or depth limits were exceeded |

## Choose a profile

| Required interaction | Choose |
| --- | --- |
| Native table, row reading, sorting, and selection | [DataTable](./data-table) |
| Two-dimensional cursor and cell editing | [DataGrid](./data-grid) |
| Grid navigation with parent and child rows | [DataTreeGrid](./data-tree-grid) |

Loading, empty, and error presentation, transport, cache, optimistic updates, DOM measurement, and virtualization belong to the application or host. Tabular supplies the state and deterministic commands required to build them.
