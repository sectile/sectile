# 공통 계약과 기능

DataTable, DataGrid, DataTreeGrid는 같은 행·열 schema, query, source, 선택, access 계약을 사용합니다. 프로필은 이 공통 데이터 계약 위에서 탐색 방식만 다르게 소유합니다.

## 열과 header schema

열 ID는 source, cell, 정렬, 필터, 열 상태에서 계속 유지되는 안정된 식별자입니다. `capabilities`는 source가 허용할 연산을 선언하고, `initialVisible`과 `initialPin`은 첫 열 상태를 정합니다.

```ts
import { defineDataTableColumns } from '@sectile/vue/data-table'

const columns = defineDataTableColumns([
  { id: 'name', label: '이름', capabilities: ['sort', 'filter'], initialPin: 'start' },
  { id: 'team', label: '팀', capabilities: ['sort', 'filter', 'group'] },
  { id: 'salary', label: '급여', capabilities: ['sort', 'aggregate', 'edit'], initialVisible: false },
])

const headers = [
  {
    kind: 'group', id: 'employment', label: '재직 정보', children: [
      { kind: 'column', id: 'team-header', columnID: 'team', label: '팀' },
      { kind: 'column', id: 'salary-header', columnID: 'salary', label: '급여' },
    ],
  },
] as const
```

중첩 header의 depth, `colspan`, `rowspan`, ARIA metadata는 schema에서 계산합니다. `HeaderRow`에 깊이를 직접 지정하지 않습니다.

## query

query는 정렬, 필터, 그룹, 집계, pivot descriptor의 정규화된 목록입니다. UI part는 query를 바꾸고 새 view를 요청합니다. comparator, predicate, group, aggregate policy key의 실제 의미는 client source 또는 원격 서버가 결정합니다.

```ts
import { createTabularQuery } from '@sectile/tabular/query'

const query = createTabularQuery({
  sort: [
    { id: 'team-sort', columnID: 'team', direction: 'ascending', comparator: 'locale' },
    { id: 'name-sort', columnID: 'name', direction: 'ascending', comparator: 'locale' },
  ],
  filters: [
    { id: 'active-users', scope: 'column', columnID: 'status', predicate: 'equals', value: 'active' },
  ],
  groups: [{ id: 'team-group', columnID: 'team', policy: 'exact' }],
  aggregates: [{ id: 'salary-total', columnID: 'salary', policy: 'sum' }],
  pivots: [{ id: 'region-pivot', columnID: 'region', valuePolicy: 'distinct', aggregateIDs: ['salary-total'] }],
})
```

Vue에서는 `SortTrigger`와 `FilterControl`로 자주 쓰는 query를 연결하고, group·aggregate·pivot builder 같은 application UI는 `query` controlled ref나 `dispatch({ type: 'set-query' })`로 전체 query를 교체합니다.

## client source

이미 메모리에 있는 배열은 `createClientTabularSource`로 처리할 수 있습니다. 정책은 reducer 밖에서 실행되며 안정 정렬, 필터, 그룹, 집계, pivot, page/window slicing을 같은 request 계약으로 계산합니다.

```ts
import { createClientTabularSource } from '@sectile/tabular/source'

const source = createClientTabularSource({
  records: users,
  columnSchema: { revision: 0, columns, headers: [] },
  getRowID: (user) => user.id,
  getValue: (user, columnID) => user[columnID],
  policies: {
    comparators: {
      locale: (left, right, descriptor, getValue) =>
        String(getValue(left, descriptor.columnID)).localeCompare(String(getValue(right, descriptor.columnID))),
    },
    predicates: {
      contains: (user, descriptor, getValue) =>
        Object.keys(user).some((columnID) =>
          String(getValue(user, columnID)).toLocaleLowerCase().includes(String(descriptor.value).toLocaleLowerCase()),
        ),
    },
  },
})

const response = source.resolve(request)
```

서버 데이터는 [비동기 source](./data-source)에서 같은 request를 HTTP, RPC, query client로 옮깁니다.

## page와 window access

`page` access는 전체 visible row 수를 아는 일반적인 서버 페이지네이션에 사용합니다. query가 바뀌면 첫 페이지로 돌아갑니다.

