<script setup>
import TabularFeatureMap from '../.vitepress/theme/components/TabularFeatureMap.vue'
import TabularExample from '../.vitepress/theme/components/TabularExample.vue'
</script>

# Tabular

`@sectile/tabular` is renderer-neutral core for query, selection, cursor, editing, and hierarchy state. Choose DataTable, DataGrid, or DataTreeGrid according to the interaction density of the surface.

```sh
pnpm add @sectile/tabular
```

## Choose a profile first

| Question | Choose |
| --- | --- |
| Do users read, compare, sort, filter, and select rows? | [DataTable](./tabular/data-table) |
| Must every cell support arrow navigation and editing? | [DataGrid](./tabular/data-grid) |
| Does the grid also need parent and child branches? | [DataTreeGrid](./tabular/data-tree-grid) |

<TabularFeatureMap />

### DataTable

Native table semantics, query controls, checkbox selection, and form integration.

<TabularExample kind="table-overview" />

[Explore every DataTable feature →](./tabular/data-table)

### DataGrid

Two-dimensional cursor, roving focus, edit/commit/cancel, and cursor recovery.

<TabularExample kind="grid-overview" />

[Explore every DataGrid feature →](./tabular/data-grid)

### DataTreeGrid

DataGrid plus expansion, hierarchy metadata, and retained parent context.

<TabularExample kind="tree-overview" />

[Explore every DataTreeGrid feature →](./tabular/data-tree-grid)

## Choose a layer

| Needed scope | Install | Import |
| --- | --- | --- |
| State, query, and projection | `@sectile/tabular` | `@sectile/tabular/data-*` |
| Existing HTML elements | `@sectile/dom @sectile/tabular` | `@sectile/dom/tabular` |
| Vue compound components | `@sectile/vue @sectile/tabular vue` | `@sectile/vue/data-table`, `@sectile/vue/data-grid`, `@sectile/vue/data-tree-grid` |

`@sectile/tabular` knows nothing about DOM, Vue, or terminals. It is an optional peer of `@sectile/dom` and `@sectile/vue`, so install it only when using their Tabular subpaths. Tabular has no terminal host.

Every example's **Code** tab presents the same feature in Vue, DOM, and Core. Verify the interaction first, then choose the implementation for your environment.

## Continue by task

| Task | Guide |
| --- | --- |
| Understand IDs, query, selection, and revisions | [Shared contracts](./tabular/contracts) |
| Server sorting, filtering, paging, loading, and retry | [Async sources](./tabular/data-source) |
| Connect existing elements and events | [DOM composition](./tabular/dom) |
| Typed components, Provider, slots, and SSR | [Vue composition](./tabular/vue) |
| Window only genuinely large views | [Virtualization](./tabular/virtual) |

## Responsibility boundary

Tabular produces deterministic next state, projections, and commands from events. The application owns network, cache, persistence, and loading/empty/error presentation. DOM or Vue hosts own elements, focus, forms, measurement, and scroll. [Shared contracts](./tabular/contracts) and [async sources](./tabular/data-source) demonstrate these boundaries.

## Public subpaths

| Path | Responsibility |
| --- | --- |
| `/model` | IDs, immutable model, controlled ownership, limits |
| `/query` | Filter, sort, group, aggregate, and pivot descriptors |
| `/source` | Request/response, page/window, client source |
| `/data-table` | Read-oriented table controller |
| `/data-grid` | Cell-oriented grid controller |
| `/data-tree-grid` | Hierarchical grid controller |
| `/virtual` | Optional adapter for consumer-installed `@sectile/virtual` |
