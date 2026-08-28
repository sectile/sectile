export type TabularExampleKind =
  | 'table-overview'
  | 'table-query'
  | 'table-selection'
  | 'table-structure'
  | 'table-columns'
  | 'grid-overview'
  | 'grid-navigation'
  | 'grid-editing'
  | 'grid-selection'
  | 'tree-overview'
  | 'tree-hierarchy'
  | 'tree-selection'
  | 'remote-source'
  | 'contracts';

export type TabularExampleSources = Readonly<Record<'vue' | 'dom' | 'core', string>>;

const tableSetup = `const columns = defineDataTableColumns([
  { id: 'name', capabilities: ['sort', 'filter', 'edit'] },
  { id: 'team', capabilities: ['sort', 'filter'] },
  { id: 'status', capabilities: ['sort', 'filter'] },
])
const table = useDataTable<UserCells>({ columns })
const DataTable = createDataTableComponents(table)

useDataTableSource(table, request => resolveUsers(request, columns))`;

function vueTable(template: string): string {
  return `<script setup lang="ts">
import {
  createDataTableComponents,
  defineDataTableColumns,
  useDataTable,
  useDataTableSource,
} from '@sectile/vue/data-table'

interface UserCells { name: string; team: string; status: string }
${tableSetup}
</script>

<template>
  <DataTable.Provider>
    <DataTable.Root>
      <DataTable.Caption>사용자</DataTable.Caption>
${template}
    </DataTable.Root>
  </DataTable.Provider>
</template>`;
}

function domTable(bindings: string): string {
  return `import { createDataTable } from '@sectile/dom/tabular'

const connection = createDataTable({
  columns,
  table: document.querySelector('table')!,
  onSnapshotChange: render,
})

${bindings}

connection.controller.attachRequestExecutor(({ request }) => {
  connection.synchronizeView(resolveUsers(request, columns))
})`;
}

function coreTable(events: string): string {
  return `import { createDataTable } from '@sectile/tabular/data-table'

const table = createDataTable({ columns })
table.attachRequestExecutor(({ request }) => {
  table.synchronizeView(resolveUsers(request, columns))
})

${events}

render(table.getProjection())`;
}

const tableOverview = Object.freeze({
  vue: vueTable(`      <DataTable.Header><DataTable.HeaderRow>
        <DataTable.ColumnHeader column="name">
          <DataTable.SortTrigger column="name">이름</DataTable.SortTrigger>
        </DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="team">팀</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="status">상태</DataTable.ColumnHeader>
      </DataTable.HeaderRow></DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
        <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
        <DataTable.Cell column="status">{{ row.cells.status }}</DataTable.Cell>
      </DataTable.Body>`),
  dom: domTable(`connection.bindSortTrigger(
  document.querySelector('[data-sort=name]')!,
  { columnID: 'name', comparator: 'locale' },
)`),
  core: coreTable(`table.dispatch({
  type: 'set-query',
  query: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] },
})`),
});

const tableQuery = Object.freeze({
  vue: vueTable(`      <DataTable.FilterControl
        scope="global" id="search" predicate="contains"
        placeholder="이름 또는 팀 검색"
      />
      <DataTable.Header><DataTable.HeaderRow>
        <DataTable.ColumnHeader column="name">
          <DataTable.SortTrigger column="name">이름</DataTable.SortTrigger>
        </DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="team">팀</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="status">상태</DataTable.ColumnHeader>
      </DataTable.HeaderRow></DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
        <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
        <DataTable.Cell column="status">{{ row.cells.status }}</DataTable.Cell>
      </DataTable.Body>`),
  dom: domTable(`connection.bindFilterControl(search, {
  scope: 'global', id: 'search', predicate: 'contains',
})
connection.bindSortTrigger(nameSort, {
  columnID: 'name', comparator: 'locale',
})`),
  core: coreTable(`table.dispatch({
  type: 'set-query',
  query: {
    sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'locale' }],
    filters: [{ id: 'search', scope: 'global', predicate: 'contains', value: '플랫폼' }],
    groups: [], aggregates: [], pivots: [],
  },
})`),
});

