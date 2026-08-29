<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# DataTable

DataTable은 행을 읽고 비교하는 표입니다. 디렉터리, 검색 결과, 감사 기록처럼 **native table 의미와 행 단위 선택**이 중요한 화면에 사용합니다. 모든 셀을 방향키로 이동하고 편집해야 한다면 [DataGrid](./data-grid)를 선택하세요.

<TabularExample kind="table-overview" />

예제의 **코드** 탭에서는 같은 화면을 Vue compound component, 기존 HTML에 연결하는 DOM API, 렌더러가 없는 Core API로 전환해 볼 수 있습니다.

## 검색하고 정렬하기

열 제목을 반복해서 누르면 오름차순, 내림차순, 정렬 해제를 순환합니다. 검색어와 정렬 상태는 현재 DOM을 직접 바꾸는 대신 하나의 query를 만들고 source에 새 view를 요청합니다. 따라서 같은 UI를 메모리 배열과 서버 데이터에 모두 사용할 수 있습니다.

<TabularExample kind="table-query" />

- `SortTrigger`는 `column`과 comparator를 query에 기록합니다.
- `FilterControl`은 전체 검색 또는 특정 열의 filter를 기록합니다.
- 로컬 source는 query를 메모리에서 계산하고, 원격 source는 그대로 HTTP/RPC 요청으로 옮깁니다.

서버 요청, 취소, 실패, 재시도까지 포함한 흐름은 [비동기 source](./data-source)에서 직접 확인할 수 있습니다.

## 행과 검색 결과 전체 선택하기

개별 checkbox, Shift 범위, 현재 query에 맞는 모든 행 선택을 같은 선택 계약으로 다룹니다. 헤더 checkbox는 선택 없음, 일부 선택, 전체 선택을 각각 false, mixed, true 상태로 표시합니다.

<TabularExample kind="table-selection" />

`SelectionControl`은 현재 Body 행을 자동으로 상속합니다. `BulkSelectionControl`의 `all-matching`은 아직 내려받지 않은 모든 ID를 저장하지 않고 query revision과 제외 행만 저장합니다. native form으로 전송할 때는 `name`을 지정하고, 행 ID와 다른 값이 필요할 때만 `value`를 지정합니다.

## 여러 단계 header와 편집 의도

Header row에 `depth`를 직접 지정하지 않습니다. leaf header는 `column`, 여러 열을 묶는 header만 `header`로 schema node를 연결합니다. Tabular가 depth, colspan, rowspan과 접근성 metadata를 계산합니다.

<TabularExample kind="table-structure" />

`Editor`는 값을 저장하지 않습니다. native input에서 commit 의도를 typed command로 전달하며, 검증·저장·optimistic update는 응용 프로그램이 결정합니다. 셀 cursor와 edit mode가 중심이면 DataGrid가 더 적합합니다.

## 열 표시, 고정과 크기

열 순서·숨김·start/end pinning은 공유할 수 있는 semantic state입니다. 픽셀 너비는 DOM/Vue host 상태입니다. 이 구분 덕분에 Core는 플랫폼에 종속되지 않으면서도 각 화면은 실제 측정값을 사용할 수 있습니다.

<TabularExample kind="table-columns" />

`ColumnResizeHandle`은 pointer와 keyboard 입력을 모두 받고 min/max 범위를 지킵니다. 열 표시와 고정은 controller의 `columnState`를 변경하므로 저장하거나 controlled state로 소유할 수 있습니다.

## 데이터를 연결하고 상태 화면 만들기

`useDataTable({ source })`가 request를 실행하고 반환된 controller가 `status`, `error`, `reload`, `cancel`을 제공합니다. spinner, empty 화면, 오류 문구, retry 버튼은 제품마다 달라서 Tabular가 시각 디자인을 정하지 않습니다. 대신 이전에 승인된 view를 유지한 채 새 request 상태를 별도로 노출합니다.

| 상황 | 사용할 값 |
| --- | --- |
| 첫 요청 중 | `status === 'loading'`이고 accepted view가 없음 |
| 새 정렬을 요청 중 | 이전 `rows`는 유지되고 request만 pending |
| 결과 없음 | 승인된 view의 `rows.length === 0` |
| 실패와 재시도 | `error`, `reload()` |

자세한 구현은 [비동기 source](./data-source)를 참고하세요.

## Vue에서 row 타입 유지하기

`createDataTableComponents(table)`가 source response schema와 결합된 component namespace를 만듭니다. 그래서 Body slot의 `row.cells`는 `rows[].cells`에서 추론된 타입을 유지하고, Cell은 상위 Body의 row ID를 자동으로 사용합니다.

```vue
<DataTable.Body v-slot="{ row }">
  <DataTable.Cell column="name">{{ row.cells.name }}</DataTable.Cell>
  <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
</DataTable.Body>
```

일반적인 렌더링에서는 Body가 행 반복을 맡습니다. virtual window 같은 저수준 구성이 필요할 때만 `<DataTable.Body manual>`과 `DataTable.Row`를 직접 사용합니다.

## 공개 part 빠르게 찾기

| 목적 | Vue part | DOM/Core 대응 |
| --- | --- | --- |
| 표와 이름 | `Root`, `Caption` | native table / controller projection |
| header | `Header`, `HeaderRow`, `ColumnHeader` | header attributes / schema |
| query | `SortTrigger`, `FilterControl` | bind 함수 / `set-query` event |
| 행 렌더링 | `Body`, `Row`, `Cell` | element 등록 / projection rows |
| 선택 | `SelectionControl`, `BulkSelectionControl` | checkbox binding / selection event |
| 그룹 | `Disclosure` | disclosure binding / expansion event |
| 편집 | `Editor` | editor binding / commit command |
| 열 크기 | `ColumnResizeHandle` | resize binding / host size state |

설치와 import 경로는 [Vue 연결](./vue), [DOM 연결](./dom), 전체 상태 형태는 [공통 계약](./contracts)에서 확인할 수 있습니다.
