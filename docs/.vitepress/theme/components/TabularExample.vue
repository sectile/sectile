<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';
import { tabularExampleSources, type TabularExampleKind } from '../tabular-example-code.js';
import TabularContractDemo from './TabularContractDemo.vue';
import TabularDataGridDemo from './TabularDataGridDemo.vue';
import TabularDataTableDemo from './TabularDataTableDemo.vue';
import TabularDataTreeGridDemo from './TabularDataTreeGridDemo.vue';
import TabularExampleFrame from './TabularExampleFrame.vue';
import TabularRemoteDataDemo from './TabularRemoteDataDemo.vue';

const props = defineProps<{ kind: TabularExampleKind }>();
const { isKorean } = useDocsLocale();
const sources = computed(() => tabularExampleSources(props.kind));

const copy = computed(() => {
  const ko = {
    'table-overview': ['읽고 비교하는 표', '검색·정렬·선택을 직접 사용하고 같은 UI의 구현을 환경별로 확인합니다.'],
    'table-query': ['정렬과 필터', '열 제목과 검색을 조작한 뒤 query가 새 view를 만드는 과정을 확인합니다.'],
    'table-selection': ['범위와 전체 결과 선택', '행을 선택하고 Shift로 범위를 넓히거나 검색 결과 전체를 선택합니다.'],
    'table-structure': ['계층 header와 편집 의도', '중첩 header가 계산한 span과 native input의 commit 의도를 확인합니다.'],
    'table-columns': ['열 크기와 표시 상태', 'resize handle과 semantic column state가 서로 다른 책임을 갖는 방식을 확인합니다.'],
    'grid-overview': ['셀 단위 작업 공간', '2차원 cursor와 편집 가능한 셀을 실제 grid에서 사용합니다.'],
    'grid-navigation': ['이동과 focus 복구', '방향키로 이동하고 데이터 변경 뒤에도 결정적으로 복구되는 cursor를 확인합니다.'],
    'grid-editing': ['편집·commit·cancel', 'Enter로 편집하고 값을 확정하거나 Escape로 취소합니다.'],
    'grid-selection': ['cursor와 독립된 행 선택', '셀 focus를 유지한 채 checkbox로 행을 선택하고 Shift 범위를 적용합니다.'],
    'tree-overview': ['계층형 작업 공간', '부모 context와 leaf 셀을 같은 treegrid에서 탐색합니다.'],
    'tree-hierarchy': ['펼침과 context-only 행', 'branch를 접고 펼치며 부모 context가 view에 남는 방식을 확인합니다.'],
    'tree-selection': ['보이는 leaf 범위 선택', 'Shift 범위가 group 행과 접힌 descendant를 건너뛰는지 확인합니다.'],
    'remote-source': ['서버 정렬·필터·페이지', '요청 문자열, loading, 실패, 기존 결과 보존과 retry를 한 흐름에서 확인합니다.'],
    contracts: ['공통 상태 계약', '이벤트가 state와 command를 만들고 오래된 응답이 원자적으로 거부되는 과정을 확인합니다.'],
  } as const;
  const en = {
    'table-overview': ['A table for reading and comparison', 'Use search, sorting, and selection, then inspect the same UI by host.'],
    'table-query': ['Sorting and filtering', 'Change a heading or search value and observe a new query-backed view.'],
    'table-selection': ['Range and all-matching selection', 'Select rows, extend a range with Shift, or select every matching result.'],
    'table-structure': ['Header hierarchy and edit intent', 'Inspect calculated header spans and native input commit intent.'],
    'table-columns': ['Column size and visibility', 'See how resize handles and semantic column state keep separate responsibilities.'],
    'grid-overview': ['A cell-oriented workspace', 'Use a two-dimensional cursor and editable cells in a real grid.'],
    'grid-navigation': ['Navigation and focus recovery', 'Move with arrow keys and observe deterministic cursor recovery after data changes.'],
    'grid-editing': ['Edit, commit, and cancel', 'Press Enter to edit, then commit the value or cancel with Escape.'],
    'grid-selection': ['Row selection independent from the cursor', 'Keep cell focus while selecting rows and extending a Shift range.'],
    'tree-overview': ['A hierarchical workspace', 'Navigate parent context and leaf cells in one treegrid.'],
    'tree-hierarchy': ['Expansion and context-only rows', 'Collapse branches and see how parent context remains in the view.'],
    'tree-selection': ['Visible leaf range selection', 'Verify that Shift ranges skip group rows and collapsed descendants.'],
    'remote-source': ['Server sorting, filtering, and paging', 'Inspect requests, loading, failure, stale-data preservation, and retry.'],
    contracts: ['Shared state contract', 'See events produce state and commands while stale responses are rejected atomically.'],
  } as const;
  const [title, description] = (isKorean.value ? ko : en)[props.kind];
  return { title, description };
});

const tableFocus = computed(() => props.kind.replace('table-', '') as 'overview' | 'query' | 'selection' | 'structure' | 'columns');
const gridFocus = computed(() => props.kind.replace('grid-', '') as 'overview' | 'navigation' | 'editing' | 'selection');
const treeFocus = computed(() => props.kind.replace('tree-', '') as 'overview' | 'hierarchy' | 'selection');
</script>

<template>
  <TabularExampleFrame :sources="sources" :title="copy.title" :description="copy.description">
    <TabularDataTableDemo v-if="kind.startsWith('table-')" :focus="tableFocus" />
    <TabularDataGridDemo v-else-if="kind.startsWith('grid-')" :focus="gridFocus" />
    <TabularDataTreeGridDemo v-else-if="kind.startsWith('tree-')" :focus="treeFocus" />
    <TabularRemoteDataDemo v-else-if="kind === 'remote-source'" />
    <TabularContractDemo v-else />
  </TabularExampleFrame>
</template>
