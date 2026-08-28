<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# Vue에서 Tabular 사용하기

Tabular용 Vue API는 `@sectile/vue/tabular`에 모여 있습니다. 이 subpath를 사용할 때는 optional peer dependency인 `@sectile/tabular`를 함께 설치합니다. Tabular를 사용하지 않는 `@sectile/vue` 응용 프로그램에는 필요하지 않습니다.

```sh
pnpm add @sectile/vue @sectile/tabular vue
```

<TabularExample kind="table-overview" />

**코드 → Vue**에서 controller 생성, typed compound component, Provider와 source 연결이 한 파일 안에서 어떻게 이어지는지 확인할 수 있습니다.

## 프로필 선택

- [DataTable](./data-table): 정렬, filter, explicit/all-matching 선택, grouped disclosure, native form, edit intent를 실제 디렉터리 예제로 보여줍니다.
- [DataGrid](./data-grid): 2차원 이동, 행 선택, 편집, commit/cancel, 복구를 직접 시험할 수 있습니다.
- [DataTreeGrid](./data-tree-grid): 계층 disclosure, leaf 선택, 편집, collapse 복구를 직접 시험할 수 있습니다.

각 페이지에는 실행 중인 예제의 전체 source와 기능별 구성 예시가 함께 있습니다.

## Provider와 inject

`setup`에서 controller를 만든 뒤 `createData*Components`를 한 번 호출해 schema type이 결합된 component namespace를 얻습니다. 이 namespace의 Provider는 controller prop 없이 결합된 controller를 하위 트리에 inject합니다.

```vue
<script setup lang="ts">
import {
  defineDataGridColumns,
  useDataGrid,
  createDataGridComponents,
  useDataGridSource,
} from '@sectile/vue/tabular'

interface UserCells {
  readonly name: string
}

const columns = defineDataGridColumns([
  { id: 'name', capabilities: ['sort', 'filter', 'edit'] },
])
const grid = useDataGrid<UserCells>({ columns })
const DataGrid = createDataGridComponents(grid)
const source = useDataGridSource(grid, (request, { signal }) =>
  resolveUsers(request, signal),
)
</script>

<template>
  <DataGrid.Provider>
    <DataGrid.Root aria-label="사용자">
      <!-- Header, Body, Row, Cell과 control이 여기에서 grid를 inject합니다. -->
    </DataGrid.Root>
  </DataGrid.Provider>

  <p v-if="source.status.value === 'loading'">불러오는 중…</p>
  <button v-if="source.status.value === 'error'" @click="source.reload">다시 시도</button>
</template>
```

Provider를 중첩하면 각 part가 가장 가까운 matching Provider를 사용하는 별도 scope가 됩니다. matching Provider 밖에서 part를 사용하면 즉시 실패합니다. Body가 accepted source row를 렌더링하고 slot에 schema type이 보존된 `row`를 노출합니다. 내부 cell과 control은 현재 row ID를 상속하며 현재 projection에 없는 임의의 local ID는 interactive row나 cell로 등록할 수 없습니다.

## 프로필별 공개 API

| 프로필 | 생성·context | 구조 | 조작·편집 |
| --- | --- | --- | --- |
| DataTable | `useDataTable`, `createDataTableComponents`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns` | `DataTable.Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor` |
| DataGrid | `useDataGrid`, `createDataGridComponents`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns` | `DataGrid.Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor` |
| DataTreeGrid | `useDataTreeGrid`, `createDataTreeGridComponents`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns` | `DataTreeGrid.Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor` |

모든 part는 `Props`와 `SlotProps` type을 내보냅니다. `@sectile/vue/tabular`는 세 프로필의 row/column/query/view/source/status/error/command/controller/context, accepted-view와 access/request state, change handler, source resolver, `Use*Options`, `Use*SourceOptions`, `Use*SourceReturn`도 함께 제공합니다. Vue package root에서는 이 API를 내보내지 않습니다.

## source 실행과 UI 상태

`useData*Source`는 controller 하나에 executor 하나만 연결하고 mount 뒤에 시작합니다. reactive `status`와 `error`를 제공하고 교체된 작업을 취소하며 stale 완료를 무시합니다. resolver는 transport만 소유합니다. loading, empty, stale, error, retry, cache, suspense 화면은 응용 프로그램이 정합니다.

SSR에서는 resolver를 실행하지 않습니다. hydration은 같은 accepted view에서 시작해야 합니다. `sourceKey`는 semantic source generation을 교체하고 `replaceResolver`는 controller를 바꾸지 않은 채 transport logic만 바꿉니다.

[비동기 source](./data-source) 페이지에는 정렬·검색·페이지 이동이 실제 resolver request로 전달되는 예제와 loading, stale, error, retry 구성이 있습니다.

## type 추론

`defineData*Columns`의 `getValue`가 있으면 column ID와 cell value type을 추론합니다. 원격 response처럼 record accessor가 없는 경우 `useData*<Cells>()`에 schema를 한 번 선언합니다. `createData*Components(controller)`가 이 schema를 모든 compound part와 Body slot에 결합합니다.

```ts
interface UserRecord {
  readonly id: string
  readonly profile: { readonly name: string }
  readonly quota: number
}

