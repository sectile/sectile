<script setup lang="ts">
import {
  ChartAxisTicks,
  ChartAxisView,
  ChartBar,
  ChartCartesian,
  ChartDonut,
  ChartGrid,
  ChartHeatmap,
  ChartLegend,
  ChartLine,
  ChartNavigation,
  ChartPanControl,
  ChartPie,
  ChartPlot,
  ChartRenderer,
  ChartResetView,
  ChartRoot,
  ChartScatter,
  ChartViewControls,
  ChartXAxis,
  ChartYAxis,
  ChartZoomControl,
} from '@sectile/vue/chart';
import { Activity, BarChart3, ChartNoAxesCombined, CircleDot, Grid3X3, PieChart } from '@lucide/vue';
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

const chartKinds = ['line', 'scatter', 'bar', 'heatmap', 'pie', 'donut'] as const;
const copy = computed(() => isKorean.value ? {
  labels: { line: '선', scatter: '산점도', bar: '막대', heatmap: '히트맵', pie: '파이', donut: '도넛' },
  title: {
    line: '주간 매출 추이', scatter: '배포 빈도와 안정성', bar: '지역별 주문', heatmap: '요일·시간대별 활동', pie: '예산 배분', donut: '유입 채널 비중',
  },
  description: {
    line: '순서가 있는 값의 변화를 하나의 선으로 표시합니다.',
    scatter: '두 값의 관계를 개별 점으로 비교합니다.',
    bar: '범주별 크기를 같은 기준선에서 비교합니다.',
    heatmap: '행과 열에 놓인 관측값을 셀로 표시합니다.',
    pie: '한 예산에서 각 부문이 차지하는 비중을 비교합니다.',
    donut: '전체에서 각 항목이 차지하는 비중을 원형 구간으로 표시합니다.',
  },
  active: '가리킨 항목', selected: '선택한 항목', none: '없음',
  help: '마크를 가리키거나 선택하세요. 직교 차트는 버튼으로 수평 범위를 이동·확대·초기화할 수 있습니다.',
  back: '이전', zoomIn: '확대', zoomOut: '축소', reset: '초기화',
  selector: '차트 종류', chart: '인터랙티브 차트 예시',
} : {
  labels: { line: 'Line', scatter: 'Scatter', bar: 'Bar', heatmap: 'Heatmap', pie: 'Pie', donut: 'Donut' },
  title: {
    line: 'Weekly revenue trend', scatter: 'Deployment frequency and stability', bar: 'Orders by region', heatmap: 'Activity by day and hour', pie: 'Budget allocation', donut: 'Acquisition channels',
  },
  description: {
    line: 'Show change across ordered values as a continuous line.',
    scatter: 'Compare the relationship between two values as individual points.',
    bar: 'Compare category magnitudes from a common baseline.',
    heatmap: 'Place observations into rows and columns as cells.',
    pie: 'Compare how one budget is allocated across departments.',
    donut: 'Show each category as a share of the whole.',
  },
  active: 'Hovered datum', selected: 'Selected datum', none: 'None',
  help: 'Hover or select a mark. Cartesian charts expose buttons to pan, zoom, and reset the horizontal domain.',
  back: 'Previous', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset',
  selector: 'Chart type', chart: 'Interactive chart example',
});

const series = Object.freeze({
  line: [
    { id: 'week-27', date: new Date('2026-07-06'), revenue: 128 },
    { id: 'week-28', date: new Date('2026-07-13'), revenue: 142 },
    { id: 'week-29', date: new Date('2026-07-20'), revenue: 137 },
    { id: 'week-30', date: new Date('2026-07-27'), revenue: 163 },
    { id: 'week-31', date: new Date('2026-08-03'), revenue: 181 },
    { id: 'week-32', date: new Date('2026-08-10'), revenue: 194 },
  ],
  scatter: [
    { id: 'api', deploys: 18, stability: 82 }, { id: 'worker', deploys: 28, stability: 66 },
    { id: 'web', deploys: 42, stability: 74 }, { id: 'billing', deploys: 51, stability: 48 },
    { id: 'search', deploys: 67, stability: 57 }, { id: 'identity', deploys: 60, stability: 78 },
  ],
  bar: [
    { id: 'seoul', region: 'Seoul', orders: 812 }, { id: 'busan', region: 'Busan', orders: 594 },
    { id: 'daegu', region: 'Daegu', orders: 436 }, { id: 'incheon', region: 'Incheon', orders: 521 },
    { id: 'daejeon', region: 'Daejeon', orders: 377 },
  ],
  heatmap: Array.from({ length: 35 }, (_, index) => ({
    id: `activity-${index}`,
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index % 7]!,
    hour: ['08', '11', '14', '17', '20'][Math.floor(index / 7)]!,
    value: ((index * 7) % 11) + 1,
  })),
  pie: [
    { id: 'product', label: 'Product', value: 38 }, { id: 'sales', label: 'Sales', value: 27 },
    { id: 'operations', label: 'Operations', value: 21 }, { id: 'research', label: 'Research', value: 14 },
  ],
  donut: [
    { id: 'direct', label: 'Direct', value: 42 }, { id: 'search', label: 'Search', value: 33 },
    { id: 'referral', label: 'Referral', value: 16 }, { id: 'campaign', label: 'Campaign', value: 9 },
  ],
});

