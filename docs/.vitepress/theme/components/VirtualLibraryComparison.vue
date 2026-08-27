<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  aria: '가상화 라이브러리의 설계 범위 비교',
  sectile: {
    name: 'Sectile Virtual',
    lead: '가상화를 화면 부품이 아니라 독립적인 배치 상태로 다룹니다.',
    body: '동적 목록, 병합 셀이 있는 격자, 벽돌형 카드, 자유 좌표 화면을 같은 조회·측정·변경 규칙으로 연결합니다. 프레임워크 밖에서 배치를 계산하거나 상태를 저장·복원해야 하는 화면에 맞습니다.',
  },
  alternatives: [
    { name: 'TanStack Virtual', fit: '일반적인 헤드리스 목록과 여러 열', body: '스크롤 요소와 연결하는 Virtualizer를 제공합니다. 예상 크기, DOM 측정, 가로·세로 방향, 여러 열을 폭넓게 다룹니다.', href: 'https://tanstack.com/virtual/latest' },
    { name: 'react-window', fit: '작고 직접적인 React 목록과 격자', body: 'List와 Grid를 짧은 코드로 구성할 때 단순하고 직접적입니다. 화면 구조가 정형적일수록 선택하기 쉽습니다.', href: 'https://github.com/bvaughn/react-window' },
    { name: 'React Virtuoso', fit: '기능이 갖춰진 React 목록·표·메시지 화면', body: '동적 높이와 자동 스크롤 같은 동작을 상위 수준 컴포넌트로 제공합니다. 완성된 목록 동작이 필요한 앱에 잘 맞습니다.', href: 'https://virtuoso.dev/' },
    { name: 'react-virtualized', fit: '오래된 React 앱의 다양한 목록 부품', body: 'List, Grid, Table, Masonry, CellMeasurer 등 넓은 컴포넌트 묶음을 제공합니다.', href: 'https://github.com/bvaughn/react-virtualized' },
    { name: 'Virtua', fit: '여러 프레임워크에서 쓰는 동적 목록', body: 'React, Vue, Svelte, Solid용 컴포넌트를 제공하고 동적 크기 목록을 간결하게 구성합니다.', href: 'https://github.com/inokawa/virtua' },
    { name: 'Vue Virtual Scroller', fit: 'Vue 목록과 격자', body: 'RecycleScroller와 DynamicScroller를 중심으로 Vue 앱의 고정·동적 크기 목록을 구성합니다.', href: 'https://github.com/Akryum/vue-virtual-scroller' },
  ],
} : {
  aria: 'Virtualization library design-scope comparison',
  sectile: {
    name: 'Sectile Virtual',
    lead: 'Virtualization is an independent layout state, not a view component.',
    body: 'Dynamic lists, spanned grids, masonry, and spatial surfaces share query, measurement, and mutation rules. It fits surfaces that calculate layout outside a framework or persist and restore layout state.',
  },
  alternatives: [
    { name: 'TanStack Virtual', fit: 'General headless lists and lanes', body: 'A Virtualizer connected to a scroll element covers estimates, DOM measurement, both axes, and lanes.', href: 'https://tanstack.com/virtual/latest' },
    { name: 'react-window', fit: 'Small, direct React lists and grids', body: 'List and Grid components are concise when the surface follows a conventional list or row-column grid.', href: 'https://github.com/bvaughn/react-window' },
    { name: 'React Virtuoso', fit: 'Feature-complete React lists, tables, and message views', body: 'Higher-level components include dynamic sizing and automatic scrolling behavior.', href: 'https://virtuoso.dev/' },
    { name: 'react-virtualized', fit: 'Broad components in established React applications', body: 'A mature collection including List, Grid, Table, Masonry, and CellMeasurer.', href: 'https://github.com/bvaughn/react-virtualized' },
    { name: 'Virtua', fit: 'Dynamic lists across frameworks', body: 'Compact components for React, Vue, Svelte, and Solid with dynamic-size support.', href: 'https://github.com/inokawa/virtua' },
    { name: 'Vue Virtual Scroller', fit: 'Vue lists and grids', body: 'RecycleScroller and DynamicScroller cover fixed and dynamic Vue collections.', href: 'https://github.com/Akryum/vue-virtual-scroller' },
  ],
});
</script>

<template>
  <section class="virtual-library-comparison" :aria-label="copy.aria">
    <article class="virtual-library-comparison__sectile">
      <header><strong>{{ copy.sectile.name }}</strong><p>{{ copy.sectile.lead }}</p></header>
      <p>{{ copy.sectile.body }}</p>
    </article>
    <article v-for="tool in copy.alternatives" :key="tool.name" class="virtual-library-comparison__alternative">
      <header><a :href="tool.href" target="_blank" rel="noreferrer">{{ tool.name }}</a><strong>{{ tool.fit }}</strong></header>
      <p>{{ tool.body }}</p>
    </article>
  </section>
</template>

<style scoped>
.virtual-library-comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 24px 0 32px;
  overflow: hidden;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: var(--sectile-radius-surface);
  background: var(--sectile-surface);
}

.virtual-library-comparison article { min-width: 0; padding: 20px 24px; }
.virtual-library-comparison article + article { border-top: 1px solid var(--sectile-border-subtle); }
.virtual-library-comparison__sectile { background: var(--sectile-action-subtle); }
.virtual-library-comparison__sectile header { display: grid; gap: 7px; margin-bottom: 9px; }
.virtual-library-comparison__sectile header strong { color: var(--sectile-content-primary); font-size: 1rem; line-height: 1.4; }
.virtual-library-comparison__sectile header p { margin: 0; color: var(--sectile-content-primary); font-size: 0.9rem; font-weight: 680; line-height: 1.6; }
.virtual-library-comparison__sectile > p,
.virtual-library-comparison__alternative > p { margin: 0; color: var(--sectile-content-secondary); font-size: 0.79rem; line-height: 1.7; }
.virtual-library-comparison__alternative header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; margin-bottom: 6px; }
.virtual-library-comparison__alternative a { color: var(--sectile-content-primary); font-size: 0.88rem; font-weight: 750; text-underline-offset: 3px; }
.virtual-library-comparison__alternative header strong { color: var(--sectile-content-tertiary); font-size: 0.72rem; font-weight: 650; }
.virtual-library-comparison a:focus-visible { outline: 2px solid var(--sectile-focus-ring); outline-offset: 3px; border-radius: 2px; }

@media (max-width: 520px) {
  .virtual-library-comparison { margin: 20px 0 28px; }
  .virtual-library-comparison article { padding: 18px 20px; }
  .virtual-library-comparison__alternative header { display: grid; }
}
</style>
