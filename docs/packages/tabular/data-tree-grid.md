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

`DataTreeGridRowDisclosure` updates expansion and produces a revisioned source request. The resolver returns only the currently visible branch plus any context-only ancestors needed to explain it.

```vue
<DataTreeGridRowDisclosure
  v-if="row.kind === 'group'"
  :rowID="row.id"
>
  Toggle {{ row.cells.name }}
</DataTreeGridRowDisclosure>
```

## Grid navigation and editing

Leaf cells use the same navigation and edit lifecycle as DataGrid. Group cells are read-only. Enter begins an editor, Escape cancels, and a valid commit emits an application command. Collapse or removal cancels an affected editor before recovering the cursor to a visible cell.

## Selection across branches

Use `DataTreeGridRowSelectionControl` for visible leaves. `DataTreeGridBulkSelectionControl` accepts either `{ kind: 'all-matching' }` or `{ kind: 'group-leaves', groupID }`. The latter emits group-leaf selection intent so the application or source can include descendants that are not loaded.

## Metadata and virtualization

The projection exposes parent row, depth, position, size, expansion, and context-only metadata for ARIA treegrid attributes. Column order, pinning, sizing, filtering, and sorting share the flat grid contracts. Virtualization remains a separate raw composition and can reveal a row or cell without making Tabular own measurement.

## Public Vue API

- Creation: `useDataTreeGrid`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`
- Context: `DataTreeGridProvider`, `DataTreeGridRoot`
- Structure: `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Controls: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor`

Every part exports `Props` and `SlotProps`; the subpath also exports expansion, cursor/edit state, projection, row metadata, query, view, source, command, controller, error, resolver, status, controlled-state handlers, and options types.
