<script setup>
import TabularDataTableDemo from '../../../.vitepress/theme/components/TabularDataTableDemo.vue'
</script>

# DataTable

DataTable은 읽기 중심 프로필입니다. native table 의미와 행 단위 동작이 spreadsheet식 셀 이동보다 중요한 디렉터리, 보고서, 검색 결과, 감사 기록, 관리 목록에 사용합니다.

<TabularDataTableDemo />

열 제목을 여러 번 눌러 오름차순·내림차순·정렬 해제를 순환해 보세요. 검색 결과를 좁히고 개별 행과 검색 결과 전체를 선택할 수 있습니다. 위 예시는 실제 `DataTable.SortTrigger`, `DataTable.FilterControl`, `DataTable.SelectionControl`, `DataTable.BulkSelectionControl`을 사용합니다.

::: details 동작하는 전체 예제 source
<<< ../../../.vitepress/theme/components/TabularDataTableDemo.vue
:::

## Tabular core만 사용

`@sectile/tabular/data-table`은 element나 framework를 알지 못합니다. controller에 source executor를 붙이고 event를 dispatch한 뒤 projection을 원하는 renderer에 전달합니다.

```ts
import { createDataTable } from '@sectile/tabular/data-table'
import { createClientTabularSource, resolveClientTabularRequest } from '@sectile/tabular/source'

const columns = [
  { id: 'name', capabilities: ['sort', 'filter'] },
  { id: 'role', capabilities: ['sort', 'filter'] },
] as const
const source = createClientTabularSource({
  records: [
    { id: 'ada', name: 'Ada Lovelace', role: 'Platform' },
    { id: 'grace', name: 'Grace Hopper', role: 'Compiler' },
  ],
  columnSchema: { revision: 0, columns, headers: [] },
  getRowID: (record) => record.id,
  getValue: (record, columnID) => columnID === 'name' ? record.name : record.role,
})
const table = createDataTable({ columns })

const attached = table.attachRequestExecutor(({ request }) => {
  const response = resolveClientTabularRequest(source, request)
  if (response.ok) table.synchronizeView(response.value)
})
if (!attached.ok) throw new Error(attached.error.message)

table.dispatch({ type: 'toggle-row-selection', rowID: 'ada' })
renderRows(table.getProjection().rows)
```

## DOM에 직접 연결

`@sectile/dom/data-table`은 같은 controller 계약을 native table element, form control, event에 연결합니다. 직접 만든 HTML과 design system 스타일을 그대로 사용할 수 있습니다.

```ts
import { createDataTable } from '@sectile/dom/data-table'

const connection = createDataTable({
  columns,
  table: document.querySelector<HTMLTableElement>('#users')!,
  onCommand: handleTableCommand,
  onSnapshotChange: renderTable,
})

const nameHeader = document.querySelector<HTMLTableCellElement>('#name-header')!
const nameSort = nameHeader.querySelector<HTMLButtonElement>('button')!
const rowElement = document.querySelector<HTMLTableRowElement>('[data-user-id="ada"]')!
const nameCell = rowElement.querySelector<HTMLTableCellElement>('[data-column="name"]')!
connection.setHeaderCellAttributes(nameHeader, { columnID: 'name' })
const releaseRow = connection.registerRow(rowElement, { rowID: 'ada' })
const releaseCell = connection.registerCell(nameCell, {
  cell: { rowID: 'ada', columnID: 'name' },
})
const releaseSort = connection.bindSortTrigger(nameSort, {
  columnID: 'name', comparator: 'locale',
})

function disconnectTable() {
  if (releaseRow.ok) releaseRow.value()
  if (releaseCell.ok) releaseCell.value()
  releaseSort()
  connection.disconnect()
}
```

## Vue 구성

`createDataTableComponents`는 controller의 schema type과 결합된 compound component namespace를 만듭니다. Provider는 prop 없이 그 controller를 provide/inject로 전달합니다. source는 revision이 포함된 request를 view로 변환합니다. Body가 accepted row를 반복하고 slot에 schema type이 보존된 `row`를 전달하며, 내부 cell과 control은 그 행의 식별자를 자동으로 상속합니다.