const isRadial = computed(() => selectedKind.value === 'pie' || selectedKind.value === 'donut');
const sources = computed(() => chartExampleSources(selectedKind.value));
const koSources = computed(() => chartExampleSources(selectedKind.value, true));
const icon = (kind: ChartExampleKind) => ({
  line: ChartNoAxesCombined,
  scatter: CircleDot,
  bar: BarChart3,
  heatmap: Grid3X3,
  pie: PieChart,
  donut: Activity,
})[kind];

const datumLabel = (id: string | number): string => String(id).replaceAll('-', ' ');
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
        :dom="{
          renderer: 'auto',
          accessibilityLabel: copy.title[selectedKind],
          getAccessibleDatumLabel: datumLabel,
        }"
        class="chart-workbench__chart"
      >
        <ChartCartesian v-if="!isRadial">
          <ChartXAxis
            id="x"
            :scale="selectedKind === 'line' ? 'temporal' : selectedKind === 'bar' || selectedKind === 'heatmap' ? 'categorical' : 'linear'"
            :field="selectedKind === 'line' ? 'date' : selectedKind === 'scatter' ? 'deploys' : selectedKind === 'bar' ? 'region' : 'day'"
          >
            <ChartAxisView :minimum-span="selectedKind === 'line' ? 86_400_000 : 1" />
          </ChartXAxis>
          <ChartYAxis
            id="y"
            :scale="selectedKind === 'heatmap' ? 'categorical' : 'linear'"
            :field="selectedKind === 'line' ? 'revenue' : selectedKind === 'scatter' ? 'stability' : selectedKind === 'bar' ? 'orders' : 'hour'"
          />
          <ChartLine v-if="selectedKind === 'line'" id="revenue" :data="series.line" x-axis="x" y-axis="y" label="Revenue" />
          <ChartScatter v-else-if="selectedKind === 'scatter'" id="deployments" :data="series.scatter" x-axis="x" y-axis="y" label="Services" />
          <ChartBar v-else-if="selectedKind === 'bar'" id="orders" :data="series.bar" x-axis="x" y-axis="y" label="Orders" />
          <ChartHeatmap v-else id="activity" :data="series.heatmap" x-axis="x" y-axis="y" label="Sessions" />
          <ChartNavigation keyboard />
          <ChartViewControls axis="x" class="chart-workbench__controls">
            <ChartPanControl direction="backward" :label="copy.back">←</ChartPanControl>
            <ChartZoomControl direction="in" :label="copy.zoomIn">+</ChartZoomControl>
            <ChartZoomControl direction="out" :label="copy.zoomOut">−</ChartZoomControl>
            <ChartResetView :label="copy.reset">↺</ChartResetView>
          </ChartViewControls>
        </ChartCartesian>
        <ChartRadial v-else>
          <ChartPie v-if="selectedKind === 'pie'" id="budget" :data="series.pie" label="Budget" />
          <ChartDonut v-else id="channels" :data="series.donut" label="Channels" />
        </ChartRadial>
        <ChartGrid />
        <ChartAxisTicks />
        <ChartLegend />
        <ChartPlot><ChartRenderer /></ChartPlot>
        <dl class="chart-workbench__state" aria-live="polite">
          <div>
            <dt>{{ copy.active }}</dt>
            <dd>{{ state?.activeDatum == null ? copy.none : datumLabel(state.activeDatum) }}</dd>
          </div>
          <div>
            <dt>{{ copy.selected }}</dt>
            <dd>{{ state?.selection.type === 'points' && state.selection.ids[0] !== undefined ? datumLabel(state.selection.ids[0]) : copy.none }}</dd>
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

.chart-workbench__chart [data-part="plot"] { height: 100%; }

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

.chart-workbench__controls {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  z-index: 2;
  display: flex;
  gap: 0.3rem;
}

.chart-workbench__controls button {
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.45rem;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg) 94%, transparent);
  cursor: pointer;
}

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
