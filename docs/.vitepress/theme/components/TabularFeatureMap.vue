<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Layers3, Plus, Table2, TableCellsSplit, Workflow } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const activeProfileIndex = ref(0);

const copy = computed(() => isKorean.value ? {
  aria: 'Tabular 프로필 선택 안내',
  title: '하나의 데이터 계약에서 시작합니다',
  description: '공통 기능은 그대로 두고, 화면에서 필요한 탐색 단위에 맞춰 상호작용 프로필만 고릅니다.',
  sharedLabel: '모든 프로필의 공통 기반',
  shared: [
    { label: '정체성', detail: 'row · column · cell · group ID' },
    { label: '질의', detail: 'sort · filter · group · aggregate · pivot' },
    { label: '소스', detail: 'request · source · view revision' },
    { label: '선택', detail: 'explicit row · all-matching' },
  ],
  chooseLabel: '탐색 단위 선택', selectedLabel: '선택한 프로필', ownsLabel: '이 프로필이 책임지는 기능', fitLabel: '잘 맞는 화면', boundaryLabel: '경계',
  profiles: [
    { id: 'table', name: 'DataTable', summary: '행을 읽고 비교하는 표', icon: Table2, fit: '디렉터리 · 보고서 · 검색 결과', owns: ['native table과 form 의미', '정렬·필터·행 선택', '그룹 행 펼치기', '편집 commit 의도'], boundary: '2차원 셀 커서와 편집 모드는 소유하지 않습니다.' },
    { id: 'grid', name: 'DataGrid', summary: '셀 단위 작업 공간', icon: TableCellsSplit, fit: '재고표 · 권한 매트릭스 · 인라인 편집기', owns: ['2차원 커서와 roving focus', '탐색·편집 모드 전환', 'commit·cancel과 검증', '행·열 제거 뒤 포커스 복구'], boundary: '계층 행을 해석하거나 native table 의미를 대신하지 않습니다.' },
    { id: 'tree', name: 'DataTreeGrid', summary: '계층형 셀 작업 공간', icon: Workflow, fit: '서비스 소유권 · 파일 목록 · 계층 재고', owns: ['부모·자식과 expansion', 'level·position·context metadata', 'grid 탐색과 leaf 편집', '접기·제거 뒤 포커스 복구'], boundary: '그룹 셀은 읽기 전용이며 leaf가 선택과 편집의 대상입니다.' },
  ],
  externalLabel: '필요할 때 바깥에서 조합', external: ['loading · empty · error · retry', '가상화 · 측정 · scroll'],
} : {
  aria: 'Tabular profile selection guide',
  title: 'Start from one data contract',
  description: 'Keep shared capabilities intact, then choose the interaction profile that matches how the surface is navigated.',
  sharedLabel: 'Shared by every profile',
  shared: [
    { label: 'Identity', detail: 'row · column · cell · group ID' },
    { label: 'Query', detail: 'sort · filter · group · aggregate · pivot' },
    { label: 'Source', detail: 'request · source · view revision' },
    { label: 'Selection', detail: 'explicit row · all-matching' },
  ],
  chooseLabel: 'Choose a navigation unit', selectedLabel: 'Selected profile', ownsLabel: 'Owned by this profile', fitLabel: 'Best suited to', boundaryLabel: 'Boundary',
  profiles: [
    { id: 'table', name: 'DataTable', summary: 'Read and compare rows', icon: Table2, fit: 'Directories · reports · search results', owns: ['Native table and form semantics', 'Sort, filter, and row selection', 'Group-row disclosure', 'Edit commit intent'], boundary: 'It does not own a two-dimensional cell cursor or edit mode.' },
    { id: 'grid', name: 'DataGrid', summary: 'Work one cell at a time', icon: TableCellsSplit, fit: 'Inventory · permission matrices · inline editors', owns: ['2D cursor and roving focus', 'Navigation and edit modes', 'Commit, cancel, and validation', 'Focus recovery after row or column removal'], boundary: 'It does not interpret hierarchy or replace native table semantics.' },
    { id: 'tree', name: 'DataTreeGrid', summary: 'Work through hierarchical cells', icon: Workflow, fit: 'Service ownership · file lists · hierarchical inventory', owns: ['Parent-child relationships and expansion', 'Level, position, and context metadata', 'Grid navigation and leaf editing', 'Focus recovery after collapse or removal'], boundary: 'Group cells are read-only; leaves are the selection and editing targets.' },
  ],
  externalLabel: 'Compose outside when needed', external: ['Loading · empty · error · retry', 'Virtualization · measurement · scroll'],
});

const activeProfile = computed(() => copy.value.profiles[activeProfileIndex.value]!);
</script>

<template>
  <figure class="tabular-feature-map" :aria-label="copy.aria">
    <header class="tabular-feature-map__heading">
      <h2>{{ copy.title }}</h2>
      <p>{{ copy.description }}</p>
    </header>

    <section class="tabular-feature-map__shared">
      <div class="tabular-feature-map__section-label"><Layers3 :size="17" aria-hidden="true" /><strong>{{ copy.sharedLabel }}</strong></div>
      <dl><div v-for="item in copy.shared" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.detail }}</dd></div></dl>
    </section>

    <div class="tabular-feature-map__chooser">
      <span class="tabular-feature-map__eyebrow">{{ copy.chooseLabel }}</span>
      <div class="tabular-feature-map__profile-options">
        <button v-for="(profile, index) in copy.profiles" :key="profile.id" type="button" :aria-pressed="activeProfileIndex === index" @click="activeProfileIndex = index">
          <component :is="profile.icon" :size="17" aria-hidden="true" /><span><strong>{{ profile.name }}</strong><small>{{ profile.summary }}</small></span>
        </button>
      </div>
    </div>

    <section class="tabular-feature-map__detail" :aria-labelledby="`tabular-profile-${activeProfile.id}`">
      <header><span class="tabular-feature-map__profile-icon"><component :is="activeProfile.icon" :size="21" aria-hidden="true" /></span><div><span>{{ copy.selectedLabel }}</span><h3 :id="`tabular-profile-${activeProfile.id}`">{{ activeProfile.name }}</h3><p>{{ activeProfile.summary }}</p></div></header>
      <div class="tabular-feature-map__profile-content">
        <div><strong class="tabular-feature-map__eyebrow">{{ copy.ownsLabel }}</strong><ul><li v-for="feature in activeProfile.owns" :key="feature"><Check :size="15" aria-hidden="true" />{{ feature }}</li></ul></div>
        <aside><span class="tabular-feature-map__eyebrow">{{ copy.fitLabel }}</span><strong>{{ activeProfile.fit }}</strong><span class="tabular-feature-map__eyebrow">{{ copy.boundaryLabel }}</span><p>{{ activeProfile.boundary }}</p></aside>
      </div>
    </section>

    <figcaption><strong><Plus :size="15" aria-hidden="true" />{{ copy.externalLabel }}</strong><span v-for="item in copy.external" :key="item">{{ item }}</span></figcaption>
  </figure>
</template>