```vue
<script setup lang="ts">
import {
  defineDataTableColumns, useDataTable,
  createDataTableComponents, useDataTableSource,
} from '@sectile/vue/tabular'

interface UserCells {
  readonly name: string
  readonly role: string
}

const columns = defineDataTableColumns([
  { id: 'name', capabilities: ['sort', 'filter'] },
  { id: 'role', capabilities: ['sort', 'filter'] },
])
const table = useDataTable<UserCells>({ columns })
const DataTable = createDataTableComponents(table)

useDataTableSource(table, async (request) => {
  const page = await fetchUsers(request)
  return toViewResponse(request, columns, page)
})
</script>

<template>
  <DataTable.Provider>
    <DataTable.Root>
      <DataTable.Caption>사용자</DataTable.Caption>
      <DataTable.Header><DataTable.HeaderRow>
        <DataTable.ColumnHeader column="name">이름</DataTable.ColumnHeader>
        <DataTable.ColumnHeader column="role">역할</DataTable.ColumnHeader>
      </DataTable.HeaderRow></DataTable.Header>
      <DataTable.Body v-slot="{ row }">
        <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
        <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
      </DataTable.Body>
    </DataTable.Root>
  </DataTable.Provider>
</template>
```

## 정렬과 필터

`DataTable.SortTrigger`는 열 하나를 오름차순, 내림차순, 정렬 해제 순으로 바꿉니다. `DataTable.FilterControl`은 input이나 select를 global 또는 column filter descriptor에 연결합니다. 둘 다 canonical query를 갱신하고 새 view를 요청하며 comparator와 predicate key의 의미는 source가 결정합니다.

```vue
<DataTable.SortTrigger column="name" comparator="locale">이름</DataTable.SortTrigger>
<DataTable.FilterControl scope="global" id="user-search" predicate="contains" placeholder="사용자 검색" />
```

정렬과 필터는 현재 DOM 행을 직접 재배열하지 않습니다. query를 바꾸고 source에 새 view를 요청합니다. 메모리 배열은 client source가 계산하고, 서버 데이터는 `request.query.sort`와 `request.query.filters`를 HTTP/RPC 규격으로 옮깁니다. 취소, page reset, stale 응답 거부를 포함한 전체 예제는 [비동기 source](./data-source)에 있습니다.

column filter는 열 ID를 함께 전달합니다.

```vue
<DataTable.FilterControl
  as-child
  scope="column"
  column="status"
  id="status-filter"
  predicate="equals"
>
  <select aria-label="계정 상태">
    <option value="">전체 상태</option>
    <option value="active">사용 중</option>
    <option value="suspended">중지됨</option>
  </select>
</DataTable.FilterControl>
```

## 선택과 native form

개별 행은 `DataTable.SelectionControl`, 전체 검색 결과나 group leaf는 `DataTable.BulkSelectionControl`로 선택합니다. 전체 선택 컨트롤은 선택 없음, 일부 선택, 검색 결과 전체 선택을 각각 `aria-checked="false"`, `"mixed"`, `"true"`로 투영합니다. Body 안에서는 현재 행 ID가 native value의 기본값이므로 `name`만 필요합니다. form에 다른 값을 제출할 때만 `value`를 지정합니다. all-matching selection은 revision에 묶이며 아직 불러오지 않은 모든 ID 대신 제외 목록만 저장합니다.

```vue
<DataTable.SelectionControl name="selected-users" />
<DataTable.BulkSelectionControl :target="{ kind: 'all-matching' }">검색 결과 전체 선택</DataTable.BulkSelectionControl>
```

## 그룹 행과 편집 의도

source가 반환한 group row는 `DataTable.Disclosure`로 펼치고 새 view를 요청할 수 있습니다. `DataTable.Editor`는 input, textarea, select에서 value commit 의도를 보내지만 검증과 저장은 응용 프로그램이 맡습니다. 2차원 cursor와 edit mode는 제공하지 않으므로 셀 편집이 중심이면 DataGrid를 사용하세요.

Header row에는 depth prop이 없습니다. leaf header는 `column`으로 연결하고 중첩 group header만 `header`로 schema node를 지정합니다. 여러 단계의 `colspan`, `rowspan`, ARIA metadata는 header schema에서 계산합니다. native DataTable의 접근 가능한 이름은 `DataTable.Caption`으로 제공하고, table 밖의 보이는 제목이 이미 있다면 `aria-labelledby`로 연결합니다.

```vue
<DataTable.HeaderRow>
  <DataTable.ColumnHeader column="name">이름</DataTable.ColumnHeader>
  <DataTable.ColumnHeader header="employment">재직 정보</DataTable.ColumnHeader>
</DataTable.HeaderRow>
<DataTable.HeaderRow>
  <DataTable.ColumnHeader column="team">팀</DataTable.ColumnHeader>
  <DataTable.ColumnHeader column="role">역할</DataTable.ColumnHeader>
</DataTable.HeaderRow>
```

