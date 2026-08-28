<script setup>
import TabularDataTreeGridDemo from '../../.vitepress/theme/components/TabularDataTreeGridDemo.vue'
</script>

# DataTreeGrid

DataTreeGrid combines a grid cursor and editor with an ordered hierarchy. Use it for service ownership, file-like inventories, grouped permissions, and planning structures where parent context must remain part of the interactive surface.

<TabularDataTreeGridDemo />

Expand and collapse both groups, move through cells with the keyboard, select leaf rows, and edit a service. Collapsing a group requests a new view and safely recovers interaction state that was inside the removed branch.

::: details Complete source for the live example
<<< ../../.vitepress/theme/components/TabularDataTreeGridDemo.vue
:::

## Use Tabular core only

The renderer-neutral controller validates hierarchy, advances expansion revisions, and recovers cursor or editor state. The application synchronizes an ordered hierarchy for each request.

```ts
import { createDataTreeGrid } from '@sectile/tabular/data-tree-grid'

const columns = [
  { id: 'service', capabilities: ['sort', 'filter', 'edit'] },
  { id: 'owner', capabilities: ['sort', 'filter'] },
] as const
const tree = createDataTreeGrid({ columns })

tree.attachRequestExecutor(({ request }) => {
  const expanded = request.expansion.includes('commerce')
  tree.synchronizeView({
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: request.requestID,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: 1 },
    visibleRowCount: { kind: 'known', value: expanded ? 2 : 1 },
    rows: [
      { kind: 'group', id: 'commerce', parentGroupID: null, depth: 0, expanded, cells: { service: 'Commerce', owner: '' } },
      ...(expanded ? [{ kind: 'leaf' as const, id: 'checkout', cells: { service: 'Checkout', owner: 'Alex' } }] : []),
    ],
    columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] },
    removedRowIDs: [],
  })
})

tree.dispatch({ type: 'set-expansion', expansion: ['commerce'] })
renderTreeGrid(tree.getProjection())
```

## Connect existing DOM

The DOM connection projects the same hierarchy into ARIA treegrid metadata, disclosures, keyboard navigation, and editor elements.

```ts
import { createDataTreeGrid } from '@sectile/dom/tabular'

const root = document.querySelector<HTMLElement>('#service-tree-grid')!
const connection = createDataTreeGrid({ columns, root, onCommand: handleTreeGridCommand })
const serviceHeader = root.querySelector<HTMLElement>('[data-header="service"]')!
const groupRow = root.querySelector<HTMLElement>('[data-row="commerce"]')!
const disclosure = groupRow.querySelector<HTMLButtonElement>('button')!

connection.setColumnHeaderAttributes(serviceHeader, { columnID: 'service' })
connection.registerRow(groupRow, { rowID: 'commerce' })
connection.bindRowDisclosure(disclosure, { rowID: 'commerce' })
```

## Hierarchical views

The source returns group rows followed by their visible descendants. Group rows carry `parentGroupID`, `depth`, and `expanded`; leaf ancestry is inferred from ordered visible context. Malformed ancestry is rejected without partially changing state.

```ts
const rows = [
  {
    kind: 'group', id: 'platform', parentGroupID: null,
    depth: 0, expanded: true,
    cells: { name: 'Platform', owner: '2 services' },
  },
  { kind: 'leaf', id: 'checkout', cells: { name: 'Checkout', owner: 'Alex' } },
  { kind: 'leaf', id: 'storefront', cells: { name: 'Storefront', owner: 'Mina' } },
]
```

## Disclosure and source coordination

Create the typed namespace once with `const DataTreeGrid = createDataTreeGridComponents(tree)`. `DataTreeGrid.RowDisclosure` updates expansion and produces a revisioned source request. The resolver returns only the currently visible branch plus any context-only ancestors needed to explain it. Body supplies the current group row, so the disclosure inherits its row ID.

```vue
<DataTreeGrid.RowDisclosure
  v-if="row.kind === 'group'"
>
  Toggle {{ row.cells.name }}
</DataTreeGrid.RowDisclosure>
```

