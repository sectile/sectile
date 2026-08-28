<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# DOM에서 Tabular 연결하기

`@sectile/dom/tabular`는 semantic controller를 기존 HTML element에 연결합니다. 스타일과 element 생성은 응용 프로그램이 맡고, connection은 native/ARIA 속성, event, focus, form 값, 등록 수명을 관리합니다.

```sh
pnpm add @sectile/dom @sectile/tabular
```

<TabularExample kind="table-overview" />

**코드 → DOM**은 기존 HTML element를 유지하면서 sort, row, cell과 source를 connection에 등록하는 흐름을 보여줍니다.

## 생성과 연결

`createDataTable`은 semantic controller와 DOM connection을 함께 만들고, `connectDataTable`은 이미 만든 `@sectile/tabular` controller에 DOM만 연결합니다. DataGrid와 DataTreeGrid도 같은 `create*`/`connect*` 쌍을 제공합니다.

```ts
import { createDataTable } from '@sectile/dom/tabular'

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

## element 등록

projection에 실제로 존재하는 row와 cell만 등록할 수 있습니다. render가 교체될 때 반환된 release 함수를 호출합니다.

```ts
const releaseRow = connection.registerRow(rowElement, { rowID: row.id })
const releaseCell = connection.registerCell(cellElement, {
  cell: { rowID: row.id, columnID: 'name' },
})
connection.setHeaderCellAttributes(nameHeader, { columnID: 'name' })

if (!releaseRow.ok || !releaseCell.ok) throw new Error('현재 projection과 DOM이 일치하지 않습니다.')

onRowUnmount(() => {
  releaseCell.value()
  releaseRow.value()
})
```

DataTable은 `HTMLTableRowElement`와 `HTMLTableCellElement`를 사용하고 native table 의미를 유지합니다. DataGrid와 DataTreeGrid는 일반 HTMLElement에 grid/treegrid role, row/column index, selected, expanded, level, position metadata를 투영합니다.

leaf header는 `{ columnID: 'name' }`으로 연결하면 실제 schema의 header node를 찾습니다. 여러 열을 묶는 중첩 group header만 `{ headerNodeID: 'employment' }`를 사용합니다. Vue에서는 각각 `column="name"`, `header="employment"`에 대응합니다.

## 기능 binding

각 `bind*` 함수는 속성과 listener를 함께 연결하고 해제 함수를 반환합니다.

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

DataTable의 `bindDisclosure`는 group row를 펼치고, DataTreeGrid의 `bindRowDisclosure`는 treegrid expansion을 바꿉니다. DataGrid와 DataTreeGrid의 `bindRowSelectionControl`은 cell cursor와 독립된 행 선택을 관리합니다.

## editor

```ts
const releaseEditor = connection.bindEditor(input, {
  cell: { rowID: 'user-42', columnID: 'quota' },
  parseValue(value) {
    const quota = Number(value)
    return Number.isFinite(quota)
      ? { ok: true, value: quota }
      : { ok: false, error: invalidQuotaError }
  },
  commitOnChange: false,
})
```

DataTable editor는 commit intent만 보냅니다. DataGrid와 DataTreeGrid는 Enter/Escape, composition, navigation/edit mode, focus transfer와 제거 복구까지 연결합니다. 저장, server validation, optimistic update는 `onCommand`에서 처리합니다.

## column size와 controlled 값

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

column size는 DOM host 상태이고 semantic column order·hidden·pinning과 분리됩니다. controlled 여부는 connection 수명 동안 바뀌지 않습니다.

## focus와 reveal command

DataGrid와 DataTreeGrid는 현재 cell만 tab stop으로 만들고 방향키, Home/End 계열 이동을 연결합니다. 이동 대상이 projection에는 있지만 mount되지 않았다면 connection은 `reveal-cell` command를 보냅니다. 응용 프로그램은 scroll/virtualizer로 cell을 표시한 뒤 `refresh()`를 호출합니다.

## 정리

```ts
connection.refresh()    // 현재 state를 등록된 모든 element에 다시 투영
connection.disconnect() // listener와 element 등록만 해제
```

`create*`로 connection이 controller까지 소유한 경우 `disconnect()`가 함께 만든 controller도 정리합니다. `connect*`는 외부 controller를 dispose하지 않습니다.
