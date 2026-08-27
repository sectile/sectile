<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import {
  AppWindow,
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Rows3,
  SquareTerminal,
  TableProperties,
  Workflow,
} from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  aria: 'Sectile 패키지 책임 경계',
  semanticLayer: '의미 계층',
  semanticSummary: '환경과 무관한 상태와 계산',
  core: '상호작용',
  coreRole: '사용자의 입력을 다음 상태와 실행 명령으로 바꿉니다.',
  coreExamples: ['현재 항목', '선택', '편집', '명령'],
  temporal: '날짜와 시각',
  temporalRole: '달력 날짜와 하루 안의 시각을 계산하고 선택 규칙을 적용합니다.',
  temporalExamples: ['날짜 입력란', '달력', '선택기'],
  tabular: '표 형식 데이터',
  tabularRole: '행과 열의 정체성, 데이터 접근, 선택과 편집 규칙을 계산합니다.',
  tabularExamples: ['테이블', '그리드', '트리 그리드'],
  virtual: '큰 화면의 배치',
  virtualRole: '항목의 크기와 위치를 관리하고 화면 영역에 맞는 배치를 계산합니다.',
  virtualExamples: ['목록', '격자', '카드 모음', '자유 좌표'],
  boundary: '공개 API로 결과를 전달',
  hostLayer: '실행 환경 계층',
  hostSummary: '입력, 출력, 수명 주기에 연결',
  domRole: '이벤트, 포커스, 스크롤, 크기 측정',
  terminalRole: '키 입력, 커서 이동, 문자 폭, 텍스트 출력',
  vueRole: '반응형 상태, 슬롯, 컴포넌트 수명 주기',
} : {
  aria: 'Sectile package responsibility boundaries',
  semanticLayer: 'Semantic layer',
  semanticSummary: 'State and computation without a host dependency',
  core: 'Interaction',
  coreRole: 'Turns user input into the next state and executable commands.',
  coreExamples: ['current item', 'selection', 'editing', 'commands'],
  temporal: 'Dates and time',
  temporalRole: 'Computes civil dates, wall-clock time, and selection rules.',
  temporalExamples: ['date fields', 'calendars', 'pickers'],
  tabular: 'Tabular data',
  tabularRole: 'Computes row and column identity, data access, selection, and editing rules.',
  tabularExamples: ['tables', 'grids', 'tree grids'],
  virtual: 'Large-surface layout',
  virtualRole: 'Tracks item geometry and computes placements for the visible viewport.',
  virtualExamples: ['lists', 'grids', 'masonry', 'spatial'],
  boundary: 'Results cross through public APIs',
  hostLayer: 'Host layer',
  hostSummary: 'Connects input, output, and lifecycle',
  domRole: 'events, focus, scrolling, and measurement',
  terminalRole: 'keys, cursor movement, character width, and text output',
  vueRole: 'reactive state, slots, and component lifecycle',
});

const packageRoot = computed(() => isKorean.value ? '/ko/packages' : '/packages');

const domains = computed(() => [
  {
    id: 'core',
    packageName: '@sectile/core',
    name: copy.value.core,
    role: copy.value.coreRole,
    examples: copy.value.coreExamples,
    icon: Workflow,
  },
  {
    id: 'temporal',
    packageName: '@sectile/temporal',
    name: copy.value.temporal,
    role: copy.value.temporalRole,
    examples: copy.value.temporalExamples,
    icon: CalendarDays,
  },
  {
    id: 'tabular',
    packageName: '@sectile/tabular',
    name: copy.value.tabular,
    role: copy.value.tabularRole,
    examples: copy.value.tabularExamples,
    icon: TableProperties,
  },
  {
    id: 'virtual',
    packageName: '@sectile/virtual',
    name: copy.value.virtual,
    role: copy.value.virtualRole,
    examples: copy.value.virtualExamples,
    icon: Rows3,
  },
].map((domain) => ({
  ...domain,
  href: withBase(`${packageRoot.value}/${domain.id}`),
})));

const adapters = computed(() => [
  {
    id: 'dom',
    packageName: '@sectile/dom',
    role: copy.value.domRole,
    icon: AppWindow,
  },
  {
    id: 'terminal',
    packageName: '@sectile/terminal',
    role: copy.value.terminalRole,
    icon: SquareTerminal,
  },
  {
    id: 'vue',
    packageName: '@sectile/vue',
    role: copy.value.vueRole,
    icon: Workflow,
  },
].map((adapter) => ({
  ...adapter,
  href: withBase(`${packageRoot.value}/${adapter.id}`),
})));
</script>

<template>
  <figure class="package-boundary" :aria-label="copy.aria">
    <header class="package-boundary__layer-heading">
      <strong>{{ copy.semanticLayer }}</strong>
      <span>{{ copy.semanticSummary }}</span>
    </header>

    <div class="package-boundary__domains">
      <a
        v-for="domain in domains"
        :key="domain.id"
        :class="['package-boundary__domain', `package-boundary__domain--${domain.id}`]"
        :href="domain.href"
      >
        <span class="package-boundary__icon" aria-hidden="true">
          <component :is="domain.icon" :size="20" />
        </span>
        <span class="package-boundary__domain-copy">
          <span class="package-boundary__package">
            <code>{{ domain.packageName }}</code>
            <ArrowUpRight :size="15" aria-hidden="true" />
          </span>
          <strong>{{ domain.name }}</strong>
          <span class="package-boundary__role">{{ domain.role }}</span>
          <span class="package-boundary__capabilities">
            <span v-for="example in domain.examples" :key="example">{{ example }}</span>
          </span>
        </span>
      </a>
    </div>

    <figcaption class="package-boundary__bridge">
      <span aria-hidden="true" />
      <strong><ArrowDown :size="15" aria-hidden="true" />{{ copy.boundary }}</strong>
      <span aria-hidden="true" />
    </figcaption>

    <section class="package-boundary__host-layer">
      <header class="package-boundary__layer-heading">
        <strong>{{ copy.hostLayer }}</strong>
        <span>{{ copy.hostSummary }}</span>
      </header>
      <div class="package-boundary__adapters">
        <a v-for="adapter in adapters" :key="adapter.id" :href="adapter.href">
          <span class="package-boundary__adapter-icon" aria-hidden="true">
            <component :is="adapter.icon" :size="19" />
          </span>
          <span>
            <strong>{{ adapter.packageName }}</strong>
            <span>{{ adapter.role }}</span>
          </span>
          <ArrowUpRight :size="15" aria-hidden="true" />
        </a>
      </div>
    </section>
  </figure>
</template>
