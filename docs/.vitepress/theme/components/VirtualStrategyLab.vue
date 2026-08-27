<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RotateCcw } from '@lucide/vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group';
import { ToolbarItem, ToolbarRoot } from '@sectile/vue/toolbar';
import type { VirtualPlacement } from '@sectile/virtual/layout';
import { useDocsLocale } from '../locale.js';
import {
  queryExplorerStrategy,
  explorerItemCounts,
  type ExplorerStrategy,
} from '../../../examples/virtual/strategy-explorer.js';

interface StrategyDetail {
  readonly title: string;
  readonly summary: string;
  readonly calculates: string;
  readonly receives: string;
  readonly suitable: string;
}

const root = ref<HTMLElement | null>(null);
const strategyValue = ref<readonly string[]>(['linear']);
const overscanValue = ref('160');
const laneCountValue = ref('4');
const viewport = ref({ x: 0, y: 0, width: 620, height: 420 });
const { isKorean } = useDocsLocale();
let observer: ResizeObserver | undefined;

const copy = computed(() => isKorean.value ? {
  aria: '가상화 배치 방식 비교', strategies: '배치 계산 방식', linear: '목록', grid: '행·열 격자',
  masonry: '벽돌형 카드', spatial: '자유 좌표', overscan: '화면 밖 조회 범위', lanes: '카드 열 수',
  overscanHelp: '화면보다 넓게 조회할 거리를 정합니다. 빠르게 스크롤할 때 다음 항목을 미리 준비하는 범위입니다.',
  reset: '처음 위치', queried: '조회 범위 안', visible: '실제로 보임', total: '전체 데이터', content: '전체 배치 크기',
  calculates: 'Sectile이 계산', receives: '앱이 제공', suitable: '잘 맞는 화면',
  note: '네 방식은 좌표를 맡는 범위가 다릅니다. 자유 좌표는 앱이 정한 사각형을 빠르게 찾고, 목록·격자·벽돌형은 순서와 크기에서 좌표까지 계산합니다.',
} : {
  aria: 'Virtual layout strategy comparison', strategies: 'Layout calculation', linear: 'List', grid: 'Row-column grid',
  masonry: 'Masonry cards', spatial: 'Free coordinates', overscan: 'Offscreen query range', lanes: 'Card columns',
  overscanHelp: 'Extends the query beyond the viewport so the next items are ready during fast scrolling.',
  reset: 'Start position', queried: 'In query range', visible: 'Actually visible', total: 'Total data', content: 'Full layout size',
  calculates: 'Sectile calculates', receives: 'Application provides', suitable: 'Best suited for',
  note: 'Free-coordinate virtualization is not a superset of the other strategies. It searches rectangles positioned by the application; list, grid, and masonry calculate positions from order and size.',
});

const details = computed<Readonly<Record<ExplorerStrategy, StrategyDetail>>>(() => isKorean.value ? {
  linear: {
    title: '순서와 높이로 세로 위치 계산',
    summary: '앞 항목의 높이가 바뀌면 뒤 항목의 위치를 다시 잇고, 사용자가 읽던 기준 항목의 화면 위치를 지킵니다.',
    calculates: '각 행의 세로 좌표, 전체 높이, 기준 항목 보정',
    receives: '안정적인 ID, 항목 순서, 예상값 또는 측정한 높이',
    suitable: '활동 기록, 메시지, 검색 결과처럼 순서가 중요한 긴 목록',
  },
  'track-grid': {
    title: '행과 열을 조합해 셀 영역 계산',
    summary: '행 높이와 열 너비를 따로 관리하고, 여러 칸을 차지하는 영역도 필요한 구간에서만 찾습니다.',
    calculates: '행·열 누적 위치, 셀과 병합 영역의 사각형',
    receives: '행 높이, 열 너비, 각 영역의 행·열과 차지하는 칸 수',
    suitable: '일정표, 데이터 표, 악보처럼 행과 열의 뜻이 분명한 화면',
  },
  masonry: {
    title: '카드를 열에 나누고 다음 위치 계산',
    summary: '높이가 다른 카드를 가장 짧은 열이나 정해진 순서의 열에 놓고, 열 수가 바뀌면 전체 배치를 다시 맞춥니다.',
    calculates: '카드가 들어갈 열, 세로 좌표, 전체 높이',
    receives: '카드 순서, 예상값 또는 측정한 카드 높이',
    suitable: '상품 탐색, 이미지 모음, 자료 보관함처럼 카드 높이가 다른 화면',
  },
  spatial: {
    title: '앱이 정한 사각형 가운데 화면과 겹치는 항목 조회',
    summary: '각 항목의 좌표와 크기를 그대로 받아 넓은 공간에서 현재 화면과 겹치는 사각형을 빠르게 찾습니다.',
    calculates: '화면과 조회 범위의 교차 결과, 겹친 항목의 그리기 순서',
    receives: '각 항목의 x·y 좌표, 너비·높이, 필요한 경우 z-index',
    suitable: '다이어그램, 지도 주석, 자유 배치 편집기처럼 좌표를 앱이 이미 가진 화면',
  },
} : {
  linear: {
    title: 'Calculate vertical positions from order and height',
    summary: 'When an earlier item changes height, later positions are reconnected while the reading anchor stays in place.',
    calculates: 'Row offsets, total height, and anchor correction',
    receives: 'Stable IDs, item order, and estimated or measured heights',
    suitable: 'Activity, messages, and long ordered search results',
  },
  'track-grid': {
    title: 'Combine row and column tracks into cell regions',
    summary: 'Rows and columns stay independent, and spanning regions are queried only where needed.',
    calculates: 'Track offsets and rectangles for cells and spans',
    receives: 'Row heights, column widths, and region spans',
    suitable: 'Schedules, data tables, and other track-based surfaces',
  },
  masonry: {
    title: 'Assign cards to lanes and calculate their next positions',
    summary: 'Variable-height cards fill the shortest or next lane, and the layout adapts when the lane count changes.',
    calculates: 'Lane assignment, card offsets, and total height',
    receives: 'Card order and estimated or measured card heights',
    suitable: 'Product discovery, media libraries, and mixed-height cards',
  },
  spatial: {
    title: 'Query application-positioned rectangles',
    summary: 'The application supplies each rectangle; Sectile quickly finds the ones intersecting the viewport.',
    calculates: 'Viewport intersections and paint order for overlaps',
    receives: 'x, y, width, height, and optional z-index for every item',
    suitable: 'Diagrams, map annotations, and freeform editors',
  },
});