Changing disclosure advances the expansion revision and places the current group IDs in `request.expansion`. The server returns visible descendants for the requested branches.

An external store can control expansion, cursor, and edit state independently.

```ts
const expansion = ref<readonly string[]>(['platform'])

const tree = useDataTreeGrid({
  columns,
  expansion,
  onExpansionChange: (next) => { expansion.value = next },
  defaultCursor: { current: null },
  defaultEditState: { kind: 'navigation' },
})
```

## Grid navigation and editing

Leaf cells use the same navigation and edit lifecycle as DataGrid. Group cells are read-only. Enter begins an editor, Escape cancels, and a valid commit emits an application command. Collapse or removal cancels an affected editor before recovering the cursor to a visible cell.

`DataTreeGrid.Body` renders the accepted ordered hierarchy and exposes typed `{ row, rowIndex, isGroup }`. Cells, disclosure controls, selection controls, and editors inherit the row ID. Use manual Body plus explicit Row only when custom windowing owns placement. Header row depth is derived from the header schema.

## Selection across branches

Use `DataTreeGrid.RowSelectionControl` for visible leaves. `DataTreeGrid.BulkSelectionControl` accepts either `{ kind: 'all-matching' }` or `{ kind: 'group-leaves', groupID }`. The latter emits group-leaf selection intent so the application or source can include descendants that are not loaded.

```vue
<DataTreeGrid.RowSelectionControl v-if="row.kind === 'leaf'" name="selected-services" />
<DataTreeGrid.BulkSelectionControl
  v-if="row.kind === 'group'"
  :target="{ kind: 'group-leaves', groupID: row.id }"
>
  Select every {{ row.cells.name }} service
</DataTreeGrid.BulkSelectionControl>
```

## Query and context-only ancestors

Sorting and filtering apply to leaves without discarding the parent context required by a treegrid. A source can return an ancestor with `contextOnly: true`; it preserves structure and ARIA metadata but is not a selection or editing target.

```ts
const rows = [
  {
    kind: 'group', id: 'platform', parentGroupID: null,
    depth: 0, expanded: true, contextOnly: true,
    cells: { name: 'Platform', owner: '' },
  },
  { kind: 'leaf', id: 'checkout', cells: { name: 'Checkout', owner: 'Alex' } },
]
```

Multi-sort, global and column filters, page/window access, cancellation, and stale-response handling match the other profiles. Parent-before-child order, depth, expansion, and ancestry must all validate before a hierarchy is accepted.

## Metadata and virtualization

The projection exposes parent row, depth, position, size, expansion, and context-only metadata for ARIA treegrid attributes. Column order, pinning, sizing, filtering, and sorting share the flat grid contracts. Virtualization remains a separate raw composition and can reveal a row or cell without making Tabular own measurement.

## Parts by responsibility

| Part | Responsibility |
| --- | --- |
| `Provider` · `Root` | Controller scope, ARIA treegrid, and command/error boundary |
| `Header` · `HeaderRow` · `ColumnHeader` | Header schema and column metadata |
| `SortTrigger` · `FilterControl` | Query update and fresh hierarchical view request |
| `Body` · `Row` · `Cell` | Ordered groups/leaves, row levels, and cell cursor registration |
| `RowDisclosure` | Expansion and branch requests |
| `RowSelectionControl` · `BulkSelectionControl` | Leaf, all-matching, and group-leaf selection |
| `ColumnResizeHandle` | Host-owned column size |
| `Editor` | Leaf-only navigation/edit mode |

## Public API by layer

- Tabular core: `createDataTreeGrid`, `tryCreateDataTreeGrid`, controller view/source lifecycle, `dispatch`, and expansion/cursor/edit projection
- DOM: `createDataTreeGrid`, `connectDataTreeGrid`, header/row/cell registration, interaction bindings, and cell/row reveal
- Vue creation: `useDataTreeGrid`, `createDataTreeGridComponents`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`
- Vue structure: `Provider`, `Root`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Vue controls: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor`

Each layer exports expansion, cursor/edit state, projection, row metadata, query, view, source, command, controller, error, and option types. Vue adds every part's `Props` and `SlotProps`.
