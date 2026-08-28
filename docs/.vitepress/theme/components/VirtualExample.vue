<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { createSequence } from '@sectile/core/sequence';
import { createExtentIndex, createUniformExtentIndex } from '@sectile/virtual/extent-index';
import { createLinearLayout, queryLinearLayout } from '@sectile/virtual/linear-layout';
import { createMasonryLayout, queryMasonryLayout } from '@sectile/virtual/masonry-layout';
import { createSpatialLayout, querySpatialLayout } from '@sectile/virtual/spatial-layout';
import {
  createDenseTrackGridLayout,
  queryTrackGridLayout,
} from '@sectile/virtual/track-grid-layout';
import type { VirtualLayoutPlan, VirtualPlacement, VirtualRect } from '@sectile/virtual/layout';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';
import { useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import {
  virtualExampleSources,
  type VirtualExampleKind,
} from '../virtual-example-code.js';
import ExampleFrame from './ExampleFrame.vue';

interface ExampleItem {
  readonly id: string;
  readonly size: number;
}

interface SpatialExampleItem extends ExampleItem {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly zIndex: number;
}

interface SpatialLinkSegment {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const props = defineProps<{ kind: VirtualExampleKind }>();
const { host } = useHostPreference();
const { isKorean } = useDocsLocale();
const sources = virtualExampleSources(props.kind);
const maxOverscan = 240;
const overscan = ref('120');
const overscanPixels = computed(() => Number.parseInt(overscan.value, 10));
const observationWidth = 960;
const observationHeight = 980;
const viewportHeight = 360;
const viewportTop = 310;
const viewportInset = 120;
const contentInset = 20;
const scrollLeft = ref(0);
const scrollTop = ref(0);
const stageWidth = ref(observationWidth);
const observationRoot = shallowRef<HTMLElement | null>(null);
let observationResizeObserver: ResizeObserver | undefined;

const listItems: readonly ExampleItem[] = props.kind === 'list'
  ? Object.freeze(Array.from({ length: 50_000 }, (_, index) => Object.freeze({
      id: `ROW ${String(index + 1).padStart(5, '0')}`,
      size: 1 + (index % 3),
    })))
  : Object.freeze([]);

const masonryItems: readonly ExampleItem[] = props.kind === 'masonry'
  ? Object.freeze(Array.from({ length: 30_000 }, (_, index) => Object.freeze({
      id: `CARD ${String(index + 1).padStart(5, '0')}`,
      size: 2 + (index % 5),
    })))
  : Object.freeze([]);

const gridTrackCount = 300;
const gridState = props.kind === 'grid'
  ? createDenseTrackGridLayout(
      createUniformExtentIndex(gridTrackCount, { kind: 'exact', value: 28 }),
      createUniformExtentIndex(gridTrackCount, { kind: 'exact', value: 72 }),
      Array.from({ length: gridTrackCount * gridTrackCount }, (_, index) =>
        `cell-${Math.floor(index / gridTrackCount)}-${index % gridTrackCount}`,
      ),
      { rowGap: 1, columnGap: 1 },
    )
  : null;

const spatialItemCount = 40_000;
const spatialClusterSize = 180;
const spatialClusterColumns = 15;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const spatialItems: readonly SpatialExampleItem[] = props.kind === 'spatial'
  ? Object.freeze(Array.from({ length: spatialItemCount }, (_, index) => {
      const clusterIndex = Math.floor(index / spatialClusterSize);
      const localIndex = index % spatialClusterSize;
      const clusterX = 480 + (clusterIndex % spatialClusterColumns) * 1_000;
      const clusterY = 450 + Math.floor(clusterIndex / spatialClusterColumns) * 800;
      const angle = localIndex * goldenAngle + (clusterIndex % 7) * 0.37;
      const radius = localIndex === 0 ? 0 : 44 + Math.sqrt(localIndex) * 26;
      const width = 72 + (index % 4) * 12;
      const height = 40 + (index % 3) * 8;
      return Object.freeze({
        id: `SERVICE ${String(index + 1).padStart(5, '0')}`,
        x: Math.max(0, Math.round(clusterX + Math.cos(angle) * radius - width / 2)),
        y: Math.max(0, Math.round(clusterY + Math.sin(angle) * radius - height / 2)),
        width,
        height,
        zIndex: localIndex === 0 ? 3 : localIndex % 7 === 0 ? 2 : localIndex % 3 === 0 ? 1 : 0,
        size: index % 3,
      });
    }))
  : Object.freeze([]);

const listState = props.kind === 'list'
  ? createLinearLayout(
      createSequence(listItems.map(item => item.id)),
      createExtentIndex(listItems.map(item => Object.freeze({
        kind: 'exact' as const,
        value: 84 + item.size * 40,
      }))),
      { crossExtent: observationWidth, gap: 8 },
    )
  : null;

const masonryState = props.kind === 'masonry'
  ? createMasonryLayout(
      createSequence(masonryItems.map(item => item.id)),
      createExtentIndex(masonryItems.map(item => Object.freeze({
        kind: 'exact' as const,
        value: 56 + item.size * 12,
      }))),
      {
        laneCount: 8,
        laneExtent: 108,
        laneGap: 8,
        itemGap: 8,
      },
    )
  : null;

const spatialState = props.kind === 'spatial'
  ? createSpatialLayout(spatialItems.map(item => Object.freeze({
      id: item.id,
      rect: Object.freeze({ x: item.x, y: item.y, width: item.width, height: item.height }),
      zIndex: item.zIndex,
    })))
  : null;

const copy = computed(() => isKorean.value ? {
  plan: '현재 조회 결과',
  terminal: '터미널 viewport에 들어온 항목',
  overscan: 'Overscan',
  rowTitles: ['검색 색인 갱신', '결제 내역 검토', '문서 동기화', '접근 권한 변경'],
  rowDetails: [
    '화면에 들어온 실제 콘텐츠의 높이를 측정해 다음 항목의 위치를 갱신합니다.',
    '내용이 여러 줄로 늘어나도 별도의 높이 계산 함수 없이 배치에 반영됩니다.',
    '목록 앞쪽이 바뀌면 현재 읽고 있는 항목을 기준으로 스크롤 위치를 보정합니다.',
  ],
  rowOwners: ['검색 팀', '결제 팀', '문서 팀', '플랫폼 팀'],
  rowStates: ['진행 중', '검토', '완료'],
  counts: {
    list: '50,000개 행 중 현재 화면 주변의 행만 반환',
    grid: '300개 행 × 300개 열 중 현재 화면 주변의 셀만 반환',
    masonry: '30,000개 카드 중 현재 화면 주변의 카드만 반환',
    spatial: '불규칙한 서비스 맵의 40,000개 노드 중 겹치는 노드만 반환',
  },
} : {
  plan: 'Current query result',
  terminal: 'Items inside the terminal viewport',
  overscan: 'Overscan',
  rowTitles: ['Refresh search index', 'Review payment records', 'Sync documents', 'Update access policy'],
  rowDetails: [
    'Measured content updates the position of every item that follows it.',
    'Content can wrap across lines without an application-owned height calculator.',
    'Changes before the viewport preserve the item currently being read.',
  ],
  rowOwners: ['Search team', 'Payments team', 'Docs team', 'Platform team'],
  rowStates: ['Running', 'Review', 'Complete'],
  counts: {
    list: 'Only rows around the viewport are returned from 50,000 rows',
    grid: 'Only nearby cells are returned from 300 rows × 300 columns',
    masonry: 'Only nearby cards are returned from 30,000 cards',
    spatial: 'Only intersecting nodes are returned from an irregular map of 40,000 services',
  },
});

const coreRows = computed(() => {
  const prefix = props.kind === 'list'
    ? 'row'
    : props.kind === 'grid'
      ? 'cell'
      : props.kind === 'masonry'
        ? 'card'
        : 'node';
  const thresholdRows = Math.round(overscanPixels.value / 80);
  return Array.from({ length: 8 + thresholdRows }, (_, index) => `${prefix}-${2_401 + index}`);
});

const overscanOutput = computed(() => host.value === 'terminal'
  ? `${Math.round(overscanPixels.value / 80)} rows`
  : `${overscanPixels.value} px`);

const isTwoDimensional = computed(() => props.kind === 'grid' || props.kind === 'spatial');
const viewportRect = computed<VirtualRect>(() => Object.freeze({
  x: scrollLeft.value + (isTwoDimensional.value ? viewportInset : 0),
  y: scrollTop.value + viewportTop,
  width: isTwoDimensional.value ? Math.max(240, stageWidth.value - viewportInset * 2) : stageWidth.value,
  height: viewportHeight,
}));

const layoutPlan = computed<VirtualLayoutPlan<string>>(() => {
  const input = { viewport: viewportRect.value, overscan: overscanPixels.value };
  if (props.kind === 'list') return queryLinearLayout(listState!, input);
  if (props.kind === 'grid') return queryTrackGridLayout(gridState!, input);
  if (props.kind === 'masonry') return queryMasonryLayout(masonryState!, input);
  return querySpatialLayout(spatialState!, input);
});

const placements = computed(() => layoutPlan.value.placements);
const spatialLinks = computed<readonly SpatialLinkSegment[]>(() => {
  if (props.kind !== 'spatial') return Object.freeze([]);
  const byIndex = new Map(placements.value.map(placement => [placement.index, placement] as const));
  return Object.freeze(placements.value.flatMap((placement) => {
    const localIndex = placement.index % spatialClusterSize;
    if (localIndex === 0) return [];
    const clusterStart = placement.index - localIndex;
    const parentIndex = clusterStart + Math.floor((localIndex - 1) / 3);
    const parent = byIndex.get(parentIndex);
    if (parent === undefined) return [];
    return [Object.freeze({
      id: `${parent.id}-${placement.id}`,
      x1: parent.rect.x + parent.rect.width / 2,
      y1: parent.rect.y + parent.rect.height / 2,
      x2: placement.rect.x + placement.rect.width / 2,
      y2: placement.rect.y + placement.rect.height / 2,
    })];
  }));
});
const localViewportRect = computed<VirtualRect>(() => Object.freeze({
  x: isTwoDimensional.value ? viewportInset : 0,
  y: viewportTop,
  width: isTwoDimensional.value ? Math.max(240, stageWidth.value - viewportInset * 2) : stageWidth.value,
  height: viewportHeight,
}));
const topDimStyle = computed(() => ({ height: `${localViewportRect.value.y}px` }));
const bottomDimStyle = computed(() => ({ top: `${localViewportRect.value.y + localViewportRect.value.height}px` }));
const leftDimStyle = computed(() => ({
  top: `${localViewportRect.value.y}px`,
  width: `${localViewportRect.value.x}px`,
  height: `${localViewportRect.value.height}px`,
}));
const rightDimStyle = computed(() => ({
  top: `${localViewportRect.value.y}px`,
  left: `${localViewportRect.value.x + localViewportRect.value.width}px`,
  height: `${localViewportRect.value.height}px`,
}));
const scrollSpaceStyle = computed(() => ({
  width: `${Math.max(stageWidth.value, layoutPlan.value.contentSize.width)}px`,
  height: `${Math.max(observationHeight, layoutPlan.value.contentSize.height + viewportTop)}px`,
}));
const overlayStyle = computed(() => ({ width: `${stageWidth.value}px` }));

function placementStyle(placement: VirtualPlacement<string>): Readonly<Record<string, string>> {
  if (props.kind === 'list') {
    return Object.freeze({
      left: `${contentInset}px`,
      top: `${placement.rect.y}px`,
      width: `${Math.max(1, stageWidth.value - contentInset * 2)}px`,
      height: `${placement.rect.height}px`,
    });
  }
  return Object.freeze({
    left: `${placement.rect.x}px`,
    top: `${placement.rect.y}px`,
    width: `${placement.rect.width}px`,
    height: `${placement.rect.height}px`,
    zIndex: `${1 + (placement.zIndex ?? 0)}`,
  });
}

function handleScroll(event: Event): void {
  const element = event.currentTarget as HTMLElement;
  scrollLeft.value = element.scrollLeft;
  scrollTop.value = element.scrollTop;
}

onMounted(() => {
  const element = observationRoot.value;
  if (element === null) return;
  const updateWidth = (): void => {
    stageWidth.value = Math.max(1, element.clientWidth);
  };
  updateWidth();
  observationResizeObserver = new ResizeObserver(updateWidth);
  observationResizeObserver.observe(element);
});

onBeforeUnmount(() => {
  observationResizeObserver?.disconnect();
});

function rowTitle(index: number): string {
  return copy.value.rowTitles[index % copy.value.rowTitles.length] ?? '';
}

function rowOwner(index: number): string {
  return copy.value.rowOwners[index % copy.value.rowOwners.length] ?? '';
}

function rowState(index: number): string {
  return copy.value.rowStates[index % copy.value.rowStates.length] ?? '';
}

function rowDetails(item: ExampleItem, index: number): readonly string[] {
  return Array.from({ length: item.size }, (_, offset) =>
    copy.value.rowDetails[(index + offset) % copy.value.rowDetails.length] ?? '',
  );
}

function gridLabel(id: string): string {
  const [, row = '0', column = '0'] = id.split('-');
  return `R${Number(row) + 1} · C${Number(column) + 1}`;
}

</script>

<template>
  <ExampleFrame :sources="sources">
    <template #toolbar>
      <div class="virtual-example-controls">
        <SliderRoot
          v-model="overscan"
          :label="copy.overscan"
          :format-value="value => `${value} px`"
          min="0"
          :max="maxOverscan"
          step="40"
          class="virtual-example-controls__slider"
        >
          <span class="virtual-example-controls__label">{{ copy.overscan }}</span>
          <SliderTrack class="virtual-example-controls__track">
            <SliderRange class="virtual-example-controls__range" />
            <SliderThumb class="virtual-example-controls__thumb" />
          </SliderTrack>
          <output class="virtual-example-controls__value">{{ overscanOutput }}</output>
        </SliderRoot>
      </div>
    </template>

    <div v-if="host === 'core'" class="virtual-simple__plan">
      <strong>{{ copy.plan }}</strong>
      <span>{{ copy.counts[props.kind] }}</span>
      <code v-for="row in coreRows" :key="row">{{ row }}</code>
    </div>

    <div v-else class="virtual-example-stage">
      <div class="virtual-overscan-diagram">
        <div class="virtual-overscan-diagram__observation-shell">
          <div
            ref="observationRoot"
            class="virtual-overscan-diagram__observation"
            @scroll.passive="handleScroll"
          >
            <div class="virtual-overscan-diagram__scroll-space" :style="scrollSpaceStyle">
              <svg
                v-if="props.kind === 'spatial'"
                aria-hidden="true"
                class="virtual-simple__connections"
                :style="scrollSpaceStyle"
              >
                <line
                  v-for="link in spatialLinks"
                  :key="link.id"
                  :x1="link.x1"
                  :y1="link.y1"
                  :x2="link.x2"
                  :y2="link.y2"
                />
              </svg>

              <template v-if="props.kind === 'list'">
                <article
                  v-for="placement in placements"
                  :key="placement.id"
                  class="virtual-simple__row"
                  :style="placementStyle(placement)"
                >
                  <span class="virtual-simple__row-index">{{ String(placement.index + 1).padStart(5, '0') }}</span>
                  <div class="virtual-simple__row-body">
                    <header>
                      <strong>{{ rowTitle(placement.index) }}</strong>
                      <span>{{ rowState(placement.index) }}</span>
                    </header>
                    <p v-for="(detail, detailIndex) in rowDetails(listItems[placement.index]!, placement.index)" :key="detailIndex">
                      {{ detail }}
                    </p>
                    <footer>{{ placement.id }} · {{ rowOwner(placement.index) }}</footer>
                  </div>
                </article>
              </template>

              <template v-else-if="props.kind === 'grid'">
                <div
                  v-for="placement in placements"
                  :key="placement.id"
                  class="virtual-simple__cell"
                  :style="placementStyle(placement)"
                >
                  {{ gridLabel(placement.id) }}
                </div>
              </template>

              <template v-else-if="props.kind === 'masonry'">
                <article
                  v-for="placement in placements"
                  :key="placement.id"
                  class="virtual-simple__card"
                  :style="placementStyle(placement)"
                >
                  <small>{{ placement.id }}</small>
                  <strong>{{ rowTitle(placement.index) }}</strong>
                  <p>{{ copy.rowDetails[placement.index % copy.rowDetails.length] }}</p>
                </article>
              </template>

              <template v-else>
                <article
                  v-for="placement in placements"
                  :key="placement.id"
                  class="virtual-simple__node"
                  :style="placementStyle(placement)"
                >
                  <strong>{{ rowTitle(placement.index) }}</strong>
                  <span>{{ placement.id }} · {{ rowState(placement.index) }}</span>
                </article>
              </template>
            </div>
          </div>

          <div class="virtual-overscan-diagram__overlay" :style="overlayStyle">
            <span aria-hidden="true" class="virtual-overscan-diagram__dim virtual-overscan-diagram__dim--top" :style="topDimStyle" />
            <span aria-hidden="true" class="virtual-overscan-diagram__dim virtual-overscan-diagram__dim--bottom" :style="bottomDimStyle" />
            <span v-if="isTwoDimensional" aria-hidden="true" class="virtual-overscan-diagram__dim virtual-overscan-diagram__dim--left" :style="leftDimStyle" />
            <span v-if="isTwoDimensional" aria-hidden="true" class="virtual-overscan-diagram__dim virtual-overscan-diagram__dim--right" :style="rightDimStyle" />
          </div>
        </div>
      </div>
    </div>

    <template #terminal>
      <div class="virtual-simple__terminal">
        <strong>{{ copy.terminal }}</strong>
        <code v-for="row in coreRows" :key="row">│ {{ row }}</code>
      </div>
    </template>
  </ExampleFrame>
</template>

<style scoped>
.virtual-example-controls {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 20px;
}

.virtual-example-controls__slider {
  display: grid;
  width: clamp(240px, 32vw, 420px);
  grid-template-columns: auto minmax(100px, 1fr) 48px;
  align-items: center;
  gap: 10px;
}

.virtual-example-controls__label,
.virtual-example-controls__value {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.virtual-example-controls__value {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.virtual-example-controls__track {
  position: relative;
  display: block;
  height: 6px;
  border-radius: 999px;
  background: var(--vp-c-divider);
  cursor: pointer;
}

.virtual-example-controls__range {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--sectile-slider-percentage);
  border-radius: inherit;
  background: var(--vp-c-brand-1);
  pointer-events: none;
}

.virtual-example-controls__thumb {
  position: absolute;
  top: 50%;
  left: var(--sectile-slider-percentage);
  display: block;
  width: 16px;
  height: 16px;
  border: 3px solid var(--vp-c-bg-soft);
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 1px 4px rgb(15 23 42 / 0.24);
  cursor: grab;
  transform: translate(-50%, -50%);
}

.virtual-example-controls__thumb:active { cursor: grabbing; }
.virtual-example-controls__thumb:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }

.virtual-example-stage {
  min-width: 0;
  background: var(--sectile-canvas);
}

.virtual-overscan-diagram {
  padding: 16px;
  border-bottom: 1px solid var(--sectile-border-subtle);
  background: var(--sectile-surface);
}

.virtual-overscan-diagram__observation-shell {
  position: relative;
  height: 980px;
  overflow: hidden;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: 10px;
  background: var(--sectile-canvas);
}

.virtual-overscan-diagram__observation {
  position: absolute;
  inset: 0;
  overflow: auto;
  border-radius: inherit;
  scrollbar-color: var(--sectile-border-strong) transparent;
}

.virtual-overscan-diagram__scroll-space {
  position: relative;
  min-width: 100%;
  font-size: 0.92em;
}

.virtual-overscan-diagram__overlay {
  position: absolute;
  z-index: 10;
  top: 0;
  left: 0;
  height: 980px;
  pointer-events: none;
}

.virtual-overscan-diagram__dim {
  position: absolute;
  z-index: 3;
  display: block;
  background: color-mix(in srgb, var(--sectile-content-primary) 7%, transparent);
  pointer-events: none;
}

.virtual-overscan-diagram__dim--top,
.virtual-overscan-diagram__dim--bottom {
  right: 0;
  left: 0;
}

.virtual-overscan-diagram__dim--bottom { bottom: 0; }
.virtual-overscan-diagram__dim--left { left: 0; }
.virtual-overscan-diagram__dim--right { right: 0; }

.virtual-simple__row,
.virtual-simple__cell,
.virtual-simple__card,
.virtual-simple__node {
  position: absolute;
  z-index: 1;
}

.virtual-simple__connections {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.virtual-simple__connections line {
  stroke: var(--sectile-border-control);
  stroke-width: 1;
}

.virtual-simple__row {
  display: grid;
  box-sizing: border-box;
  overflow: hidden;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  padding: 16px 20px;
  border: 1px solid var(--sectile-border-control);
  border-radius: 6px;
  background: var(--sectile-surface);
}

.virtual-simple__row:nth-of-type(even) {
  background: color-mix(in srgb, var(--sectile-content-primary) 2%, var(--sectile-surface));
}

.virtual-simple__row-index {
  padding-top: 2px;
  color: var(--sectile-content-tertiary);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.virtual-simple__row-body {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.virtual-simple__row-body header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.virtual-simple__row-body header strong {
  color: var(--sectile-content-primary);
  font-size: 0.88rem;
}

.virtual-simple__row-body header span {
  flex: 0 0 auto;
  color: var(--vp-c-brand-1);
  font-size: 10px;
  font-weight: 700;
}

.virtual-simple__row-body p {
  max-width: 72ch;
  margin: 0;
  color: var(--sectile-content-secondary);
  font-size: 0.75rem;
  line-height: 1.55;
}

.virtual-simple__row-body footer {
  color: var(--sectile-content-tertiary);
  font-size: 10px;
}

.virtual-simple__cell {
  display: grid;
  box-sizing: border-box;
  place-items: center;
  border: 1px solid var(--sectile-border-control);
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
}

.virtual-simple__card {
  display: grid;
  box-sizing: border-box;
  overflow: hidden;
  align-content: start;
  gap: 4px;
  padding: 9px;
  border: 1px solid var(--sectile-border-control);
  border-radius: 6px;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface);
}

.virtual-simple__card small {
  color: var(--sectile-content-tertiary);
  font-family: var(--vp-font-family-mono);
  font-size: 0.52rem;
}

.virtual-simple__card strong {
  color: var(--sectile-content-primary);
  font-size: 0.66rem;
}

.virtual-simple__card p {
  margin: 0;
  font-size: 0.58rem;
  line-height: 1.35;
}

.virtual-simple__node {
  display: grid;
  box-sizing: border-box;
  overflow: hidden;
  align-content: center;
  justify-items: start;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--sectile-border-control);
  border-radius: 6px;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface);
  box-shadow: 0 4px 12px rgb(20 27 45 / 0.07);
  text-align: start;
}

.virtual-simple__node strong {
  color: var(--sectile-content-primary);
  font-size: 0.58rem;
  white-space: nowrap;
}

.virtual-simple__node span {
  overflow: hidden;
  max-width: 100%;
  color: var(--sectile-content-tertiary);
  font-family: var(--vp-font-family-mono);
  font-size: 0.46rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.virtual-simple__plan,
.virtual-simple__terminal {
  display: grid;
  min-height: 392px;
  box-sizing: border-box;
  align-content: start;
  gap: 8px;
  padding: 24px;
  color: var(--sectile-content-secondary);
  background: var(--sectile-canvas);
}

.virtual-simple__plan strong,
.virtual-simple__terminal strong { color: var(--sectile-content-primary); }
.virtual-simple__plan span { margin-bottom: 8px; }
.virtual-simple__plan code,
.virtual-simple__terminal code { color: var(--sectile-action); }

@media (max-width: 640px) {
  .virtual-example-controls,
  .virtual-example-controls__slider { width: 100%; }
  .virtual-overscan-diagram { padding: 12px; }
  .virtual-overscan-diagram__observation-shell { min-width: 720px; }
  .virtual-simple__plan,
  .virtual-simple__terminal { min-height: 364px; }
  .virtual-simple__row { grid-template-columns: 1fr; gap: 7px; padding: 14px 16px; }
  .virtual-simple__row-index { display: none; }
}
</style>