const options = computed<readonly { value: ExplorerStrategy; label: string }[]>(() => [
  { value: 'linear', label: copy.value.linear },
  { value: 'track-grid', label: copy.value.grid },
  { value: 'masonry', label: copy.value.masonry },
  { value: 'spatial', label: copy.value.spatial },
]);
const strategy = computed<ExplorerStrategy>(() => {
  const value = strategyValue.value[0];
  return value === 'linear' || value === 'track-grid' || value === 'masonry' || value === 'spatial' ? value : 'linear';
});
const detail = computed(() => details.value[strategy.value]);
const overscan = computed(() => Number(overscanValue.value));
const laneCount = computed(() => Number(laneCountValue.value));
const plan = computed(() => queryExplorerStrategy(strategy.value, viewport.value, overscan.value, laneCount.value));
const visibleCount = computed(() => plan.value.placements.filter(({ visible }) => visible).length);
const totalCount = computed(() => explorerItemCounts[strategy.value]);

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry === undefined) return;
    viewport.value = { ...viewport.value, width: entry.contentRect.width, height: entry.contentRect.height };
  });
  if (root.value !== null) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());
watch(strategyValue, async () => {
  await nextTick();
  reset();
});

function onScroll(event: Event) {
  const element = event.currentTarget as HTMLElement;
  viewport.value = { ...viewport.value, x: element.scrollLeft, y: element.scrollTop };
}

function reset() {
  if (root.value !== null) root.value.scrollTo({ left: 0, top: 0 });
  viewport.value = { ...viewport.value, x: 0, y: 0 };
}

function numericParts(id: string): readonly number[] {
  return [...id.matchAll(/\d+/g)].map(([value]) => Number(value));
}

function placementLabel(id: string): string {
  const parts = numericParts(id);
  if (strategy.value === 'track-grid') return `R${String((parts[0] ?? 0) + 1).padStart(4, '0')} · C${String((parts[1] ?? 0) + 1).padStart(2, '0')}`;
  const number = String((parts[0] ?? 0) + 1).padStart(6, '0');
  if (strategy.value === 'linear') return `LOG-${number}`;
  if (strategy.value === 'masonry') return `ASSET-${number}`;
  return `NODE-${number}`;
}

function placementTitle(id: string): string {
  const number = numericParts(id).at(-1) ?? 0;
  if (!isKorean.value) {
    if (strategy.value === 'linear') return ['Order approved', 'Inventory updated', 'Delivery delayed', 'Payout reviewed'][number % 4] ?? 'Activity';
    if (strategy.value === 'track-grid') return `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][number % 5]} ${9 + number % 9}:00`;
    if (strategy.value === 'masonry') return ['Research note', 'Campaign asset', 'Product brief', 'Customer quote'][number % 4] ?? 'Library card';
    return ['Source', 'Transform', 'Review', 'Publish'][number % 4] ?? 'Canvas node';
  }
  if (strategy.value === 'linear') return ['주문 승인', '재고 수량 변경', '배송 일정 변경', '정산 검토'][number % 4] ?? '활동 기록';
  if (strategy.value === 'track-grid') return `${['월', '화', '수', '목', '금'][number % 5] ?? '월'}요일 ${9 + number % 9}:00`;
  if (strategy.value === 'masonry') return ['조사 메모', '캠페인 자료', '상품 기획서', '고객 의견'][number % 4] ?? '자료 카드';
  return ['원본', '변환', '검토', '배포'][number % 4] ?? '작업 노드';
}

