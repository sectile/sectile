<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# 비동기 source

Tabular의 정렬·필터·페이지 변경은 현재 DOM 행을 재배열하는 명령이 아니라 **새 view를 요청하는 query 변경**입니다. source는 그 request를 메모리에서 계산할 수도 있고 서버로 보낼 수도 있습니다.

<TabularExample kind="remote-source" />

검색하거나 정렬하고, 다음 페이지로 이동한 뒤 실패도 발생시켜 보세요. 화면은 마지막으로 승인된 결과를 유지하면서 별도의 loading/error 상태를 보여주고, 오래 도착한 응답은 거부합니다. 코드 탭에서는 같은 흐름을 Vue·DOM·Core로 전환할 수 있습니다.

## 한 요청이 처리되는 순서

1. 사용자가 정렬, 필터, expansion 또는 page/window를 바꿉니다.
2. controller가 고유한 request ID와 현재 query·access·revision을 담은 request를 만듭니다.
3. source가 로컬 배열을 계산하거나 HTTP/RPC를 실행합니다.
4. 응답이 현재 pending request와 같은 계약인지 검사합니다.
5. 일치하면 view 전체를 승인하고, 오래됐거나 잘못된 응답이면 기존 view를 그대로 둡니다.

선택·cursor·column 상태는 이 과정과 독립적으로 유지되며, 새 view에서 사라진 대상만 각 프로필의 복구 규칙으로 정리됩니다.

## request를 서버 규격으로 옮기기

서버 API 이름은 자유롭게 정할 수 있습니다. 다만 의미를 잃지 않도록 query와 access를 명시적으로 변환하세요.

| Tabular request | HTTP 예시 |
| --- | --- |
| `query.sort` | `sort=name:asc,team:desc` |
| `query.filters` | `filter[status]=active&q=mina` |
| page access | `page=3&pageSize=25` |
| window access | `offset=200&limit=80` |
| `expansion.expandedGroupIDs` | `expanded=commerce,platform` |
| source/query revision | cache key 또는 If-Match 계열 header |

comparator와 predicate 문자열의 실제 의미는 source와 서버가 공유하는 응용 프로그램 계약입니다. Tabular가 임의의 locale 비교나 검색 문법을 강제하지 않습니다.

## response envelope 만들기

서버 결과를 바로 controller에 넣지 말고 요청 정보를 다시 포함한 view response로 만듭니다.

```ts
return {
  protocolVersion: request.protocolVersion,
  requestID: request.requestID,
  sourceGeneration: request.sourceGeneration,
  queryRevision: request.queryRevision,
  expansionRevision: request.expansionRevision,
  viewRevision: payload.viewRevision,
  access: request.access,
  matchingLeafCount: { kind: 'known', value: payload.total },
  visibleRowCount: { kind: 'known', value: payload.rows.length },
  rows: payload.rows,
  columnSchema: {
    revision: request.columnSchemaRevision,
    columns: payload.columns,
    headers: payload.headers ?? [],
  },
  removedRowIDs: [],
}
```

이 envelope 덕분에 응답 순서가 뒤바뀌거나 다른 profile/schema의 데이터가 와도 부분적으로 섞이지 않고 원자적으로 거부됩니다.

## loading, empty, error, retry

Tabular는 상태를 제공하지만 그 화면을 그리지 않습니다.

| 상태 | 권장 표현 |
| --- | --- |
| 첫 loading | table 영역의 skeleton 또는 progress |
| 기존 결과가 있는 loading | 결과를 유지하고 toolbar에 작은 progress |
| empty | 현재 query를 설명하고 filter 초기화 동작 제공 |
| error | 마지막 결과를 유지하고 오류 설명과 retry 제공 |
| 취소 | 오류로 표시하지 않고 다음 request를 기다림 |

Vue의 `useDataTable`, `useDataGrid`, `useDataTreeGrid`는 `source`를 직접 받고 반환된 controller가 `status`, `error`, `reload`, `cancel`, `replaceResolver`, `dispose`를 제공합니다. Core와 DOM에서는 응용 프로그램의 `AbortController`와 controller request state로 같은 정책을 구성합니다.

## page와 window

Page는 번호가 있는 화면과 전체 개수가 필요한 목록에 적합합니다. Window는 무한 scroll이나 가상화처럼 offset 주변 범위만 필요할 때 사용합니다. 두 방식 모두 query가 바뀌면 안전한 시작 위치로 reset하고 새 access revision을 발급해야 합니다.

가상화는 source가 아닙니다. 필요한 경우 소비자가 설치한 `@sectile/virtual`이 승인된 visible row의 배치만 맡습니다. 자세한 경계는 [선택적 가상화](./virtual)를 참고하세요.

## 응용 프로그램이 소유하는 것

- fetch/RPC client, 인증, cache와 retry 정책
- loading·empty·error의 문구와 시각 디자인
- optimistic update와 저장 충돌 해결
- comparator·predicate의 서버 의미
- SSR에서 사용할 initial accepted view

Tabular가 소유하는 것은 request 생성, revision 비교, stale 응답 거부, 승인된 view와 typed command입니다. 전체 상태의 의미는 [공통 계약](./contracts)에서 확인할 수 있습니다.
