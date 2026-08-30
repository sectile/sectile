export type ChartExampleKind = 'line' | 'scatter' | 'bar' | 'heatmap' | 'donut';
export type ChartExampleHost = 'vue' | 'dom';

const layerSource: Readonly<Record<ChartExampleKind, string>> = Object.freeze({
  line: `{
      id: 'revenue',
      profile: 'ordered-series',
      data: [
        { id: 'jan', x: 1, y: 32 },
        { id: 'feb', x: 2, y: 41 },
        { id: 'mar', x: 3, y: 38 },
        { id: 'apr', x: 4, y: 54 },
        { id: 'may', x: 5, y: 61 },
        { id: 'jun', x: 6, y: 73 },
      ],
    }`,
  scatter: `{
      id: 'deployments',
      profile: 'point',
      data: [
        { id: 'api', x: 18, y: 82 },
        { id: 'worker', x: 28, y: 66 },
        { id: 'web', x: 42, y: 74 },
        { id: 'billing', x: 51, y: 48 },
        { id: 'search', x: 67, y: 57 },
        { id: 'analytics', x: 79, y: 31 },
      ],
    }`,
  bar: `{
      id: 'orders',
      profile: 'cartesian-segment',
      data: [
        { id: 'mon', x1: 0, y1: 0, x2: 0.72, y2: 48 },
        { id: 'tue', x1: 1, y1: 0, x2: 1.72, y2: 64 },
        { id: 'wed', x1: 2, y1: 0, x2: 2.72, y2: 52 },
        { id: 'thu', x1: 3, y1: 0, x2: 3.72, y2: 79 },
        { id: 'fri', x1: 4, y1: 0, x2: 4.72, y2: 71 },
      ],
    }`,
  heatmap: `{
      id: 'activity',
      profile: 'grid-cell',
      data: [
        { id: '0-0', column: 0, row: 0, value: 3 },
        { id: '1-0', column: 1, row: 0, value: 7 },
        { id: '3-0', column: 3, row: 0, value: 5 },
        { id: '0-1', column: 0, row: 1, value: 8 },
        { id: '2-1', column: 2, row: 1, value: 6 },
        { id: '4-1', column: 4, row: 1, value: 9 },
        { id: '1-2', column: 1, row: 2, value: 4 },
        { id: '2-2', column: 2, row: 2, value: 8 },
        { id: '4-2', column: 4, row: 2, value: 5 },
      ],
    }`,
  donut: `{
      id: 'channels',
      profile: 'radial-segment',
      data: [
        { id: 'direct', value: 42, innerRadius: 0.5, outerRadius: 0.82 },
        // Zero-radius spacers separate slices in the built-in single-style renderer.
        { id: 'gap-1', value: 1, innerRadius: 0, outerRadius: 0 },
        { id: 'search', value: 31, innerRadius: 0.5, outerRadius: 0.82 },
        { id: 'gap-2', value: 1, innerRadius: 0, outerRadius: 0 },
        { id: 'referral', value: 25, innerRadius: 0.5, outerRadius: 0.82 },
      ],
    }`,
});

const modelSource = (kind: ChartExampleKind, korean: boolean): string => `const model = {
  layers: [
    ${layerSource[kind].replace(
      '// Zero-radius spacers separate slices in the built-in single-style renderer.',
      korean
        ? '// 반지름이 0인 항목으로 단일 스타일 렌더러의 구간을 시각적으로 나눕니다.'
        : '// Zero-radius spacers separate slices in the built-in single-style renderer.',
    )}
  ],
} satisfies ChartModel<string>`;

const vueSource = (kind: ChartExampleKind, korean: boolean): string => `<script setup lang="ts">
import type { ChartModel } from '@sectile/chart/model'
import { ChartCanvas, ChartRoot } from '@sectile/vue/chart'

${modelSource(kind, korean)}
const options = { model }
</script>

<template>
  <ChartRoot
    :options="options"
    :dom="{
      renderer: 'auto',
      accessibilityLabel: '${korean ? '월별 매출 차트' : 'Monthly revenue chart'}',
    }"
    class="chart"
  >
    <ChartCanvas />
  </ChartRoot>
</template>

<style scoped>
.chart { position: relative; height: 22rem; }
.chart canvas { width: 100%; height: 100%; }
</style>`;

const domSource = (kind: ChartExampleKind, korean: boolean): string => `import type { ChartModel } from '@sectile/chart/model'
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

${modelSource(kind, korean)}
const root = document.querySelector<HTMLElement>('[data-chart]')!
const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
const controller = createChartController({ model })
const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: '${korean ? '월별 매출 차트' : 'Monthly revenue chart'}',
})

// ${korean ? '화면을 제거할 때 브라우저와 컨트롤러 리소스를 함께 정리합니다.' : 'Release browser and controller resources when the view is removed.'}
window.addEventListener('pagehide', () => {
  chart.disconnect()
  controller.dispose()
}, { once: true })`;

export function chartExampleSources(
  kind: ChartExampleKind,
  korean = false,
): Readonly<Partial<Record<ChartExampleHost, string>>> {
  return Object.freeze({
    vue: vueSource(kind, korean),
    dom: domSource(kind, korean),
  });
}
