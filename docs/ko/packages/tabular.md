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

## 사용할 계층 선택

| 필요한 범위 | 설치 | 사용하는 API |
| --- | --- | --- |
| 상태·query·projection만 계산 | `@sectile/tabular` | `createDataTable`, `createDataGrid`, `createDataTreeGrid` |
| framework 없이 HTML에 연결 | `@sectile/dom` + `@sectile/tabular` | `@sectile/dom/tabular`: `createData*`, `connectData*`, element 등록과 `bind*` |
| Vue component로 구성 | `@sectile/vue @sectile/tabular vue` | `@sectile/vue/tabular`의 `useData*`, `createData*Components`, `useData*Source` |

`@sectile/tabular`가 renderer-neutral한 Tabular core입니다. `@sectile/dom`과 `@sectile/vue`는 같은 controller를 소비하는 선택적 host 계층이며, core를 사용하기 위해 Vue를 설치할 필요가 없습니다.

<TabularFeatureMap />

## 기능을 찾는 순서

| 필요한 작업 | 문서 |
| --- | --- |
| column schema, query, page/window, 선택, 열 상태, controlled state | [공통 계약과 기능](./tabular/contracts) |
| 서버 정렬·필터·페이지네이션, 취소, stale, error, retry | [비동기 source](./tabular/data-source) |
| framework 없이 element 등록과 event/focus/form 연결 | [DOM 연결](./tabular/dom) |
| typed compound component, Provider, slot, SSR | [Vue 구성](./tabular/vue) |
| 큰 view를 raw Virtual과 조합 | [선택적 가상화](./tabular/virtual) |

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

## Tabular가 맡는 일

Tabular는 표를 직접 그리는 컴포넌트가 아닙니다. DataTable, DataGrid, DataTreeGrid가 같은 방식으로 동작하도록 상태와 규칙을 계산하는 엔진입니다.

- 각 행과 열을 안정된 ID로 구분합니다.
- 정렬, 필터, 그룹, 집계, 피벗 조건을 하나의 조회 상태로 관리합니다.
- 현재 페이지나 화면 범위에 필요한 데이터를 데이터 소스에 요청하고, 늦게 도착한 이전 응답은 거부합니다.
- 화면에 불러온 행만 선택하거나, 아직 불러오지 않은 행까지 포함해 검색 결과 전체를 선택할 수 있습니다.
- 조회 조건, 선택, 열 배치, 접근 범위, 펼침 상태를 Tabular 내부에서 관리하거나 응용 프로그램 상태에 연결할 수 있습니다.
- ID 충돌, 다른 종류의 데이터, 설정한 제한을 넘는 결과는 기존 상태를 바꾸지 않고 오류로 돌려줍니다.

사용자 입력이 들어오면 Tabular는 다음 상태와 실행할 명령을 계산합니다. 같은 입력과 상태에서는 항상 같은 결과가 나오며, 서버 요청이나 화면 갱신 같은 작업은 계산이 끝난 뒤 응용 프로그램이 실행합니다. 자세한 ID, 변경 순서, 오류 처리 규칙은 [공통 계약과 기능](./tabular/contracts)에서 확인할 수 있습니다.

정렬과 필터는 메모리에 있는 배열에 바로 적용할 수도 있고, 같은 조회 조건을 서버로 보내 새 페이지나 화면 범위를 받아올 수도 있습니다. 데이터가 어디에서 오는지만 달라질 뿐 컴포넌트 구성과 선택·커서 동작은 그대로 유지됩니다.

## 응용 프로그램이 맡는 일

응용 프로그램은 데이터를 실제로 가져오고 그 결과를 화면에 보여줍니다.

- 서버 요청, 취소, 재시도, 캐시, 낙관적 업데이트 같은 데이터 처리 방식을 정합니다.
- 로딩, 빈 결과, 오류 상태에서 로딩 표시, 빈 화면, 오류 안내 중 무엇을 보여줄지 정합니다.
- DOM 또는 Vue로 표를 그리고, 크기 측정과 스크롤을 처리합니다.
- 많은 행을 가상화해야 할 때만 `@sectile/virtual`을 설치해 조합합니다. 일반적인 크기의 테이블이나 그리드에는 필요하지 않습니다.

`useData*Source`는 요청 상태, 취소, 다시 불러오기, 오류를 다루는 데 필요한 값을 제공합니다. 어떤 UI를 보여줄지는 정하지 않으므로, 응용 프로그램의 기존 컴포넌트와 화면 정책을 그대로 사용할 수 있습니다.

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

직접 DOM에 연결할 때는 `@sectile/dom`과 `@sectile/tabular`를 함께 설치하고 `@sectile/dom/tabular`에서 host API를 가져옵니다. Vue에서는 `@sectile/tabular`를 함께 설치하고 `@sectile/vue/tabular`에서 composable, Provider, compound part와 injected context를 가져옵니다. Tabular를 사용하지 않는 소비자에게 `@sectile/tabular`는 선택적 의존성입니다. [DOM 구성](./tabular/dom), [Vue 구성](./tabular/vue), [선택적 가상화](./tabular/virtual)도 참고하세요.
