<script setup>
import TabularRemoteDataDemo from '../../../.vitepress/theme/components/TabularRemoteDataDemo.vue'
</script>

# 비동기 source

원격 정렬, 필터, 페이지네이션은 별도 모드가 아닙니다. UI가 query나 access를 바꾸면 `useData*Source`가 최신 `TabularRequest`를 resolver에 전달하고, 응용 프로그램은 이를 서버 규격으로 직렬화한 뒤 response envelope로 되돌립니다.

<TabularRemoteDataDemo />

열 제목을 연속으로 눌러 정렬 방향을 바꾸고, 검색 중 바로 다음 문자열을 입력해 보세요. 이전 작업은 `AbortSignal`로 취소되고 최신 request와 일치하는 response만 반영됩니다. 페이지 이동, all-matching 선택, 실패와 retry도 같은 source 수명 주기를 사용합니다.

::: details 동작하는 전체 예제 source
<<< ../../../.vitepress/theme/components/TabularRemoteDataDemo.vue
:::

## request를 서버 query로 변환

`request.query.sort`는 배열이므로 서버가 허용하면 다중 정렬을 그대로 보낼 수 있습니다. filter, group, aggregate, pivot도 descriptor ID와 policy key를 유지한 채 서버 계약으로 변환합니다.

```ts
function toSearchParams(request: Parameters<DataTableSourceResolver<UserCells>>[0]) {
  const params = new URLSearchParams()

  if (request.access.kind === 'page') {
    params.set('page', String(request.access.page))
    params.set('pageSize', String(request.access.itemsPerPage))
  } else {
    params.set('offset', String(request.access.start))
    params.set('limit', String(request.access.count))
  }

  for (const sort of request.query.sort) {
    const direction = sort.direction === 'ascending' ? 'asc' : 'desc'
    params.append('sort', `${sort.columnID}:${direction}`)
  }

  for (const filter of request.query.filters) {
    if (filter.enabled !== false) {
      params.append('filter', JSON.stringify(filter))
    }
  }

  return params
}
```

policy key는 함수를 네트워크로 보내는 값이 아닙니다. 예를 들어 `comparator: 'locale'`이나 `predicate: 'contains'`를 서버가 아는 정렬·검색 규칙 이름으로 사용합니다.

## resolver와 취소

```ts
import {
  useDataTableSource,
  type DataTableSourceResolver,
  type DataTableViewResponse,
} from '@sectile/vue/data-table'

const resolveUsers: DataTableSourceResolver<UserCells> = async (request, { signal }) => {
  const response = await fetch(`/api/users?${toSearchParams(request)}`, { signal })
  if (!response.ok) throw new Error(`사용자 요청 실패: ${response.status}`)

  const page: UsersPage = await response.json()
  return toViewResponse(request, page)
}

const source = useDataTableSource(table, resolveUsers, {
  onError(error) {
    reportError(error)
  },
  onStatusChange(status) {
    analytics.track('users-source', { status })
  },
})
```

새 request가 시작되면 실행 중인 resolver의 signal이 abort됩니다. transport가 실제 취소를 지원하지 않아 이전 Promise가 완료되더라도 request ID가 현재 작업과 다르면 결과를 무시합니다.

## response envelope 만들기

```ts
function toViewResponse(
  request: Parameters<DataTableSourceResolver<UserCells>>[0],
  page: UsersPage,
): DataTableViewResponse<UserCells> {
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: page.revision,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: page.total },
    visibleRowCount: { kind: 'known', value: page.total },
    rows: page.items.map((user) => ({
      kind: 'leaf',
      id: user.id,
      cells: {
        name: user.name,
        team: user.team,
        role: user.role,
      },
    })),
    columnSchema: {
      revision: request.columnSchemaRevision,
      columns,
      headers: [],
    },
    removedRowIDs: page.removedUserIDs,
  }
}
```

`viewRevision`은 같은 source generation 안에서 이전에 수락한 view보다 커야 합니다. page response의 `visibleRowCount`는 현재 page 길이가 아니라 query에 맞는 전체 row 수입니다. `matchingLeafCount`는 계층이나 projection을 적용하기 전 matching leaf 수를 표현할 수 있습니다.

## loading, stale, empty, error

source는 표현을 강제하지 않고 필요한 신호만 제공합니다.

```vue
<template>
  <p v-if="source.status.value === 'loading'" aria-live="polite">
    사용자 목록을 갱신하는 중…
  </p>

  <DataTable.Body>
    <template #default="{ row }"><!-- cells --></template>
    <template #empty>
      <tr><td :colspan="columns.length">검색 결과가 없습니다.</td></tr>
    </template>
  </DataTable.Body>

  <div v-if="source.status.value === 'error'" role="alert">
    사용자 목록을 불러오지 못했습니다.
    <button type="button" @click="source.reload">다시 시도</button>
  </div>
</template>
```

새 request 중 기존 current view는 `acceptedViewState.kind === 'stale'`로 남습니다. 화면을 비울지, 이전 데이터를 흐리게 유지할지, skeleton을 보여줄지는 응용 프로그램이 선택합니다. 첫 response 전에는 `none`, 최신 response를 수락하면 `current`입니다.

## source 제어 API

| API | 용도 |
| --- | --- |
| `status` | `idle`, `loading`, `success`, `error` 상태 |
| `error` | 가장 최근 resolver 또는 response 검증 실패 |
| `reload()` | 현재 query·access·expansion으로 새 request |
| `cancel()` | 실행 중인 작업 abort, pending request abandon |
| `replaceResolver(next)` | controller는 유지하고 transport를 교체한 뒤 source generation 갱신 |
| `dispose()` | executor와 진행 중인 작업 해제. Vue scope에서는 자동 호출 |

controller 하나에는 request executor 하나만 붙을 수 있습니다. query cache를 사용한다면 resolver 안에서 cache를 호출하고 `signal`과 request descriptor를 cache key에 연결하세요.

## source 교체와 SSR

`sourceKey`가 바뀌면 source generation이 증가하고 기존 view, expansion, generation에 묶인 all-matching 선택을 재조정합니다. 같은 source에서 fetch 함수만 교체하려면 `replaceResolver`를 사용합니다.

SSR에서는 resolver를 실행하지 않습니다. `initialView`를 전달한다면 server와 client가 같은 response envelope와 schema에서 hydration을 시작해야 하며, mount 뒤 첫 resolver가 최신 데이터를 갱신합니다.