const columns = defineDataTableColumns([
  { id: 'name', getValue: (user: UserRecord) => user.profile.name },
  { id: 'quota', getValue: (user: UserRecord) => user.quota },
])

const inferred = useDataTable({ columns })
const InferredTable = createDataTableComponents(inferred)
// Body의 row.cells.name은 string, row.cells.quota는 number

interface RemoteCells {
  readonly name: string
  readonly quota: number
}

const remote = useDataTable<RemoteCells>({ columns })
const RemoteTable = createDataTableComponents(remote)
```

bound namespace 밖의 broad component를 별도로 유지하지 않습니다. controller마다 만든 namespace가 schema type과 Provider scope의 단일 공개 component API입니다.

## controlled state

각 slice는 `ref`를 전달하면 controlled, `default*`를 전달하면 uncontrolled입니다. controlled callback은 변경 제안이며 ref를 실제로 갱신해야 새 request가 시작됩니다.

```ts
const query = ref(createTabularQuery())
const selection = ref<DataTableRowSelection>({ kind: 'explicit-rows', rowIDs: [] })

const table = useDataTable({
  columns,
  query,
  onQueryChange: (next) => { query.value = next },
  rowSelection: selection,
  onRowSelectionChange: (next) => { selection.value = next },
  defaultColumnState: {
    order: columns.map((column) => column.id),
    hidden: [], pinnedStart: ['name'], pinnedEnd: [],
  },
})
```

## slot으로 상태 표현

Root/Provider/part slot은 source와 interaction state를 함께 제공합니다. 별도 composable을 호출하지 않고 loading, stale, selection, cursor, edit mode를 가까운 template에서 표현할 수 있습니다.

```vue
<DataGrid.Root v-slot="{ acceptedViewState, requestState, cursor, editState }">
  <p v-if="requestState.kind === 'pending'" aria-live="polite">업데이트 중…</p>
  <p v-if="acceptedViewState.kind === 'stale'">이전 결과를 표시하고 있습니다.</p>
  <span>현재 셀: {{ cursor.current?.rowID }} / {{ cursor.current?.columnID }}</span>
  <span>모드: {{ editState.kind }}</span>
</DataGrid.Root>
```

`useData*Context()`는 같은 값을 script에서 읽어야 하는 하위 component에 사용합니다. matching Provider 밖에서 호출하면 즉시 실패합니다.

## 렌더링 계약

- `as`는 element를 고르고 `asChild`는 유효한 child 하나를 채택합니다.
- Body는 accepted row를 기본으로 반복합니다. slot은 `{ row, rowIndex, isGroup }`를 제공하고 `manual`은 명시적인 저수준 Row 구성을 켭니다.
- cell과 leaf header에는 `column="name"`을 사용합니다. 자동 Body 밖에서만 명시적인 `rowID`가 필요합니다.
- 중첩 group header만 `header="employment"`로 schema node를 지정합니다. `HeaderRow`에는 depth prop이 없으며 schema가 중첩 깊이, span, ARIA metadata를 결정합니다.
- Body slot의 row는 controller가 가진 cell schema를 보존합니다. getter가 있는 column은 반환값 type을 추론하고, 원격 projection은 `useData*<Cells>()`로 schema를 선언할 수 있습니다. leaf와 group schema도 분리할 수 있습니다.
- native DataTable은 `Caption`이나 `aria-labelledby`로 이름을 붙입니다. Grid와 TreeGrid는 `aria-label` 또는 `aria-labelledby`를 사용합니다.
- DataTable은 native table 의미와 form submission을 유지합니다.
- DataGrid와 DataTreeGrid는 grid/treegrid ARIA, roving tab stop, cursor, edit state를 투영합니다.
- controlled ownership은 mount된 Provider 수명 동안 고정됩니다.
- 열 크기, 측정, scroll, resize는 semantic state가 아니라 host state입니다.

## `as`와 `asChild`

`as`는 기본 element를 바꾸고, `asChild`는 유효한 단일 child에 part의 속성·event·ref를 합칩니다. 기존 input, button, design-system component를 다시 만들지 않고 Tabular binding만 채택할 때 사용합니다.

```vue
<DataTable.FilterControl as-child scope="global" id="search" predicate="contains">
  <TextField type="search" aria-label="사용자 검색" />
</DataTable.FilterControl>

<DataGrid.Editor as-child column="quota">
  <NumberField aria-label="할당량" />
</DataGrid.Editor>
```

`asChild`에는 element로 귀결되는 child 하나만 둘 수 있습니다. 구조 part의 native/ARIA 의미를 바꾸는 경우 결과 element가 해당 host 계약을 충족하는지 응용 프로그램이 책임집니다.
