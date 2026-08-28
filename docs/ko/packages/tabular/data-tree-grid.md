<script setup>
import TabularExample from '../../../.vitepress/theme/components/TabularExample.vue'
</script>

# DataTreeGrid

DataTreeGrid는 DataGrid의 셀 cursor·편집에 부모와 자식 행을 더한 계층형 작업 공간입니다. 서비스 소유권, 파일형 재고, 조직별 권한처럼 **부모 context를 유지한 채 leaf 셀을 작업**해야 할 때 사용합니다.

<TabularExample kind="tree-overview" />

## branch를 접고 펼치기

Group 행의 disclosure를 누르면 expansion state가 바뀌고 source에 새 view를 요청합니다. Tabular는 임의의 자식 배열을 DOM에서 숨기지 않습니다. source가 현재 expansion에 맞는 평평한 visible row 목록과 계층 metadata를 반환합니다.

<TabularExample kind="tree-hierarchy" />

각 행은 `level`, `positionInSet`, `setSize`, parent/group ID를 가질 수 있습니다. 필터 결과의 부모는 실제 결과가 아니더라도 자식의 위치를 설명하기 위한 `contextOnly` 행으로 남을 수 있습니다. 이 행은 탐색 context이지만 선택·편집 대상은 아닙니다.

## leaf 행을 선택하기

Checkbox 선택은 leaf에만 적용됩니다. Shift 범위는 화면에 보이는 leaf 순서를 사용하므로 group 행과 접힌 descendant를 건너뜁니다. Header의 전체 선택은 현재 query revision에 맞는 모든 leaf를 나타냅니다.

<TabularExample kind="tree-selection" />

Group 단위 선택이 필요하면 `BulkSelectionControl`에 group-leaves target을 전달합니다. 실제 descendant ID를 모두 열거하지 않고 source가 계산할 수 있는 선택 의도를 저장합니다.

## 이동, 편집과 복구

방향키 이동과 edit mode는 DataGrid와 같습니다. Left/Right는 제품 규칙에 따라 열 이동 또는 branch 접기/펼치기로 연결할 수 있습니다. branch를 접어 cursor나 editor가 숨겨지면 가까운 visible cell이나 해당 group 행으로 복구합니다.

편집 commit은 command일 뿐이며 서버 저장은 응용 프로그램이 맡습니다. 저장이나 expansion 뒤 새 view가 오면 request·source·view revision을 검사한 뒤 한 번에 승인합니다.

## 정렬과 필터에서 부모 context 유지하기

정렬·필터 descriptor는 서버로 그대로 보낼 수 있습니다. 서버는 조건에 맞는 leaf뿐 아니라 탐색에 필요한 조상을 `contextOnly`로 포함합니다. 그래서 사용자는 결과가 어느 branch에 속하는지 잃지 않습니다.

[비동기 source](./data-source)는 request 변환, loading, 오류, stale response 거부를 실제 UI로 보여줍니다.

## 큰 treegrid

Tabular는 visible row의 계층 의미를 계산하지만 scroll이나 DOM 측정을 하지 않습니다. 큰 treegrid가 실제 병목일 때만 `@sectile/virtual`을 설치해 projection의 visible row를 virtual item으로 [조합](./virtual)하세요.

## 공개 part 빠르게 찾기

| 목적 | Vue part | 핵심 상태/동작 |
| --- | --- | --- |
| treegrid 경계 | `Root` | cursor, edit mode, tree metadata |
| 계층 행 | `Body`, `Row`, `Cell` | level, position, contextOnly |
| 펼침 | `RowDisclosure` | expansion query와 새 request |
| 선택 | `RowSelectionControl`, `BulkSelectionControl` | visible leaf range, group leaves |
| 편집 | `Editor` | leaf cell commit/cancel/restore |
| 열 | `ColumnHeader`, `ColumnResizeHandle` | query와 host size |

Core는 `@sectile/tabular/data-tree-grid`, DOM과 Vue는 `@sectile/dom/tabular`, `@sectile/vue/tabular`에서 import합니다.