```ts
const table = useDataTable({
  columns,
  defaultAccessState: {
    kind: 'page', page: 1, itemsPerPage: 25,
    visibleRowCount: null, pagination: null,
  },
})

table.dispatch({
  type: 'set-access',
  accessState: { kind: 'page', page: 3, itemsPerPage: 25, visibleRowCount: 240, pagination: { page: 3, itemsPerPage: 25 } },
})
```

`window` access는 전체를 페이지로 나누지 않고 특정 범위를 가져오는 무한 스크롤이나 가상화에 사용합니다. window state와 source request에는 각각 현재 범위와 `{ start, count }`가 들어갑니다.

## 선택

명시적 선택은 로드된 row ID 목록을 소유합니다. all-matching 선택은 현재 `sourceGeneration`과 `queryRevision`에 묶인 전체 검색 결과와 제외 ID만 저장하므로, 아직 불러오지 않은 모든 ID를 열거하지 않습니다.

```ts
table.dispatch({ type: 'toggle-row-selection', rowID: 'user-42' })
table.dispatch({ type: 'select-all-matching' })
table.dispatch({
  type: 'set-row-selection',
  selection: { kind: 'explicit-rows', rowIDs: ['user-7', 'user-42'] },
})
```

DataTable은 native form control을, DataGrid와 DataTreeGrid는 cursor와 독립된 행 선택을 투영합니다. DataTreeGrid는 `request-group-leaf-selection`으로 아직 로드되지 않은 descendant까지 포함하는 선택 intent도 보낼 수 있습니다.

## 열 순서, 표시, pinning, 크기

semantic `columnState`는 순서, 숨김, 논리적 start/end pinning을 소유합니다. 픽셀 크기는 host state라서 DOM/Vue 연결이 별도로 소유합니다.

```ts
table.dispatch({
  type: 'set-column-state',
  columnState: {
    order: ['name', 'team', 'salary'],
    hidden: ['salary'],
    pinnedStart: ['name'],
    pinnedEnd: [],
  },
})
```

Vue에서는 `columnSizeState` 또는 `defaultColumnSizeState`를 전달하고 `ColumnResizeHandle column="name" :min-size="160" :max-size="480"`을 렌더링합니다.

## controlled와 uncontrolled 상태

`query`, `rowSelection`, `columnState`, `accessState`, `expansion`은 각각 독립적으로 외부 제어할 수 있습니다. `query`와 `defaultQuery`처럼 controlled 값과 default 값은 동시에 전달할 수 없습니다.

```ts
const query = ref(createTabularQuery())

const table = useDataTable({
  columns,
  query,
  onQueryChange(next) {
    query.value = next
  },
  defaultRowSelection: { kind: 'explicit-rows', rowIDs: [] },
})
```

controlled 변경은 먼저 callback으로 제안되고, 외부 ref가 실제로 동기화된 뒤 새 source request가 시작됩니다.

## revision과 원자적 동기화

모든 request는 `requestID`, `sourceGeneration`, `queryRevision`, `expansionRevision`, access 범위를 포함합니다. response가 이를 그대로 echo하지 않거나 이전 `viewRevision`을 반환하면 전체 response가 거부됩니다. ID 충돌, 잘못된 계층, profile 불일치, ceiling 초과도 현재 state를 일부 변경하지 않습니다.

`limits`로 행, 열, projected cell, query descriptor, group depth, 선택 ID, query value의 상한을 조정할 수 있습니다. 실패는 `TabularResult`의 구조화된 `class`, `code`, `message`, `details`로 반환됩니다.

## profile 선택

- [DataTable](./data-table): native table, form, 행 중심 읽기와 선택
- [DataGrid](./data-grid): 평면 2차원 cursor, roving focus, 편집 수명 주기
- [DataTreeGrid](./data-tree-grid): 계층, expansion, treegrid metadata, leaf 편집
- [Vue 구성](./vue): typed compound component와 상태 표현
- [DOM 연결](./dom): framework 없이 element를 직접 등록하고 binding
- [선택적 가상화](./virtual): page/window source와 별도로 raw Virtual을 조합