일반적인 행 반복은 Body가 맡습니다. virtual window처럼 저수준 렌더링이 필요할 때만 `<DataTable.Body manual>`과 `DataTable.Row rowID="…"`를 직접 사용합니다.

```vue
<DataTable.Body v-slot="{ row, isGroup }">
  <DataTable.Cell column="name">
    <DataTable.Disclosure v-if="isGroup" :aria-label="`${row.cells.name} 펼치기`" />
    {{ row.cells.name }}
  </DataTable.Cell>
  <DataTable.Cell column="quota">
    <DataTable.Editor
      v-if="row.kind === 'leaf'"
      as-child
      column="quota"
      :parse-value="parseQuota"
    >
      <input :value="row.cells.quota">
    </DataTable.Editor>
  </DataTable.Cell>
</DataTable.Body>
```

`request-value-commit` command는 cell address와 parsed wire value를 전달합니다. 응용 프로그램은 저장 성공 뒤 source를 reload하거나 optimistic view를 동기화합니다.

## 열 표시, pinning과 크기

열 순서·숨김·start/end pinning은 semantic `columnState`입니다. 픽셀 크기는 DOM host state이고 `ColumnResizeHandle`이 변경합니다.

```vue
<DataTable.ColumnHeader column="name">
  이름
  <DataTable.ColumnResizeHandle
    column="name"
    :min-size="160"
    :max-size="480"
    aria-label="이름 열 너비 조절"
  />
</DataTable.ColumnHeader>
```

```ts
const table = useDataTable({
  columns,
  defaultColumnSizeState: { name: 240, role: 180 },
  onColumnSizeStateChange(next) {
    localStorage.setItem('users:column-sizes', JSON.stringify(next))
  },
})
```

## page와 window

기본 access는 25개씩 page입니다. `set-access`로 page나 window를 바꾸면 source request의 `access`가 바뀝니다. page response는 query 전체의 visible row 수를 반환하고 controller가 pagination state를 계산합니다. 무한 scroll이나 virtual window에서는 `{ kind: 'window', window }`를 사용합니다. 자세한 state 형태는 [공통 계약](./contracts#page와-window-access)을 참고하세요.

## source와 표현 상태

`useDataTableSource`는 `status`, `error`, `reload`, `cancel`, `replaceResolver`, `dispose`를 제공합니다. loading, empty, stale, error, retry 화면은 응용 프로그램 정책에 맞춰 구성합니다. SSR에서는 resolver가 실행되지 않으므로 hydration 시 server와 client가 같은 initial accepted view를 가져야 합니다.

Root와 각 part slot은 `acceptedViewState`, `requestState`, `query`, `rowSelection`, `columnState`, `accessState`, `expansion`, `rows`를 제공합니다. Body slot은 여기에 typed `row`, `rowIndex`, `isGroup`을 더합니다.

## part별 용도

| Part | 용도 |
| --- | --- |
| `Provider` | 결합된 controller를 하위 part에 inject |
| `Root` | native `<table>`, command/error boundary |
| `Caption` | native table의 접근 가능한 이름 |
| `Header` · `HeaderRow` · `ColumnHeader` | header schema와 native `<thead>/<tr>/<th>` 투영 |
| `SortTrigger` · `FilterControl` | canonical query 변경과 새 source request |
| `Body` · `Row` · `Cell` | accepted view 자동 반복 또는 manual 등록 |
| `SelectionControl` | native checkbox/form 행 선택 |
| `BulkSelectionControl` | all-matching 또는 group-leaves 선택 intent |
| `Disclosure` | group expansion 변경과 새 view request |
| `ColumnResizeHandle` | host column size 변경 |
| `Editor` | native input의 parsed commit intent |

## 계층별 공개 API

- Tabular core: `createDataTable`, `tryCreateDataTable`, controller의 `dispatch`, `synchronizeView`, `requestView`, `abandonRequest`, `subscribeCommands`, `attachRequestExecutor`, `getSnapshot`, `getProjection`
- DOM: `createDataTable`, `connectDataTable`, `setHeaderCellAttributes`, `registerRow`, `registerCell`, `bindSortTrigger`, `bindFilterControl`, `bindSelectionControl`, `bindBulkSelectionControl`, `bindDisclosure`, `bindColumnResizeHandle`, `bindEditor`
- Vue 생성: `useDataTable`, `createDataTableComponents`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`
- Vue 구조: `Provider`, `Root`, `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Vue 조작: `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor`

Vue part는 `Props`와 `SlotProps` type을 함께 내보냅니다. 각 계층의 같은 subpath에서 query, view, source, error, command, controller, access/request state와 options type도 가져올 수 있습니다.
