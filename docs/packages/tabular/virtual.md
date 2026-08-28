# Optional Tabular virtualization

Tabular does not virtualize by default and Vue contains no Tabular-specific
Virtual component. Install Virtual only when the application chooses to window
rows or cells.

```sh
pnpm add @sectile/vue @sectile/tabular @sectile/virtual vue
```

Use `@sectile/vue/virtual/core` directly for viewport/content/item lifecycle. Use the
narrow `@sectile/tabular/virtual` adapter when a DataTable, DataGrid, or
DataTreeGrid projection must be converted to stable linear or partitioned-track
Virtual inputs.

```ts
import { createDataGridVirtualAdapter } from '@sectile/tabular/virtual'
import { useVirtualizer } from '@sectile/vue/virtual/core'
import { shallowRef } from 'vue'

let adapter = createDataGridVirtualAdapter({
  projection: grid.getProjection(),
  rowExtents: { kind: 'uniform', extent: 44 },
  columnExtents: {
    kind: 'by-id',
    getExtent: (columnID) => columnWidths[columnID] ?? 160,
  },
})

const virtualState = shallowRef(adapter.state)
const virtualizer = useVirtualizer({
  state: virtualState,
  strategy: adapter.strategy,
})
```

The adapter preserves row, column and cell identity, the initial extent domain,
pinned partitions, projection generations, locators, and projection mutations.
Use `uniform` for a known fixed estimate and `by-id` for column sizes or row
estimates the application already owns. Virtual measures and corrects mounted
elements through its own lifecycle.

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

DataTable uses a vertical linear-row adapter and keeps native table width
semantics. DataGrid and DataTreeGrid use a partitioned-track grid that preserves
start, center, and end pinning. Reconcile projection changes with the matching
`reconcileData*VirtualAdapter` function.

Importing base `@sectile/tabular`, `@sectile/dom/tabular`, or
The Vue profile entry points never load Virtual. Importing `@sectile/tabular/virtual`,
`@sectile/dom/virtual`, or `@sectile/vue/virtual/core` without installing
`@sectile/virtual` fails with the missing optional peer, making opt-in explicit.
