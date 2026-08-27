<script setup>
import TabularFeatureMap from '../../.vitepress/theme/components/TabularFeatureMap.vue'
import TabularDataTableDemo from '../../.vitepress/theme/components/TabularDataTableDemo.vue'
import TabularDataGridDemo from '../../.vitepress/theme/components/TabularDataGridDemo.vue'
import TabularDataTreeGridDemo from '../../.vitepress/theme/components/TabularDataTreeGridDemo.vue'
</script>

# Tabular

`@sectile/tabular`는 데이터가 많은 table과 grid를 위한 렌더러 독립 계약입니다. 행·열의 정체성, query와 source revision, 선택, 그룹·집계·pivot projection, cursor와 편집 의도를 결정적으로 계산하고, 실제 표현은 실행 환경에 맡깁니다.

```sh
pnpm add @sectile/tabular
```

<TabularFeatureMap />

## DataTable

행을 읽고 비교하고 정렬·필터·선택하는 일이 중심이면 DataTable을 사용합니다. native table과 form 의미를 유지하며, grouped disclosure와 편집 commit 의도도 표현할 수 있지만 화면을 spreadsheet로 만들지는 않습니다.

<TabularDataTableDemo />

[DataTable 구성하기 →](./tabular/data-table)

## DataGrid

모든 셀이 작업 대상이면 DataGrid를 사용합니다. 2차원 cursor, roving focus, 행·셀 선택, navigation/edit mode, commit·cancel, 데이터가 사라졌을 때의 결정적 복구를 더합니다.

<TabularDataGridDemo />

[DataGrid 구성하기 →](./tabular/data-grid)

## DataTreeGrid

grid 탐색과 부모·자식 행이 함께 필요하면 DataTreeGrid를 사용합니다. expansion, level·position metadata, context-only ancestor, group leaf 선택, collapse·removal 뒤 cursor와 editor 복구를 더합니다.

<TabularDataTreeGridDemo />

[DataTreeGrid 구성하기 →](./tabular/data-tree-grid)

## 패키지가 책임지는 것

세 프로필은 다음 bounded contract를 공유합니다.

- 안정된 row·column·cell·group·header ID
- 정규화된 sort·filter·group·aggregate·pivot descriptor
- request·source·query·expansion·access·view revision
- 아직 불러오지 않은 행을 열거하지 않는 explicit-row와 all-matching 선택
- query·selection·column·access·expansion의 controlled/uncontrolled 소유권
- stale response, ID 충돌, profile 불일치, limit 위반의 원자적 거부

모든 변경은 typed event로 들어가며 결정적인 state, projection, command 목록 또는 구조화된 실패를 반환합니다. 정책 함수와 transport는 reducer 밖에서 실행됩니다.

## 응용 프로그램이 책임지는 것

loading, empty, error, retry, cache, suspense, optimistic update와 transport는 표현·응용 프로그램 정책입니다. `useData*Source`가 status, 취소, reload, error를 제공하더라도 Tabular가 spinner나 오류 화면을 정하지는 않습니다.

DOM 측정, scroll, rendering 역시 host 책임입니다. 가상화는 소비자가 설치한 `@sectile/virtual`과 별도로 조합하며, 보통 규모의 table이나 grid에는 포함되지 않습니다.

## 공개 subpath

| 경로 | 책임 |
| --- | --- |
| `@sectile/tabular` | 공통 type과 error. runtime export 없음 |
| `/model` | ID, codec, 불변 model, controlled ownership, limit |
| `/query` | filter, sort, group, aggregate, pivot descriptor |
| `/source` | request/response envelope, page/window access, deletion delta, client source |
| `/data-table` | 읽기 중심 table controller와 reducer |
| `/data-grid` | 평면 application grid controller와 reducer |
| `/data-tree-grid` | 계층형 application grid controller와 reducer |
| `/virtual` | Tabular projection을 Virtual 전략에 잇는 선택적 adapter |

직접 DOM 연결은 `@sectile/dom/data-*`, Vue에서는 `@sectile/vue/data-*`의 composable, Provider, compound part와 injected context를 사용합니다. Vue 응용 프로그램은 `@sectile/vue`와 `vue`만 설치하면 됩니다. [Vue 구성](./tabular/vue)과 [선택적 가상화](./tabular/virtual)도 참고하세요.
