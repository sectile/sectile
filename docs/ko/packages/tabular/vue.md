# Vue에서 Tabular 사용하기

기본 프로필에는 Vue만 설치하면 됩니다. `@sectile/tabular`와 `@sectile/dom`은 `@sectile/vue`의 직접 의존성이므로 공개 컴포넌트 type을 받기 위해 응용 프로그램에 따로 설치할 필요가 없습니다.

```sh
pnpm add @sectile/vue vue
```

## 프로필 선택

- [DataTable](./data-table): 정렬, filter, explicit/all-matching 선택, grouped disclosure, native form, edit intent를 실제 디렉터리 예제로 보여줍니다.
- [DataGrid](./data-grid): 2차원 이동, 행 선택, 편집, commit/cancel, 복구를 직접 시험할 수 있습니다.
- [DataTreeGrid](./data-tree-grid): 계층 disclosure, leaf 선택, 편집, collapse 복구를 직접 시험할 수 있습니다.

각 페이지에는 실행 중인 예제의 전체 source와 기능별 구성 예시가 함께 있습니다.

## Provider와 inject

`setup`에서 controller를 만들고 Provider에 한 번만 전달합니다. Root와 모든 compound part는 그 Provider 아래에 두며 controller를 다시 prop으로 전달하지 않습니다.

```vue
<script setup lang="ts">
import {
  DataGridProvider,
  DataGridRoot,
  defineDataGridColumns,
  useDataGrid,
  useDataGridSource,
} from '@sectile/vue/data-grid'

const columns = defineDataGridColumns([
  { id: 'name', capabilities: ['sort', 'filter', 'edit'] },
])
const grid = useDataGrid({ columns })
const source = useDataGridSource(grid, (request, { signal }) =>
  resolveUsers(request, signal),
)
</script>

<template>
  <DataGridProvider :controller="grid">
    <DataGridRoot aria-label="사용자">
      <!-- Header, Body, Row, Cell과 control이 여기에서 grid를 inject합니다. -->
    </DataGridRoot>
  </DataGridProvider>

  <p v-if="source.status.value === 'loading'">불러오는 중…</p>
  <button v-if="source.status.value === 'error'" @click="source.reload">다시 시도</button>
</template>
```

Provider를 중첩하면 거부되며 matching Provider 밖에서 part를 사용하면 즉시 실패합니다. Body가 accepted source row를 렌더링하고 slot에 각 `row`를 노출합니다. 내부 cell과 control은 현재 row ID를 상속하며 현재 projection에 없는 임의의 local ID는 interactive row나 cell로 등록할 수 없습니다.

## 프로필별 공개 API

| 프로필 | 생성·context | 구조 | 조작·편집 |
| --- | --- | --- | --- |
| DataTable | `useDataTable`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`, `DataTableProvider`, `DataTableRoot` | `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor` |
| DataGrid | `useDataGrid`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`, `DataGridProvider`, `DataGridRoot` | `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor` |
| DataTreeGrid | `useDataTreeGrid`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`, `DataTreeGridProvider`, `DataTreeGridRoot` | `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor` |

모든 part는 `Props`와 `SlotProps` type을 내보냅니다. 각 프로필은 같은 `@sectile/vue/data-*` subpath와 Vue package root에서 row/column/query/view/source/status/error/command/controller/context, accepted-view와 access/request state, change handler, source resolver, `Use*Options`, `Use*SourceOptions`, `Use*SourceReturn`도 제공합니다.

## source 실행과 UI 상태

`useData*Source`는 controller 하나에 executor 하나만 연결하고 mount 뒤에 시작합니다. reactive `status`와 `error`를 제공하고 교체된 작업을 취소하며 stale 완료를 무시합니다. resolver는 transport만 소유합니다. loading, empty, stale, error, retry, cache, suspense 화면은 응용 프로그램이 정합니다.

SSR에서는 resolver를 실행하지 않습니다. hydration은 같은 accepted view에서 시작해야 합니다. `sourceKey`는 semantic source generation을 교체하고 `replaceResolver`는 controller를 바꾸지 않은 채 transport logic만 바꿉니다.

## 렌더링 계약

- `as`는 element를 고르고 `asChild`는 유효한 child 하나를 채택합니다.
- Body는 accepted row를 기본으로 반복합니다. slot은 `{ row, rowIndex, isGroup }`를 제공하고 `manual`은 명시적인 저수준 Row 구성을 켭니다.
- cell 계열 part에는 `column="name"`을 사용합니다. 자동 Body 밖에서만 명시적인 `rowID`가 필요합니다. header node는 column 또는 group을 뜻할 수 있으므로 `headerNodeID`를 유지합니다.
- 평면 `HeaderRow`는 기본 `depth=0`을 사용하며 중첩 header row에서만 `depth`를 전달합니다.
- native DataTable은 `Caption`이나 `aria-labelledby`로 이름을 붙입니다. Grid와 TreeGrid는 `aria-label` 또는 `aria-labelledby`를 사용합니다.
- DataTable은 native table 의미와 form submission을 유지합니다.
- DataGrid와 DataTreeGrid는 grid/treegrid ARIA, roving tab stop, cursor, edit state를 투영합니다.
- controlled ownership은 mount된 Provider 수명 동안 고정됩니다.
- 열 크기, 측정, scroll, resize는 semantic state가 아니라 host state입니다.
