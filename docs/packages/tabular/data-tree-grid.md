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

## Grid navigation and editing

Leaf cells use the same navigation and edit lifecycle as DataGrid. Group cells are read-only. Enter begins an editor, Escape cancels, and a valid commit emits an application command. Collapse or removal cancels an affected editor before recovering the cursor to a visible cell.

`DataTreeGrid.Body` renders the accepted ordered hierarchy and exposes typed `{ row, rowIndex, isGroup }`. Cells, disclosure controls, selection controls, and editors inherit the row ID. Use manual Body plus explicit Row only when custom windowing owns placement. Header row depth is derived from the header schema.

## Selection across branches

Use `DataTreeGrid.RowSelectionControl` for visible leaves. `DataTreeGrid.BulkSelectionControl` accepts either `{ kind: 'all-matching' }` or `{ kind: 'group-leaves', groupID }`. The latter emits group-leaf selection intent so the application or source can include descendants that are not loaded.

## Metadata and virtualization

The projection exposes parent row, depth, position, size, expansion, and context-only metadata for ARIA treegrid attributes. Column order, pinning, sizing, filtering, and sorting share the flat grid contracts. Virtualization remains a separate raw composition and can reveal a row or cell without making Tabular own measurement.

## Public Vue API

- Creation: `useDataTreeGrid`, `createDataTreeGridComponents`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`
- Context: `DataTreeGrid.Provider`, `DataTreeGrid.Root`
- Structure: `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Controls: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor`

Every part exports `Props` and `SlotProps`; the subpath also exports expansion, cursor/edit state, projection, row metadata, query, view, source, command, controller, error, resolver, status, controlled-state handlers, and options types.
