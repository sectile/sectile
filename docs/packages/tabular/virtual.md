# Optional Tabular virtualization

Tabular does not virtualize by default, and Vue does not add a Tabular-specific Virtual component. Install Virtual only when the application chooses to window rows or cells. Tabular adapters own projection-to-layout mapping; the Vue and DOM Virtual hosts own frame regions, mounted elements, measurement, and physical scrolling.

```sh
pnpm add @sectile/vue @sectile/tabular @sectile/virtual vue
```

Use the narrow `@sectile/tabular/virtual` entry point to convert a DataTable, DataGrid, or DataTreeGrid projection into a Virtual state and strategy. Then pass that state and strategy to `@sectile/vue/virtual/core` or `@sectile/dom/virtual`.

```ts
import {
  createDataGridVirtualAdapter,
  createDataTableVirtualAdapter,
  reconcileDataGridVirtualAdapter,
} from '@sectile/tabular/virtual'

let adapter = createDataGridVirtualAdapter({
  projection: grid.getProjection(),
  rowExtents: {
    kind: 'uniform',
    extent: { kind: 'estimated', value: 44 },
  },
  columnExtents: {
    kind: 'by-id',
    getExtent: (columnID) => ({
      kind: 'exact',
      value: columnWidths[columnID] ?? 160,
    }),
  },
})
```

The adapter preserves row, column, and cell identity, extent domains, pinned partitions, projection generations, locators, and projection mutations. `uniform` is appropriate when a whole track domain starts from one extent; `by-id` lets the application supply per-row or per-column extents. Mounted measurement can then refine those extents through the Virtual host.

```ts
const next = reconcileDataGridVirtualAdapter(
  adapter,
  virtualState.value,
  grid.getProjection(),
)

if (next.ok) {
  for (const mutation of next.value.mutations) virtualizer.mutate(mutation)
  adapter = next.value.adapter
}

adapter.locateRow('user-42')
adapter.locateColumn('name')
adapter.locateCell({ rowID: 'user-42', columnID: 'name' })
```

DataTable uses a vertical Linear row adapter. Its creation requires the effective surface-local row width as `crossExtent`, so the row placement width and `contentSize.width` match the Virtual surface instead of using a placeholder width.

```ts
const tableAdapter = createDataTableVirtualAdapter({
  projection: table.getProjection(),
  rowExtents: {
    kind: 'uniform',
    extent: { kind: 'estimated', value: 40 },
  },
  crossExtent: surfaceWidth,
})
```

DataGrid and DataTreeGrid use a partitioned-track layout that keeps pinned start, center, and end tracks inside the Virtual item domain. Outer `VirtualizerHeader` and `VirtualizerFooter` regions belong to the host frame instead; do not encode them as pinned tracks or synthetic cells. This separation prevents frame offsets and pinned-track suppression from being applied twice.

Importing base `@sectile/tabular`, `@sectile/dom/tabular`, or the Vue Tabular entry points does not load Virtual. Importing `@sectile/tabular/virtual`, `@sectile/dom/virtual`, or `@sectile/vue/virtual/core` requires the optional `@sectile/virtual` peer, so virtualization remains an explicit opt-in.
