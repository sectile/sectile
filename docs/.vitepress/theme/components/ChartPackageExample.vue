<script setup lang="ts">
import type { ChartModel } from '@sectile/chart/model';
import { ChartCanvas, ChartRoot } from '@sectile/vue/chart';
import { Activity, BarChart3, ChartNoAxesCombined, CircleDot, Grid3X3 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import {
  chartExampleSources,
  type ChartExampleHost,
  type ChartExampleKind,
} from '../chart-example-code.js';
import { useDocsLocale } from '../locale.js';
import ExampleFrame from './ExampleFrame.vue';

const props = withDefaults(defineProps<{
  kind?: ChartExampleKind;
  host?: ChartExampleHost;
}>(), { host: 'vue' });

const { isKorean } = useDocsLocale();
const selectedKind = ref<ChartExampleKind>(props.kind ?? 'line');
watch(() => props.kind, (kind) => {
  if (kind !== undefined) selectedKind.value = kind;
});

const chartKinds = ['line', 'scatter', 'bar', 'heatmap', 'donut'] as const;
const copy = computed(() => isKorean.value ? {
  labels: { line: '선', scatter: '산점도', bar: '막대', heatmap: '히트맵', donut: '도넛' },
  title: {
    line: '월별 매출 흐름', scatter: '배포 빈도와 안정성', bar: '요일별 주문량', heatmap: '시간대별 활동', donut: '유입 채널 비중',
  },
  description: {
    line: '순서가 있는 값의 변화를 하나의 선으로 표시합니다.',
    scatter: '두 값의 관계를 개별 점으로 비교합니다.',
    bar: '범주별 크기를 같은 기준선에서 비교합니다.',
    heatmap: '행과 열에 놓인 관측값을 셀로 표시합니다.',
    donut: '전체에서 각 항목이 차지하는 비중을 원형 구간으로 표시합니다.',
  },
  active: '가리킨 항목', selected: '선택한 항목', none: '없음', separator: '구간 구분선',
  help: '마크를 가리키거나 선택하세요. 방향키로 항목을 이동하고, 휠로 이동하며, Ctrl/⌘+휠로 확대할 수 있습니다.',
  selector: '차트 종류', chart: '인터랙티브 차트 예시',
} : {
  labels: { line: 'Line', scatter: 'Scatter', bar: 'Bar', heatmap: 'Heatmap', donut: 'Donut' },
  title: {
    line: 'Monthly revenue trend', scatter: 'Deployment frequency and stability', bar: 'Orders by weekday', heatmap: 'Activity by time', donut: 'Acquisition channels',
  },
  description: {
    line: 'Show change across ordered values as a continuous line.',
    scatter: 'Compare the relationship between two values as individual points.',
    bar: 'Compare category magnitudes from a common baseline.',
    heatmap: 'Place observations into rows and columns as cells.',
    donut: 'Show each category as a share of the whole.',
  },
  active: 'Hovered datum', selected: 'Selected datum', none: 'None', separator: 'Slice separator',
  help: 'Hover or select a mark. Use arrow keys to move between data, the wheel to pan, and Ctrl/⌘+wheel to zoom.',
  selector: 'Chart type', chart: 'Interactive chart example',
});

const models: Readonly<Record<ChartExampleKind, ChartModel<string>>> = Object.freeze({
  line: { layers: [{ id: 'revenue', profile: 'ordered-series', data: [
    { id: 'jan', x: 1, y: 32 }, { id: 'feb', x: 2, y: 41 }, { id: 'mar', x: 3, y: 38 },
    { id: 'apr', x: 4, y: 54 }, { id: 'may', x: 5, y: 61 }, { id: 'jun', x: 6, y: 73 },
  ] }] },
  scatter: { layers: [{ id: 'deployments', profile: 'point', data: [
    { id: 'api', x: 18, y: 82 }, { id: 'worker', x: 28, y: 66 }, { id: 'web', x: 42, y: 74 },
    { id: 'billing', x: 51, y: 48 }, { id: 'search', x: 67, y: 57 }, { id: 'analytics', x: 79, y: 31 },
    { id: 'edge', x: 87, y: 46 }, { id: 'storage', x: 35, y: 39 }, { id: 'identity', x: 60, y: 78 },
  ] }] },
  bar: { layers: [{ id: 'orders', profile: 'cartesian-segment', data: [
    { id: 'mon', x1: 0, y1: 0, x2: 0.72, y2: 48 }, { id: 'tue', x1: 1, y1: 0, x2: 1.72, y2: 64 },
    { id: 'wed', x1: 2, y1: 0, x2: 2.72, y2: 52 }, { id: 'thu', x1: 3, y1: 0, x2: 3.72, y2: 79 },
    { id: 'fri', x1: 4, y1: 0, x2: 4.72, y2: 71 },
  ] }] },
  heatmap: { layers: [{ id: 'activity', profile: 'grid-cell', data: Array.from({ length: 35 }, (_, index) => ({
    id: `${index % 7}-${Math.floor(index / 7)}`,
    column: index % 7,
    row: Math.floor(index / 7),
    value: ((index * 7) % 11) + 1,
  })).filter((_, index) => index % 6 !== 0) }] },
  donut: { layers: [{ id: 'channels', profile: 'radial-segment', data: [
    { id: 'direct', value: 42, innerRadius: 0.5, outerRadius: 0.82 },
    { id: 'gap-1', value: 1, innerRadius: 0, outerRadius: 0 },
    { id: 'search', value: 31, innerRadius: 0.5, outerRadius: 0.82 },
    { id: 'gap-2', value: 1, innerRadius: 0, outerRadius: 0 },
    { id: 'referral', value: 25, innerRadius: 0.5, outerRadius: 0.82 },
  ] }] },
});

const model = computed(() => models[selectedKind.value]);
const options = { model };
const sources = computed(() => chartExampleSources(selectedKind.value));
const koSources = computed(() => chartExampleSources(selectedKind.value, true));
const icon = (kind: ChartExampleKind) => ({
  line: ChartNoAxesCombined,
  scatter: CircleDot,
  bar: BarChart3,
  heatmap: Grid3X3,
  donut: Activity,
})[kind];

const datumLabel = (id: string): string => id.startsWith('gap-') ? copy.value.separator : id.replaceAll('-', ' ');
</script>

<template>
  <ExampleFrame
    :fixed-host="host"
    :sources="sources"
    :ko-sources="koSources"
  >
    <section class="chart-workbench" :aria-label="copy.chart">
      <header class="chart-workbench__header">
        <div>
          <h3>{{ copy.title[selectedKind] }}</h3>
          <p>{{ copy.description[selectedKind] }}</p>
        </div>
        <div v-if="kind === undefined" class="chart-workbench__selector" role="group" :aria-label="copy.selector">
          <button
            v-for="chartKind in chartKinds"
            :key="chartKind"
            type="button"
            :aria-pressed="selectedKind === chartKind"
            @click="selectedKind = chartKind"
          >
            <component :is="icon(chartKind)" :size="15" aria-hidden="true" />
            {{ copy.labels[chartKind] }}
          </button>
        </div>
      </header>

      <ChartRoot
        v-slot="{ state }"
        :options="options"
        :dom="{
          renderer: 'auto',
          accessibilityLabel: copy.title[selectedKind],
          getAccessibleDatumLabel: datumLabel,
        }"
        class="chart-workbench__chart"
      >
        <div class="chart-workbench__grid" aria-hidden="true" />
        <ChartCanvas />
        <dl class="chart-workbench__state" aria-live="polite">
          <div>
            <dt>{{ copy.active }}</dt>
            <dd>{{ state.activeDatum === null ? copy.none : datumLabel(String(state.activeDatum)) }}</dd>
          </div>
          <div>
            <dt>{{ copy.selected }}</dt>
            <dd>{{ state.selection.type === 'points' && state.selection.ids[0] !== undefined ? datumLabel(String(state.selection.ids[0])) : copy.none }}</dd>
          </div>
        </dl>
      </ChartRoot>

      <footer>{{ copy.help }}</footer>
    </section>
  </ExampleFrame>
