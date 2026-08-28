# DOM composition

`@sectile/dom/data-*` connects semantic controllers to existing HTML elements. The application creates and styles elements; the connection owns native/ARIA attributes, events, focus, form values, and registration lifetimes.

```sh
pnpm add @sectile/dom
```

## Create or connect

`createDataTable` creates both a semantic controller and a DOM connection. `connectDataTable` attaches DOM behavior to an existing `@sectile/tabular` controller. DataGrid and DataTreeGrid expose the same `create*` and `connect*` pairs.

```ts
import { createDataTable } from '@sectile/dom/data-table'

const connection = createDataTable({
  table: document.querySelector<HTMLTableElement>('#users')!,
  columns,
  onCommand(command) {
    if (command.type === 'request-view') resolveView(command.request)
    if (command.type === 'request-value-commit') saveCell(command.cell, command.value)
  },
  onSnapshotChange() {
    render(connection.getProjection())
  },
})
```

## Register elements

Only rows and cells in the current projection can be registered. Call each returned release function when rendering removes an element.

```ts
const releaseRow = connection.registerRow(rowElement, { rowID: row.id })
const releaseCell = connection.registerCell(cellElement, {
  cell: { rowID: row.id, columnID: 'name' },
})
connection.setHeaderCellAttributes(nameHeader, { columnID: 'name' })

if (!releaseRow.ok || !releaseCell.ok) throw new Error('DOM and projection do not match.')

onRowUnmount(() => {
  releaseCell.value()
  releaseRow.value()
})
```

DataTable keeps native table elements. Grid profiles project grid/treegrid roles, indices, selection, expansion, level, and position metadata to ordinary HTMLElements.

Bind a leaf header with `{ columnID: 'name' }`; the connection resolves its actual schema node. Only a nested group header uses `{ headerNodeID: 'employment' }`. The equivalent Vue props are `column="name"` and `header="employment"`.

## Bind behavior

Every `bind*` function applies attributes and listeners together and returns a release function.

```ts
const releases = [
  connection.bindSortTrigger(nameSortButton, { columnID: 'name', comparator: 'locale' }),
  connection.bindFilterControl(searchInput, { scope: 'global', id: 'user-search', predicate: 'contains' }),
  connection.bindSelectionControl(rowCheckbox, {
    rowID: 'user-42', name: 'selected-users', value: 'user-42', form: 'bulk-actions',
  }),
  connection.bindBulkSelectionControl(allCheckbox, { target: { kind: 'all-matching' } }),
  connection.bindColumnResizeHandle(resizeButton, { columnID: 'name', minSize: 160, maxSize: 480 }),
]

onUnmount(() => releases.forEach((release) => release()))
```

DataTable uses `bindDisclosure`; DataTreeGrid uses `bindRowDisclosure`. Grid profiles use `bindRowSelectionControl` to keep row selection independent from the cell cursor.

## Editors

```ts
const releaseEditor = connection.bindEditor(input, {
  cell: { rowID: 'user-42', columnID: 'quota' },
  parseValue: parseQuota,
  commitOnChange: false,
})
```

The DataTable editor emits commit intent. Grid profiles additionally connect Enter/Escape, composition, navigation/edit modes, focus transfer, and recovery after removal. Persistence, server validation, and optimistic updates remain in `onCommand`.

## Column size and controlled state

```ts
const connection = connectDataGrid({
  controller: grid,
  root: gridElement,
  columnSizes: { name: 240, role: 180 },
  onColumnSizesChange(next) {
    persistedSizes = next
  },
})

connection.syncControlledValues({
  query,
  rowSelection,
  columnState,
  accessState,
  expansion,
  columnSizes: persistedSizes,
})
```

Pixel sizes are DOM host state and remain separate from semantic order, visibility, and pinning. Controlled ownership is fixed for the connection lifetime.

## Focus and reveal commands

Grid profiles keep one cell in the tab sequence and connect directional movement. If a target is projected but not mounted, the connection emits `request-reveal-cell`. Use scrolling or a virtualizer to mount it, then call `refresh()`.

## Cleanup

```ts
connection.refresh()    // Re-project current state to registered elements
connection.disconnect() // Release listeners and registrations
```

A connection created with `create*` also disposes its owned controller. A connection made with `connect*` leaves the external controller alive.
