<script setup>
import TabularDataGridDemo from '../../../.vitepress/theme/components/TabularDataGridDemo.vue'
</script>

# DataGrid

DataGrid는 평면 application grid 프로필입니다. 셀 사이를 이동하고 grid를 벗어나지 않은 채 값을 편집하는 작업 보드, 권한 matrix, 재고 관리, editor에 사용합니다.

<TabularDataGridDemo />

셀을 누른 뒤 방향키로 이동하고 Enter로 편집하고 Escape로 취소해 보세요. 행 checkbox는 현재 cell과 독립적입니다. 정렬로 accepted view가 바뀌어도 프로필 계약은 유지됩니다.

::: details 동작하는 전체 예제 source
<<< ../../../.vitepress/theme/components/TabularDataGridDemo.vue
:::

## Tabular core만 사용

core controller는 cursor, edit mode, selection과 command를 계산하지만 DOM focus나 element를 소유하지 않습니다.

```ts
import { createDataGrid } from '@sectile/tabular/data-grid'

const columns = [
  { id: 'task', capabilities: ['sort', 'edit'] },
  { id: 'owner', capabilities: ['sort'] },
] as const
const grid = createDataGrid({ columns })

grid.subscribeCommands((command) => {
  if (command.type === 'request-view') loadGridView(command.request)
  if (command.type === 'commit-edit') saveCell(command.cell, command.value)
})

grid.synchronizeView(initialGridResponse)
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'release', columnID: 'task' } })
grid.dispatch({ type: 'move-cell', direction: 'right' })

const { cursor, edit } = grid.getSnapshot()
renderGrid(grid.getProjection(), { cursor, edit })
```

## DOM에 직접 연결

DOM connection은 ARIA grid, roving tab stop, keyboard 이동과 editor 수명을 기존 element에 투영합니다.

`RowSelectionControl`은 현재 보이는 leaf 행에서 Shift+클릭과 Shift+Space 범위 선택도 지원합니다. cell 선택과 cursor 이동 동작은 바뀌지 않습니다.

```ts
import { createDataGrid } from '@sectile/dom/tabular'

const connection = createDataGrid({
  columns,
  root: document.querySelector<HTMLElement>('#release-grid')!,
  onCommand: handleGridCommand,
  onSnapshotChange: renderGrid,
})

const taskHeader = document.querySelector<HTMLElement>('[data-header="task"]')!
const rowElement = document.querySelector<HTMLElement>('[data-row="release"]')!
const taskCell = rowElement.querySelector<HTMLElement>('[data-column="task"]')!
const taskInput = taskCell.querySelector<HTMLInputElement>('input')!
connection.setColumnHeaderAttributes(taskHeader, { columnID: 'task' })
const releaseRow = connection.registerRow(rowElement, { rowID: 'release' })
const releaseCell = connection.registerCell(taskCell, {
  cell: { rowID: 'release', columnID: 'task' },
})
const releaseEditor = connection.bindEditor(taskInput, {
  cell: { rowID: 'release', columnID: 'task' },
})

connection.focusCurrent()
```

## Vue grid 구성

DataGrid는 native table element가 아니라 ARIA grid 의미를 사용합니다. accepted view의 모든 행은 leaf여야 하며 계층형 response는 상태를 일부 변경하지 않고 원자적으로 거부됩니다. `createDataGridComponents(grid)`로 controller type이 결합된 namespace를 만듭니다.

```vue
<script setup lang="ts">
import { createDataGridComponents } from '@sectile/vue/tabular'

const DataGrid = createDataGridComponents(grid)
</script>

<template>
<DataGrid.Provider>
  <DataGrid.Root aria-label="출시 작업" @command="handleCommand">
    <DataGrid.Header><DataGrid.HeaderRow>
      <DataGrid.ColumnHeader column="task">작업</DataGrid.ColumnHeader>
      <DataGrid.ColumnHeader column="owner">담당자</DataGrid.ColumnHeader>
    </DataGrid.HeaderRow></DataGrid.Header>
    <DataGrid.Body v-slot="{ row }">
      <DataGrid.Cell column="task">{{ row.cells.task }}</DataGrid.Cell>
      <DataGrid.Cell column="owner">{{ row.cells.owner }}</DataGrid.Cell>
    </DataGrid.Body>
  </DataGrid.Root>
</DataGrid.Provider>
</template>
```

## cursor와 keyboard 이동

controller는 DOM focus가 아니라 cell address를 소유합니다. DOM 연결은 tab stop 하나를 투영하고 보이는 셀 사이를 이동하며 현재 셀이 mount되지 않았으면 reveal 요청을 보냅니다. 응용 프로그램이 `focus-cell`과 `move-cell`을 직접 dispatch할 수도 있습니다.

```ts
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'task-1', columnID: 'owner' } })
grid.dispatch({ type: 'move-cell', direction: 'down' })
```

`boundary: 'stop'`은 끝에서 멈추고 `boundary: 'wrap-axis'`는 다음 행이나 열 축으로 이어집니다. `isCellDisabled`는 이동과 편집에서 건너뛸 cell을 한 곳에서 정의합니다.

```ts
const grid = useDataGrid({
  columns,
  isCellDisabled(cell) {
    return cell.columnID === 'approval' && !canApprove(cell.rowID)
  },
})

grid.dispatch({ type: 'move-cell', direction: 'right', boundary: 'wrap-axis' })
```