</template>

<style scoped>
.chart-workbench {
  overflow: hidden;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.chart-workbench__header {
  display: grid;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.chart-workbench__header h3,
.chart-workbench__header p { margin: 0; }
.chart-workbench__header h3 { font-size: 1rem; line-height: 1.35; letter-spacing: -0.015em; }
.chart-workbench__header p { max-width: 52ch; margin-top: 0.25rem; color: var(--vp-c-text-2); font-size: 0.74rem; line-height: 1.5; }

.chart-workbench__selector {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.3rem;
}

.chart-workbench__selector button {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.55rem;
  padding: 0.35rem 0.55rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  cursor: pointer;
}

.chart-workbench__selector button:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-text-1); }
.chart-workbench__selector button[aria-pressed="true"] { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.chart-workbench__selector button:focus-visible,
.chart-workbench__chart:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }

.chart-workbench__chart {
  position: relative;
  height: clamp(17rem, 42vw, 23rem);
  overflow: hidden;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 72%, var(--vp-c-bg));
  isolation: isolate;
}

.chart-workbench__grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--vp-c-divider) 68%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--vp-c-divider) 68%, transparent) 1px, transparent 1px);
  background-size: 12.5% 25%;
}

.chart-workbench__chart canvas {
  display: block;
  width: 100%;
  height: 100%;
  filter: hue-rotate(18deg) saturate(1.08);
}

.chart-workbench__state {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: grid;
  min-width: 9.5rem;
  margin: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.7rem;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg) 94%, transparent);
}

.chart-workbench__state div { display: grid; grid-template-columns: 1fr auto; gap: 0.8rem; padding: 0.48rem 0.6rem; }
.chart-workbench__state div + div { border-top: 1px solid var(--vp-c-divider); }
.chart-workbench__state dt { color: var(--vp-c-text-2); font-size: 0.66rem; }
.chart-workbench__state dd { margin: 0; color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); font-size: 0.68rem; font-weight: 650; text-transform: capitalize; }

.chart-workbench footer {
  padding: 0.7rem 1.1rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 0.72rem;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .chart-workbench__selector button { min-height: 2.75rem; flex: 1 1 auto; justify-content: center; }
  .chart-workbench__state { top: 0.5rem; right: 0.5rem; min-width: 8.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  .chart-workbench__selector button { transition: none; }
}
</style>
