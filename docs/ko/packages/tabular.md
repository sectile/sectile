<script setup>
import TabularFeatureMap from '../../.vitepress/theme/components/TabularFeatureMap.vue'
import TabularExample from '../../.vitepress/theme/components/TabularExample.vue'
</script>

# Tabular

`@sectile/tabular`는 표 형식 데이터의 query, 선택, cursor, 편집과 계층 상태를 계산하는 렌더러 독립 core입니다. 화면에는 필요한 상호작용 밀도에 따라 DataTable, DataGrid, DataTreeGrid 중 하나를 사용합니다.

```sh
pnpm add @sectile/tabular
```

## 먼저 profile 선택하기

| 질문 | 선택 |
| --- | --- |
| 행을 읽고 비교하며 정렬·필터·선택하는가? | [DataTable](./tabular/data-table) |
| 모든 셀을 방향키로 이동하고 편집하는가? | [DataGrid](./tabular/data-grid) |
| grid에 부모·자식 branch도 필요한가? | [DataTreeGrid](./tabular/data-tree-grid) |

<TabularFeatureMap />

### DataTable

Native table 의미, 검색·정렬, checkbox 선택과 form 연결이 중심입니다.

<TabularExample kind="table-overview" />

[DataTable의 모든 기능과 예제 →](./tabular/data-table)

### DataGrid

2차원 cursor, roving focus, edit/commit/cancel과 cursor 복구를 더합니다.

<TabularExample kind="grid-overview" />

[DataGrid의 모든 기능과 예제 →](./tabular/data-grid)

### DataTreeGrid

DataGrid에 expansion, level·position metadata와 부모 context를 더합니다.

<TabularExample kind="tree-overview" />

[DataTreeGrid의 모든 기능과 예제 →](./tabular/data-tree-grid)

## 사용할 계층 선택하기

| 필요한 범위 | 설치 | import |
| --- | --- | --- |
| 상태·query·projection 계산 | `@sectile/tabular` | `@sectile/tabular/data-*` |
| 기존 HTML에 연결 | `@sectile/dom @sectile/tabular` | `@sectile/dom/tabular` |
| Vue compound component | `@sectile/vue @sectile/tabular vue` | `@sectile/vue/data-table`, `@sectile/vue/data-grid`, `@sectile/vue/data-tree-grid` |

`@sectile/tabular`는 DOM, Vue, terminal을 알지 않습니다. `@sectile/dom`과 `@sectile/vue`에서는 optional peer dependency이므로 Tabular subpath를 사용할 때만 함께 설치합니다. Tabular에는 terminal host를 제공하지 않습니다.

각 예제의 **코드** 탭은 동일한 기능을 Vue·DOM·Core로 보여줍니다. 먼저 원하는 동작을 확인한 뒤 실제 환경의 코드를 선택하세요.

## 다음으로 읽을 문서

| 하려는 일 | 문서 |
| --- | --- |
| ID, query, selection, revision 이해 | [공통 계약](./tabular/contracts) |
| 서버 정렬·필터·페이지, loading, retry | [비동기 source](./tabular/data-source) |
| 기존 element와 event 연결 | [DOM 연결](./tabular/dom) |
| typed component, Provider, slot, SSR | [Vue 연결](./tabular/vue) |
| 큰 view만 선택적으로 windowing | [가상화](./tabular/virtual) |

## 책임 경계

Tabular는 같은 event와 state에 대해 결정적인 다음 state, projection과 command를 만듭니다. 응용 프로그램은 network, cache, 저장, loading·empty·error UI를 소유합니다. DOM/Vue host는 element, focus, form, 측정과 scroll을 소유합니다. 이 경계는 [공통 계약](./tabular/contracts)과 [비동기 source](./tabular/data-source)에서 실제 동작과 함께 설명합니다.

## 공개 subpath

| 경로 | 책임 |
| --- | --- |
| `/model` | ID, immutable model, controlled ownership, limit |
| `/query` | filter, sort, group, aggregate, pivot descriptor |
| `/source` | request/response, page/window, client source |
| `/data-table` | 읽기 중심 table controller |
| `/data-grid` | 셀 중심 grid controller |
| `/data-tree-grid` | 계층형 grid controller |
| `/virtual` | 소비자가 설치한 `@sectile/virtual`과 조합하는 선택적 adapter |
