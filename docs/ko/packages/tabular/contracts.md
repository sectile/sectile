<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# 공통 계약

DataTable, DataGrid, DataTreeGrid는 화면의 상호작용 밀도는 다르지만 데이터의 정체성, query, 선택, 열 상태, request 승인 규칙은 공유합니다. 이 공통 계약 덕분에 profile이나 renderer를 바꿔도 데이터와 상태 소유권을 다시 설계하지 않아도 됩니다.

<TabularExample kind="contracts" />

버튼을 눌러 request, 선택, 오래된 응답 거부를 확인해 보세요. Core는 event를 받아 다음 state와 host가 실행할 command를 결정할 뿐, DOM이나 network를 직접 만지지 않습니다.

## ID는 화면이 아니라 데이터의 정체성입니다

행·열·셀·group·header에는 안정된 ID가 필요합니다. 정렬이나 page 이동으로 위치가 바뀌어도 같은 데이터는 같은 ID를 가져야 선택과 cursor가 유지됩니다. 한 view 안의 중복 ID는 어떤 행을 가리키는지 결정할 수 없으므로 전체 응답이 거부됩니다.

## query는 “어떤 결과가 필요한가”를 설명합니다

query에는 sort, filter, group, aggregate, pivot descriptor가 들어갑니다. descriptor는 함수가 아니라 직렬화 가능한 key와 값이므로 로컬 source와 서버 source가 같은 요청을 해석할 수 있습니다.

- client source: 메모리 배열에 comparator와 predicate를 적용
- remote source: descriptor를 HTTP/RPC 규격으로 변환
- controller: 둘을 구분하지 않고 새 view를 기다림

실제 서버 흐름은 [비동기 source](./data-source)에서 확인하세요.

## 선택은 두 종류가 있습니다

`explicit` 선택은 불러온 특정 row ID를 저장합니다. `all-matching` 선택은 현재 query에 맞는 모든 행을 뜻하며, 아직 불러오지 않은 ID 대신 query revision과 제외 ID를 저장합니다. Group leaf 선택도 같은 방식으로 source가 해석할 수 있는 의도를 보존합니다.

Checkbox의 Shift 범위는 현재 visible leaf 순서를 사용합니다. 전체 query 선택과 달리 아직 화면에 없는 행까지 범위로 추측하지 않습니다.

## page와 window는 데이터 접근 방식입니다

Page는 페이지 번호와 전체 개수를, window는 offset과 필요한 범위를 표현합니다. 둘 다 렌더링 방법이 아니라 source request의 일부입니다. Virtual은 window 결과를 화면에 배치할 수 있지만 access state를 대신 소유하지 않습니다.

## 열 state와 host state를 나눕니다

열 순서·숨김·pinning은 플랫폼과 무관한 `columnState`입니다. 픽셀 너비, DOM 측정, scroll 위치는 host state입니다. 전자는 Core에서 계산하고 저장할 수 있으며 후자는 DOM/Vue가 실제 element에 적용합니다.

## controlled와 uncontrolled 소유권

query, selection, column, access, expansion은 내부 기본값으로 사용할 수도 있고 응용 프로그램이 controlled state로 소유할 수도 있습니다. Controlled 값은 change callback에서 승인한 값을 다시 전달해야 하며, controller가 외부 값을 몰래 덮어쓰지 않습니다.

## revision은 늦은 응답을 막습니다

각 request와 view는 source·query·access·expansion revision을 포함합니다. 응답이 현재 pending request와 맞지 않으면 부분 반영하지 않고 통째로 거부합니다. 그래서 빠르게 filter를 바꾸거나 page를 이동해도 늦게 도착한 이전 결과가 화면을 되돌리지 않습니다.

구조화된 실패는 원인을 구분합니다.

| 실패 | 의미 |
| --- | --- |
| stale response | 더 최신 request가 이미 존재함 |
| duplicate ID | 하나의 view에 같은 정체성이 두 번 존재함 |
| profile mismatch | table request에 grid view가 도착함 |
| schema/revision mismatch | 요청한 열 또는 상태 기준과 응답이 다름 |
| limit violation | 합의한 행·열·depth 한도를 초과함 |

## profile 선택

| 필요한 상호작용 | 선택 |
| --- | --- |
| native table, 행 읽기·정렬·선택 | [DataTable](./data-table) |
| 2차원 cursor와 셀 편집 | [DataGrid](./data-grid) |
| grid 탐색과 부모·자식 행 | [DataTreeGrid](./data-tree-grid) |

loading·empty·error의 시각 표현, transport, cache, optimistic update, DOM 측정과 가상화는 응용 프로그램/host 책임입니다. Tabular는 그 화면을 만들 수 있는 상태와 결정적인 명령을 제공합니다.
