<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# DataGrid

DataGrid는 셀이 작업 대상인 2차원 작업 공간입니다. 방향키 이동, roving focus, 셀 편집과 복구가 필요할 때 사용합니다. 행을 읽고 선택하는 일이 중심이라면 [DataTable](./data-table)이 더 단순하고 적합합니다.

<TabularExample kind="grid-overview" />

## keyboard로 셀 이동하기

한 번에 한 셀만 tab 순서에 들어갑니다. 방향키는 cursor를 이동하고, Home/End는 행 경계로, PageUp/PageDown은 access window 기준으로 이동합니다. 화면 밖 셀로 이동할 때 Core는 focus를 직접 실행하지 않고 reveal/focus command를 host에 보냅니다.

<TabularExample kind="grid-navigation" />

현재 행이나 열이 새 view에서 사라지면 cursor는 같은 열의 가까운 행, 같은 행의 가까운 열, 첫 focusable cell 순으로 복구됩니다. 이 규칙은 Core·DOM·Vue에서 같습니다.

## 편집하고 확정하거나 취소하기

Enter 또는 입력 동작으로 navigation mode에서 edit mode로 들어갑니다. commit은 typed command를 만들고, Escape는 원래 값과 cursor를 복구합니다. 저장 성공 여부와 validation 문구는 응용 프로그램이 결정합니다.

<TabularExample kind="grid-editing" />

- `Editor`는 native input, select, textarea를 사용할 수 있습니다.
- parser는 wire value를 만들거나 구조화된 오류를 반환합니다.
- 저장 중 새 view가 도착해도 editor 복구 규칙이 결정적으로 적용됩니다.
- 저장 성공 뒤 source를 reload하거나 optimistic view를 동기화합니다.

## cursor와 별도로 행 선택하기

셀 cursor는 “어디에서 작업하는가”, 행 선택은 “어떤 레코드에 일괄 작업하는가”를 나타냅니다. 두 상태는 독립적이며 checkbox의 Shift 범위 선택도 사용할 수 있습니다.

<TabularExample kind="grid-selection" />

범위는 현재 보이는 leaf 행 순서를 사용합니다. 정렬이나 필터가 바뀐 뒤에는 새 view 순서가 기준이며, group/context 행은 선택 대상에서 제외됩니다.

## 정렬, 필터와 서버 데이터

DataGrid도 DataTable과 같은 query와 source 계약을 사용합니다. 정렬 버튼이나 filter control은 현재 셀 DOM을 재배열하지 않고 새 request를 만듭니다. 서버는 query와 page/window를 처리해 response envelope를 반환합니다.

[비동기 source 예제](./data-source)에서 loading 중 기존 결과 유지, 요청 취소, stale 응답 거부, retry를 직접 확인하세요.

## 열과 큰 데이터

열 순서·숨김·pinning은 controller state이고 픽셀 크기와 scroll은 host state입니다. 보통 규모의 grid에는 가상화가 필요하지 않습니다. 정말 큰 화면에서만 소비자가 설치한 `@sectile/virtual`을 [별도로 조합](./virtual)합니다.

## 공개 part 빠르게 찾기

| 목적 | Vue part | 핵심 상태/동작 |
| --- | --- | --- |
| grid 경계 | `Root` | cursor, edit mode, command boundary |
| header | `Header`, `HeaderRow`, `ColumnHeader` | query와 열 metadata |
| 셀 | `Body`, `Row`, `Cell` | roving tabindex, active cell |
| 편집 | `Editor` | begin, commit, cancel, restore |
| 행 선택 | `RowSelectionControl`, `BulkSelectionControl` | explicit/range/all-matching |
| 열 크기 | `ColumnResizeHandle` | host size state |

Core는 `@sectile/tabular/data-grid`, DOM과 Vue는 각각 `@sectile/dom/tabular`, `@sectile/vue/data-grid`에서 import합니다. 자세한 연결 방식은 [DOM](./dom)과 [Vue](./vue)를 참고하세요.