function placementMeta(id: string): string {
  const number = numericParts(id).at(-1) ?? 0;
  if (!isKorean.value) return strategy.value === 'spatial' ? `${2 + number % 7} links` : `${1 + number % 12} fields`;
  return strategy.value === 'spatial' ? `연결 ${2 + number % 7}개` : `정보 ${1 + number % 12}개`;
}

function placementZIndex(placement: VirtualPlacement): number | undefined {
  return 'zIndex' in placement && typeof placement['zIndex'] === 'number' ? placement['zIndex'] : undefined;
}
</script>

<template>
  <section class="strategy-lab ds-product" :aria-label="copy.aria">
    <header class="strategy-lab__toolbar">
      <div class="ds-field strategy-lab__strategy-field">
        <span>{{ copy.strategies }}</span>
        <ToggleGroupRoot v-model="strategyValue" :items="options.map(({ value }) => value)" :deselectable="false" class="ds-segmented strategy-lab__switcher" :label="copy.strategies">
          <ToggleGroupItem v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</ToggleGroupItem>
        </ToggleGroupRoot>
      </div>
      <div class="ds-field ds-field--slider strategy-lab__range-field">
        <span>{{ copy.overscan }} <output>{{ overscan }}px</output></span>
        <SliderRoot v-model="overscanValue" min="0" max="640" step="80" :label="copy.overscan" class="ds-slider">
          <SliderTrack class="ds-slider__track"><SliderRange class="ds-slider__range" /><SliderThumb class="ds-slider__thumb" /></SliderTrack>
        </SliderRoot>
        <small>{{ copy.overscanHelp }}</small>
      </div>
      <div v-if="strategy === 'masonry'" class="ds-field ds-field--slider strategy-lab__lane-field">
        <span>{{ copy.lanes }} <output>{{ laneCount }}</output></span>
        <SliderRoot v-model="laneCountValue" min="2" max="5" step="1" :label="copy.lanes" class="ds-slider" @update:model-value="reset">
          <SliderTrack class="ds-slider__track"><SliderRange class="ds-slider__range" /><SliderThumb class="ds-slider__thumb" /></SliderTrack>
        </SliderRoot>
      </div>
      <ToolbarRoot :items="['reset']" class="ds-toolbar strategy-lab__reset" :label="copy.reset" @invoke="reset">
        <ToolbarItem value="reset"><RotateCcw :size="16" aria-hidden="true" />{{ copy.reset }}</ToolbarItem>
      </ToolbarRoot>
    </header>

    <div class="strategy-lab__explanation">
      <div>
        <strong>{{ detail.title }}</strong>
        <p>{{ detail.summary }}</p>
      </div>
      <dl>
        <div><dt>{{ copy.calculates }}</dt><dd>{{ detail.calculates }}</dd></div>
        <div><dt>{{ copy.receives }}</dt><dd>{{ detail.receives }}</dd></div>
        <div><dt>{{ copy.suitable }}</dt><dd>{{ detail.suitable }}</dd></div>
      </dl>
    </div>

    <div class="strategy-lab__stats" aria-live="polite">
      <span><strong>{{ totalCount.toLocaleString() }}</strong>{{ copy.total }}</span>
      <span><strong>{{ plan.placements.length }}</strong>{{ copy.queried }}</span>
      <span><strong>{{ visibleCount }}</strong>{{ copy.visible }}</span>
      <span><strong>{{ Math.round(plan.contentSize.width).toLocaleString() }} × {{ Math.round(plan.contentSize.height).toLocaleString() }}</strong>{{ copy.content }}</span>
    </div>

    <div ref="root" class="strategy-lab__viewport" @scroll.passive="onScroll">
      <div
        class="strategy-lab__content"
        :style="{ width: `${Math.max(plan.contentSize.width, viewport.width)}px`, height: `${Math.max(plan.contentSize.height, viewport.height)}px` }"
      >
        <div
          v-for="placement in plan.placements"
          :key="placement.id"
          class="strategy-lab__item"
          :class="[`strategy-lab__item--${strategy}`, { 'strategy-lab__item--visible': placement.visible }]"
          :style="{
            width: `${placement.rect.width}px`,
            height: `${placement.rect.height}px`,
            transform: `translate3d(${placement.rect.x}px, ${placement.rect.y}px, 0)`,
            zIndex: placementZIndex(placement),
          }"
        >
          <i aria-hidden="true" />
          <span>
            <strong>{{ placementTitle(placement.id) }}</strong>
            <small>{{ placementLabel(placement.id) }} · {{ placementMeta(placement.id) }}</small>
          </span>
        </div>
      </div>
    </div>
    <p class="strategy-lab__note">{{ copy.note }}</p>
  </section>
</template>