const tableSelection = Object.freeze({
  vue: vueTable(`      <DataTable.Header><DataTable.HeaderRow>
        <th><DataTable.BulkSelectionControl :target="{ kind: 'all-matching' }" /></th>
        <DataTable.ColumnHeader column="name">이름</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="team">팀</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="status">상태</DataTable.ColumnHeader>
      </DataTable.HeaderRow></DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <td><DataTable.SelectionControl name="selected-users" /></td>
        <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
        <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
        <DataTable.Cell column="status">{{ row.cells.status }}</DataTable.Cell>
      </DataTable.Body>`),
  dom: domTable(`connection.bindSelectionControl(rowCheckbox, {
  rowID: 'user-1', name: 'selected-users', value: 'user-1',
})
connection.bindBulkSelectionControl(allCheckbox, {
  target: { kind: 'all-matching' },
})
// A second Shift-click applies the target state to the visible leaf range.`),
  core: coreTable(`table.dispatch({ type: 'toggle-row-selection', rowID: 'user-1' })
table.dispatch({
  type: 'set-row-selection-range',
  anchorRowID: 'user-1', rowID: 'user-4', selected: true,
})`),
});

const tableStructure = Object.freeze({
  vue: vueTable(`      <DataTable.Header>
        <DataTable.HeaderRow>
          <DataTable.ColumnHeader header="identity">사용자 정보</DataTable.ColumnHeader>
          <DataTable.ColumnHeader column="status">상태</DataTable.ColumnHeader>
        </DataTable.HeaderRow>
        <DataTable.HeaderRow>
          <DataTable.ColumnHeader column="name">이름</DataTable.ColumnHeader>
          <DataTable.ColumnHeader column="team">팀</DataTable.ColumnHeader>
        </DataTable.HeaderRow>
      </DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <DataTable.Cell column="name">
          <DataTable.Editor as-child column="name"><input :value="row.cells.name"></DataTable.Editor>
        </DataTable.Cell>
        <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
        <DataTable.Cell column="status">{{ row.cells.status }}</DataTable.Cell>
      </DataTable.Body>`),
  dom: domTable(`connection.setHeaderCellAttributes(identityHeader, { headerNodeID: 'identity' })
connection.bindEditor(nameInput, {
  cell: { rowID: 'user-1', columnID: 'name' },
})`),
  core: coreTable(`table.subscribeCommands(command => {
  if (command.type === 'request-value-commit') save(command.cell, command.value)
})`),
});

const tableColumns = Object.freeze({
  vue: vueTable(`      <DataTable.Header><DataTable.HeaderRow>
        <DataTable.ColumnHeader column="name">
          이름
          <DataTable.ColumnResizeHandle column="name" :min-size="160" :max-size="480" />
        </DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="team">팀</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="status">상태</DataTable.ColumnHeader>
      </DataTable.HeaderRow></DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
        <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
        <DataTable.Cell column="status">{{ row.cells.status }}</DataTable.Cell>
      </DataTable.Body>`),
  dom: domTable(`connection.bindColumnResizeHandle(nameResize, {
  columnID: 'name', minSize: 160, maxSize: 480,
})
connection.handleEvent({
  type: 'set-column-state',
  columnState: { order: ['name', 'team'], hidden: ['status'], pinnedStart: ['name'], pinnedEnd: [] },
})`),
  core: coreTable(`table.dispatch({
  type: 'set-column-state',
  columnState: { order: ['name', 'team', 'status'], hidden: ['status'], pinnedStart: ['name'], pinnedEnd: [] },
})`),
});

const gridOverview = Object.freeze({
  vue: `<script setup lang="ts">
import { createDataGridComponents, defineDataGridColumns, useDataGrid, useDataGridSource } from '@sectile/vue/data-grid'
const columns = defineDataGridColumns([{ id: 'task', capabilities: ['sort', 'edit'] }, { id: 'owner', capabilities: ['edit'] }, { id: 'status' }])
const grid = useDataGrid({ columns })
const DataGrid = createDataGridComponents(grid)
useDataGridSource(grid, request => resolveWork(request, columns))
</script>
<template><DataGrid.Provider><DataGrid.Root aria-label="출시 준비">
  <DataGrid.Header><DataGrid.HeaderRow><DataGrid.ColumnHeader v-for="column in columns" :key="column.id" :column="column.id">{{ column.id }}</DataGrid.ColumnHeader></DataGrid.HeaderRow></DataGrid.Header>
  <DataGrid.Body v-slot="{ row }"><DataGrid.Cell v-for="column in columns" :key="column.id" :column="column.id">{{ row.cells[column.id] }}</DataGrid.Cell></DataGrid.Body>
</DataGrid.Root></DataGrid.Provider></template>`,
  dom: `import { createDataGrid } from '@sectile/dom/tabular'
const grid = createDataGrid({ columns, root: document.querySelector('[role=grid]')! })
grid.registerCell(taskCell, { cell: { rowID: 'tokens', columnID: 'task' } })
grid.controller.attachRequestExecutor(({ request }) => grid.synchronizeView(resolveWork(request, columns)))`,
  core: `import { createDataGrid } from '@sectile/tabular/data-grid'
const grid = createDataGrid({ columns })
grid.attachRequestExecutor(({ request }) => grid.synchronizeView(resolveWork(request, columns)))
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'tokens', columnID: 'task' } })`,
});

