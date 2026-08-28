<script setup>
import TabularFeatureMap from '../.vitepress/theme/components/TabularFeatureMap.vue'
import TabularDataTableDemo from '../.vitepress/theme/components/TabularDataTableDemo.vue'
import TabularDataGridDemo from '../.vitepress/theme/components/TabularDataGridDemo.vue'
import TabularDataTreeGridDemo from '../.vitepress/theme/components/TabularDataTreeGridDemo.vue'
</script>

# Tabular

`@sectile/tabular` is the renderer-neutral contract for data-heavy tables and grids. It keeps identity, query and source revisions, selection, grouping, aggregation, pivot projection, cursor state, and edit intent deterministic while the host decides how those results look.

```sh
pnpm add @sectile/tabular
```

## Choose a layer

| Needed surface | Install | API |
| --- | --- | --- |
| State, query, and projection only | `@sectile/tabular` | `createDataTable`, `createDataGrid`, `createDataTreeGrid` |
| Bind existing HTML without a framework | `@sectile/dom` | `createData*` or `connectData*`, element registration, and `bind*` |
| Compose Vue components | `@sectile/vue @sectile/tabular vue` | `useData*`, `createData*Components`, and `useData*Source` from `@sectile/vue/tabular` |

`@sectile/tabular` is the renderer-neutral Tabular core. DOM and Vue are optional hosts over the same controllers; core consumers do not install Vue.

<TabularFeatureMap />

## Find the capability

| Task | Guide |
| --- | --- |
| Column schema, query, page/window access, selection, column state, controlled state | [Shared contracts](./tabular/contracts) |
| Server sorting, filtering, pagination, cancellation, stale data, errors, and retry | [Async data sources](./tabular/data-source) |
| Element registration and event/focus/form bindings without a framework | [DOM composition](./tabular/dom) |
| Typed compound components, Providers, slots, and SSR | [Vue composition](./tabular/vue) |
| Compose a large view with raw Virtual | [Optional virtualization](./tabular/virtual) |

## DataTable

Choose DataTable when people primarily scan, compare, sort, filter, and select rows. It preserves native table and form semantics and can express grouped disclosure or edit commit intent without turning the surface into a spreadsheet.

<TabularDataTableDemo />

[Build a DataTable →](./tabular/data-table)

## DataGrid

Choose DataGrid when every cell is an interactive destination. It adds a two-dimensional cursor, roving focus, row and cell selection, navigation/edit modes, commit and cancel, and deterministic recovery when data disappears.

<TabularDataGridDemo />

[Build a DataGrid →](./tabular/data-grid)

## DataTreeGrid

Choose DataTreeGrid when grid navigation must coexist with parent-child rows. It adds expansion, level and position metadata, context-only ancestors, group-leaf selection, and cursor or editor recovery after collapse and removal.

<TabularDataTreeGridDemo />

[Build a DataTreeGrid →](./tabular/data-tree-grid)

## What the package owns

The three profiles share the same bounded contracts:

- stable row, column, cell, group, and header identities;
- canonical sort, filter, group, aggregate, and pivot descriptors;
- request, source, query, expansion, access, and view revisions;
- explicit-row and all-matching selection without enumerating unloaded rows;
- controlled or uncontrolled query, selection, columns, access, and expansion;
- atomic rejection for stale responses, collisions, profile mismatches, and limit violations.

Every change enters as a typed event and returns a deterministic state, projection, command list, or structured failure. Policy functions and transport stay outside reducers.

The same query descriptors can operate on an in-memory array or cross the network to request a new server page or window. Moving from a client source to a remote source does not change component structure, selection, or cursor contracts.

## What the application owns

Loading, empty, error, retry, caching, suspense, optimistic updates, and transport are presentation and application policy. `useData*Source` can expose source status, cancellation, reload, and errors, but Tabular never prescribes a spinner or error screen.

DOM measurement, scrolling, and rendering also remain host responsibilities. Virtualization is a separate opt-in composition with consumer-installed `@sectile/virtual`; a normal table or grid does not pay for it.

## Public subpaths

| Subpath | Responsibility |
| --- | --- |
| `@sectile/tabular` | Shared type contracts and errors; no runtime exports |
| `/model` | IDs, codecs, immutable model, controlled ownership, and limits |
| `/query` | Filter, sort, group, aggregate, and pivot descriptors |
| `/source` | Request/response envelopes, page/window access, deletion deltas, and client source |
| `/data-table` | Read-oriented table controller and reducer |
| `/data-grid` | Flat application-grid controller and reducer |
| `/data-tree-grid` | Hierarchical application-grid controller and reducer |
| `/virtual` | Optional adapters from Tabular projections to Virtual strategies |

Use `@sectile/dom/data-*` for direct DOM connection. Vue applications install `@sectile/tabular` alongside `@sectile/vue`, then import composables, Providers, compound parts, and injected contexts from `@sectile/vue/tabular`. `@sectile/tabular` remains optional for `@sectile/vue` consumers that do not use Tabular. See [Vue composition](./tabular/vue) and [optional virtualization](./tabular/virtual).
