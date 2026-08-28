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

## 기본 구성

`createDataTableComponents`는 controller의 schema type과 결합된 compound component namespace를 만듭니다. Provider는 prop 없이 그 controller를 provide/inject로 전달합니다. source는 revision이 포함된 request를 view로 변환합니다. Body가 accepted row를 반복하고 slot에 schema type이 보존된 `row`를 전달하며, 내부 cell과 control은 그 행의 식별자를 자동으로 상속합니다.

```vue
<script setup lang="ts">
import {
  defineDataTableColumns, useDataTable,
  createDataTableComponents, useDataTableSource,
} from '@sectile/vue/data-table'

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
        <DataTable.ColumnHeader headerNodeID="name">이름</DataTable.ColumnHeader>
        <DataTable.ColumnHeader headerNodeID="role">역할</DataTable.ColumnHeader>
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

## 선택과 native form

개별 행은 `DataTable.SelectionControl`, 전체 검색 결과나 group leaf는 `DataTable.BulkSelectionControl`로 선택합니다. Body 안에서는 현재 행 ID가 native value의 기본값이므로 `name`만 필요합니다. form에 다른 값을 제출할 때만 `value`를 지정합니다. all-matching selection은 revision에 묶이며 아직 불러오지 않은 모든 ID 대신 제외 목록만 저장합니다.

```vue
<DataTable.SelectionControl name="selected-users" />
<DataTable.BulkSelectionControl :target="{ kind: 'all-matching' }">검색 결과 전체 선택</DataTable.BulkSelectionControl>
```

## 그룹 행과 편집 의도

source가 반환한 group row는 `DataTable.Disclosure`로 펼치고 새 view를 요청할 수 있습니다. `DataTable.Editor`는 input, textarea, select에서 value commit 의도를 보내지만 검증과 저장은 응용 프로그램이 맡습니다. 2차원 cursor와 edit mode는 제공하지 않으므로 셀 편집이 중심이면 DataGrid를 사용하세요.

Header row에는 depth prop이 없습니다. 여러 단계의 `colspan`, `rowspan`, ARIA metadata는 header schema와 각 `headerNodeID`에서 계산합니다. native DataTable의 접근 가능한 이름은 `DataTable.Caption`으로 제공하고, table 밖의 보이는 제목이 이미 있다면 `aria-labelledby`로 연결합니다.

일반적인 행 반복은 Body가 맡습니다. virtual window처럼 저수준 렌더링이 필요할 때만 `<DataTable.Body manual>`과 `DataTable.Row rowID="…"`를 직접 사용합니다.

## source와 표현 상태

`useDataTableSource`는 `status`, `error`, `reload`, `cancel`, `replaceResolver`, `dispose`를 제공합니다. loading, empty, stale, error, retry 화면은 응용 프로그램 정책에 맞춰 구성합니다. SSR에서는 resolver가 실행되지 않으므로 hydration 시 server와 client가 같은 initial accepted view를 가져야 합니다.

## 공개 Vue API

- 생성: `useDataTable`, `createDataTableComponents`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`
- context: 반환된 namespace의 `DataTable.Provider`, `DataTable.Root`
- 구조: `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- 조작: `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor`

모든 part는 `Props`와 `SlotProps` type을 함께 내보냅니다. 같은 subpath에서 query, view, source, status, error, command, controller, accepted-view, access/request state, change handler, resolver와 options type도 가져올 수 있습니다.
