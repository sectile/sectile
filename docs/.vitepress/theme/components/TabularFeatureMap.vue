<script setup lang="ts">
import { computed } from 'vue';
import { Check, CircleDot, Minus, Table2, TableCellsSplit, Workflow } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  aria: 'Tabular 프로필 기능 비교',
  title: '같은 데이터 계약, 서로 다른 상호작용 밀도',
  description: '행과 열의 정체성, source revision, query, 선택은 공유하고 화면이 요구하는 탐색 방식에 따라 프로필을 고릅니다.',
  profiles: [
    { id: 'table', name: 'DataTable', summary: '읽고 비교하는 표', icon: Table2 },
    { id: 'grid', name: 'DataGrid', summary: '셀 단위 작업 공간', icon: TableCellsSplit },
    { id: 'tree', name: 'DataTreeGrid', summary: '계층형 작업 공간', icon: Workflow },
  ],
  legend: { full: '기본 제공', intent: '의도·외부 조합', none: '프로필 범위 밖' },
  rows: [
    ['행·열 ID와 source revision', 'full', 'full', 'full'],
    ['정렬·필터·열 상태', 'full', 'full', 'full'],
    ['그룹·집계·pivot projection', 'full', 'full', 'full'],
    ['행 선택과 all-matching 선택', 'full', 'full', 'full'],
    ['native table·form 연결', 'full', 'none', 'none'],
    ['2차원 cursor·roving focus', 'none', 'full', 'full'],
    ['편집 mode·commit·cancel·복구', 'intent', 'full', 'full'],
    ['부모·자식·expansion metadata', 'intent', 'none', 'full'],
    ['loading·empty·error 화면', 'intent', 'intent', 'intent'],
    ['가상화', 'intent', 'intent', 'intent'],
  ],
  note: '가상화와 비동기 화면 정책은 필요한 애플리케이션에서 별도로 조합합니다.',
} : {
  aria: 'Tabular profile capability comparison',
  title: 'One data contract, three interaction densities',
  description: 'The profiles share row and column identity, source revisions, queries, and selection. Choose by the navigation model the surface needs.',
  profiles: [
    { id: 'table', name: 'DataTable', summary: 'A table for reading', icon: Table2 },
    { id: 'grid', name: 'DataGrid', summary: 'A cell workspace', icon: TableCellsSplit },
    { id: 'tree', name: 'DataTreeGrid', summary: 'A hierarchical workspace', icon: Workflow },
  ],
  legend: { full: 'Built in', intent: 'Intent or composition', none: 'Outside profile' },
  rows: [
    ['Row and column IDs, source revisions', 'full', 'full', 'full'],
    ['Sort, filter, and column state', 'full', 'full', 'full'],
    ['Group, aggregate, and pivot projection', 'full', 'full', 'full'],
    ['Row and all-matching selection', 'full', 'full', 'full'],
    ['Native table and form connection', 'full', 'none', 'none'],
    ['2D cursor and roving focus', 'none', 'full', 'full'],
    ['Edit mode, commit, cancel, recovery', 'intent', 'full', 'full'],
    ['Parent-child and expansion metadata', 'intent', 'none', 'full'],
    ['Loading, empty, and error UI', 'intent', 'intent', 'intent'],
    ['Virtualization', 'intent', 'intent', 'intent'],
  ],
  note: 'Virtualization and async presentation policy are composed only by applications that need them.',
});

function iconFor(value: string) {
  if (value === 'full') return Check;
  if (value === 'intent') return CircleDot;
  return Minus;
}
</script>

<template>
  <figure class="tabular-feature-map" :aria-label="copy.aria">
    <header class="tabular-feature-map__heading">
      <div>
        <h2>{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </div>
      <div class="tabular-feature-map__legend" aria-label="Legend">
        <span v-for="(label, kind) in copy.legend" :key="kind" :data-kind="kind">
          <component :is="iconFor(kind)" :size="14" aria-hidden="true" />{{ label }}
        </span>
      </div>
    </header>

    <div class="tabular-feature-map__scroller">
      <div class="tabular-feature-map__matrix">
        <div class="tabular-feature-map__corner" aria-hidden="true" />
        <div v-for="profile in copy.profiles" :key="profile.id" class="tabular-feature-map__profile">
          <component :is="profile.icon" :size="19" aria-hidden="true" />
          <span><strong>{{ profile.name }}</strong><small>{{ profile.summary }}</small></span>
        </div>

        <template v-for="row in copy.rows" :key="row[0]">
          <div class="tabular-feature-map__capability">{{ row[0] }}</div>
          <div v-for="(value, index) in row.slice(1)" :key="index" class="tabular-feature-map__value" :data-kind="value">
            <component :is="iconFor(value)" :size="17" aria-hidden="true" />
            <span class="sr-only">{{ copy.legend[value as keyof typeof copy.legend] }}</span>
          </div>
        </template>
      </div>
    </div>
    <figcaption>{{ copy.note }}</figcaption>
  </figure>
</template>