cursor와 edit mode도 각각 controlled 또는 uncontrolled로 소유할 수 있습니다.

```ts
const cursor = ref<DataGridCursorState>({ current: null })
const editState = ref<DataGridEditState>({ kind: 'navigation' })

const grid = useDataGrid({
  columns,
  cursor,
  onCursorChange: (next) => { cursor.value = next },
  editState,
  onEditStateChange: (next) => { editState.value = next },
})
```

## 편집과 검증

편집할 열에 `edit` capability를 표시하고 각 cell에 `DataGrid.Editor`를 둡니다. Enter로 시작하고 Enter로 commit하며 Escape로 cancel합니다. `parseValue`는 구조화된 실패를 반환할 수 있습니다. commit command 뒤의 저장과 optimistic update는 응용 프로그램 책임입니다.

행이나 열이 source response에서 사라지면 editor를 먼저 취소한 뒤 남은 cell로 cursor를 결정적으로 옮깁니다. source 교체 역시 편집을 취소하고 replacement view를 요청합니다.

Body는 accepted row를 기본으로 반복하며 매 slot 호출에 type이 지정된 `row`를 전달합니다. cell, row selection control, editor는 현재 행 ID를 자동으로 상속합니다. 별도 windowing 전략이 행 배치를 직접 소유할 때만 `<DataGrid.Body manual>`과 명시적인 `DataGrid.Row`를 사용합니다. Header row의 깊이와 span metadata는 component prop이 아니라 header schema에서 계산합니다.

```vue
<DataGrid.Cell column="quota" v-slot="{ editState, row }">
  <span v-if="editState.kind === 'navigation'">{{ row?.cells.quota }}</span>
  <DataGrid.Editor
    as-child
    column="quota"
    :parse-value="parseQuota"
  >
    <input :value="row?.cells.quota" inputmode="numeric">
  </DataGrid.Editor>
</DataGrid.Cell>
```

```ts
function handleCommand(command: DataGridCommand) {
  if (command.type === 'commit-edit') {
    saveCell(command.cell, command.value)
    grid.requestView()
  }
  if (command.type === 'cancel-edit') {
    releaseDraft(command.cell, command.reason)
  }
  if (command.type === 'request-reveal-cell') {
    const target = adapter.locateCell(command.cell)
    if (target !== null) virtualizer.scrollTo(target.id)
  }
}
```

`begin-edit`, `commit-edit`, `cancel-edit` command는 editor DOM 동작과 저장 정책을 분리합니다. IME composition 중에는 commit하지 않으며, 편집 중 다른 cell로 focus가 이동하면 `focus-transfer` cancel이 먼저 발생합니다.

## 선택, 열 상태, 큰 데이터

`DataGrid.RowSelectionControl`과 `DataGrid.BulkSelectionControl`은 cell cursor와 별도로 행을 선택합니다. column state에는 순서, 숨김, start/end pinning이 포함됩니다. `DataGrid.ColumnResizeHandle`은 host가 소유한 크기를 투영합니다. 큰 화면만 `@sectile/vue/virtual`과 선택적 Tabular adapter를 조합합니다.

```vue
<DataGrid.RowSelectionControl name="selected-work-items" />
<DataGrid.BulkSelectionControl :target="{ kind: 'all-matching' }">
  검색 결과 전체 선택
</DataGrid.BulkSelectionControl>
<DataGrid.ColumnResizeHandle column="task" :min-size="220" />
```

## 정렬, 필터와 source

DataGrid도 DataTable과 같은 query/source 계약을 사용합니다. `SortTrigger`와 `FilterControl`은 현재 mount된 cell을 직접 바꾸지 않고 새 flat view를 요청합니다. 서버 정렬·필터·페이지네이션, abort와 stale response 처리는 [비동기 source](./data-source)와 같습니다. 응답에 group row가 포함되면 flat profile 전체가 원자적으로 거부됩니다.

## part별 용도

| Part | 용도 |
| --- | --- |
| `Provider` · `Root` | controller inject, ARIA grid와 command/error boundary |
| `Header` · `HeaderRow` · `ColumnHeader` | rowgroup/row/columnheader와 schema metadata |
| `SortTrigger` · `FilterControl` | query 변경과 새 view request |
| `Body` · `Row` · `Cell` | flat accepted view와 2차원 cell 등록 |
| `RowSelectionControl` · `BulkSelectionControl` | cursor와 독립된 행 선택 |
| `ColumnResizeHandle` | host column size 변경 |
| `Editor` | navigation/edit mode와 commit/cancel 연결 |

## 계층별 공개 API

- Tabular core: `createDataGrid`, `tryCreateDataGrid`, controller의 view/source API와 `dispatch`, cursor/edit projection
- DOM: `createDataGrid`, `connectDataGrid`, header/row/cell 속성과 등록, sort/filter/selection/editor/resize binding, `focusCurrent`, `requestRevealCell`
- Vue 생성: `useDataGrid`, `createDataGridComponents`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`
- Vue 구조: `Provider`, `Root`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Vue 조작: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor`

각 계층의 같은 subpath에서 cursor/edit state, projection, query, view, source, command, controller, error와 options type을 제공합니다. Vue는 여기에 각 part의 `Props`와 `SlotProps` type을 더합니다.
