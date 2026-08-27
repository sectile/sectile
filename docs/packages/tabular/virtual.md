# Optional Tabular virtualization

Tabular does not virtualize by default and Vue contains no Tabular-specific
Virtual component. Install Virtual only when the application chooses to window
rows or cells.

```sh
pnpm add @sectile/vue @sectile/virtual vue
```

Use `@sectile/vue/virtual` directly for viewport/content/item lifecycle. Use the
narrow `@sectile/tabular/virtual` adapter when a DataTable, DataGrid, or
DataTreeGrid projection must be converted to stable linear or partitioned-track
Virtual inputs.

```ts
import { createDataGridVirtualAdapter } from '@sectile/tabular/virtual'
import {
  VirtualizerContent,
  VirtualizerItem,
  VirtualizerRoot,
  useVirtualizer,
} from '@sectile/vue/virtual'

const adapter = createDataGridVirtualAdapter({ controller: grid.controller })
const virtualizer = useVirtualizer({ strategy: adapter.strategy })
```

The application composes the rendered window. The adapter preserves Tabular
row, column and cell identity, measured extents, pinned partitions, projection
generations, locators, and reveal targets. Virtual continues to measure mounted
elements internally; applications do not pass a `measure` policy or hard-code
item heights unless they intentionally configure an estimated layout.

Native DataTable keeps native table width semantics and normally virtualizes the
row axis only. DataGrid and DataTreeGrid may use linear rows or a two-axis
partitioned track grid. Pinned start/end columns form overlap layers without
replacing the strategy when partitions change.

Importing base `@sectile/tabular`, `@sectile/dom/data-*`, or
`@sectile/vue/data-*` never loads Virtual. Importing `@sectile/tabular/virtual`,
`@sectile/dom/virtual`, or `@sectile/vue/virtual` without installing
`@sectile/virtual` fails with the missing optional peer, making opt-in explicit.