const gridNavigation = Object.freeze({
  vue: `${gridOverview.vue}\n<!-- Arrow keys move the roving cursor; Enter begins editing and Escape cancels. -->`,
  dom: `${gridOverview.dom}\n// createDataGrid attaches keyboard navigation to the root.\ngrid.focusCurrent()`,
  core: `${gridOverview.core}\ngrid.dispatch({ type: 'move-cell', direction: 'right' })`,
});

const gridEditing = Object.freeze({
  vue: `<DataGrid.Cell column="quota" v-slot="{ row, editState }">
  <span v-if="editState.kind !== 'editing'">{{ row.cells.quota }}</span>
  <DataGrid.Editor as-child column="quota" :parse-value="parseQuota">
    <input type="number" :value="row.cells.quota" min="0">
  </DataGrid.Editor>
</DataGrid.Cell>`,
  dom: `grid.bindEditor(quotaInput, {
  cell: { rowID: 'tokens', columnID: 'quota' },
  parseValue: value => Number(value) >= 0 ? { ok: true, value: Number(value) } : invalidQuota(),
})`,
  core: `grid.dispatch({ type: 'begin-edit', cell: { rowID: 'tokens', columnID: 'quota' } })
grid.dispatch({ type: 'commit-edit', value: 12 })
grid.subscribeCommands(command => command.type === 'commit-edit' && save(command))`,
});

const gridSelection = Object.freeze({
  vue: `<DataGrid.Body v-slot="{ row }">
  <DataGrid.Cell column="task">
    <DataGrid.RowSelectionControl name="release-items" />
    {{ row.cells.task }}
  </DataGrid.Cell>
  <DataGrid.Cell column="owner">{{ row.cells.owner }}</DataGrid.Cell>
  <DataGrid.Cell column="status">{{ row.cells.status }}</DataGrid.Cell>
</DataGrid.Body>`,
  dom: `grid.bindRowSelectionControl(rowCheckbox, {
  rowID: 'tokens', name: 'release-items', value: 'tokens',
})
// Shift-click applies the target checkbox state to the visible row interval.`,
  core: `grid.dispatch({ type: 'toggle-row-selection', rowID: 'tokens' })
grid.dispatch({
  type: 'set-row-selection-range',
  anchorRowID: 'tokens', rowID: 'release', selected: true,
})`,
});

const treeOverview = Object.freeze({
  vue: `<script setup lang="ts">
import { createDataTreeGridComponents, defineDataTreeGridColumns, useDataTreeGrid, useDataTreeGridSource } from '@sectile/vue/data-tree-grid'
const columns = defineDataTreeGridColumns([{ id: 'service', capabilities: ['sort', 'edit'] }, { id: 'owner' }, { id: 'status' }])
const tree = useDataTreeGrid({ columns })
const DataTreeGrid = createDataTreeGridComponents(tree)
useDataTreeGridSource(tree, request => resolveServices(request, columns))
</script>
<template><DataTreeGrid.Provider><DataTreeGrid.Root aria-label="서비스 소유권">
  <DataTreeGrid.Header><DataTreeGrid.HeaderRow><DataTreeGrid.ColumnHeader v-for="column in columns" :key="column.id" :column="column.id">{{ column.id }}</DataTreeGrid.ColumnHeader></DataTreeGrid.HeaderRow></DataTreeGrid.Header>
  <DataTreeGrid.Body v-slot="{ row }"><DataTreeGrid.Cell column="service"><DataTreeGrid.RowDisclosure v-if="row.kind === 'group'" />{{ row.cells.service }}</DataTreeGrid.Cell><DataTreeGrid.Cell column="owner">{{ row.cells.owner }}</DataTreeGrid.Cell><DataTreeGrid.Cell column="status">{{ row.cells.status }}</DataTreeGrid.Cell></DataTreeGrid.Body>
</DataTreeGrid.Root></DataTreeGrid.Provider></template>`,
  dom: `import { createDataTreeGrid } from '@sectile/dom/tabular'
const tree = createDataTreeGrid({ columns, root: document.querySelector('[role=treegrid]')! })
tree.bindRowDisclosure(commerceButton, { rowID: 'commerce' })
tree.controller.attachRequestExecutor(({ request }) => tree.synchronizeView(resolveServices(request, columns)))`,
  core: `import { createDataTreeGrid } from '@sectile/tabular/data-tree-grid'
const tree = createDataTreeGrid({ columns })
tree.attachRequestExecutor(({ request }) => tree.synchronizeView(resolveServices(request, columns)))
tree.dispatch({ type: 'set-row-expanded', rowID: 'commerce', open: true })`,
});

