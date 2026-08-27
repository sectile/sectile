# Tabular

`@sectile/tabular` is the renderer-neutral data interaction layer. It owns
identity, query and source revisions, column state, selection, grouping,
aggregation, pivot projection, cursor state, and edit intent. It does not own
DOM measurement, rendering, network transport, loading UI, or error UI.

```sh
pnpm add @sectile/tabular
```

Import runtime APIs from focused subpaths. The package root is type-only.

```ts
import { createDataGrid } from '@sectile/tabular/data-grid'
import { createClientDataSource } from '@sectile/tabular/source'
```

## Profiles

### DataTable

DataTable projects read-oriented tabular semantics through a native table or an
equivalent semantic structure. It provides stable rows and columns, sorting,
filtering, grouping, row selection, disclosure, column sizing intent, and native
form coordination. It emits edit commit intent but does not own spreadsheet-like
cell navigation.

Public runtime: `applyDataTableEvent`, `createDataTable`,
`tryCreateDataTable`. Public contracts: `DataTableCommand`,
`DataTableController`, `DataTableEvent`, `DataTableOptions`,
`DataTableProjection`, `DataTableState`, and `DataTableUpdate`.

### DataGrid

DataGrid is the application-grid profile. It adds a two-dimensional cursor,
roving focus, cell selection, explicit navigation/edit modes, validation-aware
commit/cancel, and recovery when a row or column disappears. Hierarchical rows
are rejected instead of silently changing the profile.

Public runtime: `applyDataGridEvent`, `createDataGrid`, `tryCreateDataGrid`.
Public contracts add `DataGridCursorState` and `DataGridEditState` to the shared
command/controller/event/options/projection/state/update shape.

### DataTreeGrid

DataTreeGrid combines grid navigation and editing with ordered parent/child rows,
expansion, level/position metadata, context-only ancestors, and deterministic
cursor/edit recovery across collapse or removal.

Public runtime: `applyDataTreeGridEvent`, `createDataTreeGrid`,
`tryCreateDataTreeGrid`. Public contracts add `DataTreeGridCursorState`,
`DataTreeGridEditState`, `DataTreeGridExpansionState`, and `DataTreeGridRow` to
the shared profile shape.

## Model and query API

| Subpath | Public responsibility |
| --- | --- |
| `@sectile/tabular` | Shared type contracts and errors; no runtime exports |
| `/model` | Row, column, cell and group IDs; codecs; immutable model, controlled ownership and limits |
| `/query` | Bounded filter, sort, group, aggregate and pivot descriptors plus canonical query revisions |
| `/source` | Request/response envelopes, page/window access, source generations, deletion deltas and synchronous client source |
| `/data-table` | Read-oriented profile controller and reducer |
| `/data-grid` | Flat interactive grid controller and reducer |
| `/data-tree-grid` | Hierarchical interactive grid controller and reducer |
| `/virtual` | Optional adapter from Tabular projections to consumer-installed Virtual strategies |

Every mutation is expressed as a typed event and produces a deterministic state,
projection, update, or failure. Query values are bounded JSON values; policy
functions execute outside reducers. Remote responses must match protocol,
request, source, query, access, and view revisions before they can be accepted.

## State ownership

The controller owns semantic state only when the corresponding option is
uncontrolled. Controlled fields emit exact proposed values and remain unchanged
until the application supplies an accepted state. Selection is independent of
visibility; all-matching selection is bound to source generation and query
revision and stores exclusions rather than enumerating unloaded rows.

Loading, empty, and error presentation remain application policy. A source
executor may report those states, but Tabular does not prescribe spinners,
placeholders, retry UI, suspense, caching, or transport.

## Host integrations

- `@sectile/dom/data-table`, `/data-grid`, and `/data-tree-grid` expose
  `create*`, `tryCreate*`, and `connect*` APIs, pure attribute projections,
  typed registrations, reveal hooks, editor coordination, and teardown.
- `@sectile/vue/data-table`, `/data-grid`, and `/data-tree-grid` expose
  controller composables, source composables, Providers, typed column helpers,
  compound parts, and public injected contexts. See [Vue composition](./tabular/vue).
- Virtualization is opt-in. See [optional virtualization](./tabular/virtual).

## Limits and failures

`TabularLimits` bounds rows, columns, query descriptors and values, selection
exclusions, groups, pivots, partitions, projected cells, and related resources.
Construction and transitions reject malformed IDs, collisions, stale revisions,
profile mismatches, over-limit inputs, unknown responses, and invalid controlled
proposals atomically.
