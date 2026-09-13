---
title: Tabular
description: Build tables, editable grids, and hierarchical grids with shared query, selection, source, and interaction state.
---

# Tabular

`@sectile/tabular` keeps table and grid behavior independent of the renderer. Queries, accepted source views, row selection, cell navigation, edit intent, column state, and hierarchy can therefore follow the same rules in Vue, existing DOM, or application-owned rendering.

Use [`@sectile/vue`](/packages/vue) when you want compound components, or [`@sectile/dom`](/packages/dom) when the application already owns the HTML. Install Tabular directly when server logic, tests, workers, or a custom renderer need the controller and projection state without a UI dependency.

## Install

Install the packages for the integration you use:

```sh
# Renderer-neutral controllers
pnpm add @sectile/tabular

# Existing browser markup
pnpm add @sectile/dom @sectile/tabular

# Vue components
pnpm add @sectile/vue @sectile/tabular vue
```

The runtime APIs in `@sectile/tabular` use focused subpaths such as `@sectile/tabular/data-table`. See the [Tabular API reference](/api/tabular) for the supported package entry points. Tabular does not currently have a Terminal integration.

## Choose the surface by how users interact with it

The three profiles share source, query, selection, column, and revision concepts. The difference is how much interaction the rendered surface needs.

| Surface | Use it when | Guide |
| --- | --- | --- |
| DataTable | Rows are primarily read, compared, sorted, filtered, or selected | [DataTable](./tabular/data-table) |
| DataGrid | Every cell participates in two-dimensional keyboard navigation or editing | [DataGrid](./tabular/data-grid) |
| DataTreeGrid | A grid also needs expandable parent/child hierarchy | [DataTreeGrid](./tabular/data-tree-grid) |

## Build a searchable, selectable table

A DataTable keeps native table-oriented interaction while the query and selection state remain portable. Sorting, filtering, checkbox selection, grouped rows, and edit intent all update the controller rather than requiring application code to coordinate those states separately.

The **Usage code** follows the Integration selected in the page header. The preview uses documentation data and presentation styles; the code view focuses on the public Vue composition, DOM connection, or renderer-neutral controller flow.

The [DataTable guide](./tabular/data-table) continues with search and sort, all-matching selection, grouped rows, editing intent, column state, and native form integration.

## Give every cell keyboard navigation and editing

Use DataGrid when the current cell matters independently of row selection. Arrow-key movement, edit/commit/cancel, row selection, and cursor recovery remain distinct states, so changing data does not require the application to reconstruct keyboard position by hand.

The [DataGrid guide](./tabular/data-grid) covers navigation recovery, editable cells, independent row selection, and column behavior in detail.

## Add hierarchy without losing grid behavior

DataTreeGrid adds expandable branches while retaining cell navigation and editing. Parent rows can provide hierarchy context while leaf cells remain the normal navigation and selection targets.

The [DataTreeGrid guide](./tabular/data-tree-grid) covers disclosure, visible-leaf selection, editing, and cursor recovery when branches collapse.

## Connect sorting and filtering to a server

A query change produces a new source request; it does not rearrange the currently mounted rows in place. This lets the same interaction model work with in-memory data, HTTP, RPC, pagination, or windowed server results.

While a replacement request is pending, the last accepted view can remain visible. The controller distinguishes pending work, accepted data, cancellation, and failure, and rejects stale responses instead of partially merging them into a newer view. The application still owns transport, authentication, caching, retry policy, and the presentation of loading, empty, and error states.

See [Async data sources](./tabular/data-source) for request identity, response envelopes, pagination/window access, cancellation, and retry.

## Virtualize only when the accepted view is genuinely large

Tabular does not virtualize rows or cells by default. Ordinary tables and grids can render their accepted view directly. When the visible result is large enough to need windowing, install `@sectile/virtual` and use the optional `@sectile/tabular/virtual` adapter to map a Tabular projection into Virtual layout state.

This keeps query and grid semantics separate from measurement and scrolling. See [Optional virtualization](./tabular/virtual) for DataTable, DataGrid, and DataTreeGrid adapters and their Vue/DOM integration.

## Choose the integration level

For Vue, use `@sectile/vue/data-table`, `@sectile/vue/data-grid`, or `@sectile/vue/data-tree-grid`; the corresponding controller is provided through the profile's component namespace. For existing browser markup, `@sectile/dom/tabular` binds elements and native events to the same Tabular state. Direct `@sectile/tabular/*` imports are appropriate when the application owns rendering or only needs query/source/controller behavior.

The renderer-neutral layer does not fetch data, persist edits, move DOM focus, or render loading and error UI. Those effects stay with the application or host after Tabular returns state and commands.

## Continue by task

- [DataTable](./tabular/data-table) covers read-oriented tables, query controls, row selection, forms, and edit intent.
- [DataGrid](./tabular/data-grid) covers cell navigation, editing, row selection, and recovery.
- [DataTreeGrid](./tabular/data-tree-grid) covers hierarchical grid navigation and disclosure.
- [Async data sources](./tabular/data-source) covers remote sorting/filtering, paging, cancellation, loading, failure, and retry.
- [Vue composition](./tabular/vue) covers typed compound components, providers, source execution, and SSR.
- [DOM composition](./tabular/dom) covers existing elements, event bindings, cleanup, and source execution.
- [Optional virtualization](./tabular/virtual) covers large accepted views with `@sectile/virtual`.
- The [Tabular API reference](/api/tabular) lists the supported public import paths.