const treeHierarchy = Object.freeze({
  vue: `${treeOverview.vue}\n<!-- Group rows expose aria-level/expanded; context-only ancestors stay visible. -->`,
  dom: `${treeOverview.dom}\ntree.setRowAttributes(groupRow, { rowID: 'commerce' })`,
  core: `${treeOverview.core}\nconsole.log(tree.getProjection().rows.filter(row => row.contextOnly))`,
});

const treeSelection = Object.freeze({
  vue: `<DataTreeGrid.Body v-slot="{ row }">
  <DataTreeGrid.Cell column="service">
    <DataTreeGrid.RowDisclosure v-if="row.kind === 'group'" />
    <DataTreeGrid.RowSelectionControl v-else name="services" />
    {{ row.cells.service }}
  </DataTreeGrid.Cell>
</DataTreeGrid.Body>`,
  dom: `tree.bindRowSelectionControl(serviceCheckbox, {
  rowID: 'checkout', name: 'services', value: 'checkout',
})
// Shift-click selects the visible leaf interval and skips group rows.`,
  core: `tree.dispatch({
  type: 'set-row-selection-range',
  anchorRowID: 'storefront', rowID: 'checkout', selected: true,
})`,
});

const remoteSource = Object.freeze({
  vue: `const source = useDataTableSource(table, async (request, { signal }) => {
  const response = await fetch('/api/users?' + encodeRequest(request), { signal })
  if (!response.ok) throw new Error('사용자를 불러오지 못했습니다.')
  return toViewResponse(request, columns, await response.json())
})

// source.status, source.error, source.reload and source.cancel own no UI policy.`,
  dom: `let active = new AbortController()
connection.controller.attachRequestExecutor(async ({ request }) => {
  active.abort()
  active = new AbortController()
  const page = await fetchUsers(encodeRequest(request), { signal: active.signal })
  connection.synchronizeView(toViewResponse(request, columns, page))
})`,
  core: `let active = new AbortController()
table.attachRequestExecutor(async ({ request }) => {
  active.abort()
  active = new AbortController()
  const page = await fetchUsers(encodeRequest(request), { signal: active.signal })
  const accepted = table.synchronizeView(toViewResponse(request, columns, page))
  if (!accepted.ok) report(accepted.error)
})`,
});

const contracts = Object.freeze({
  vue: `const table = useDataTable({ columns })
watchEffect(() => {
  const state = table.snapshot.value.state
  console.log(state.queryRevision, state.sourceGeneration, state.requestState)
})`,
  dom: `const connection = createDataTable({
  columns, table,
  onSnapshotChange: snapshot => renderState(snapshot.state),
  onCommand: command => executeHostCommand(command),
})`,
  core: `const result = table.dispatch(event)
if (!result.ok) {
  console.error(result.error.category, result.error.code, result.error.details)
} else {
  console.log(result.value.state, result.value.commands)
}`,
});

const examples: Readonly<Record<TabularExampleKind, TabularExampleSources>> = Object.freeze({
  'table-overview': tableOverview,
  'table-query': tableQuery,
  'table-selection': tableSelection,
  'table-structure': tableStructure,
  'table-columns': tableColumns,
  'grid-overview': gridOverview,
  'grid-navigation': gridNavigation,
  'grid-editing': gridEditing,
  'grid-selection': gridSelection,
  'tree-overview': treeOverview,
  'tree-hierarchy': treeHierarchy,
  'tree-selection': treeSelection,
  'remote-source': remoteSource,
  contracts,
});

export function tabularExampleSources(kind: TabularExampleKind): TabularExampleSources {
  return examples[kind];
}
