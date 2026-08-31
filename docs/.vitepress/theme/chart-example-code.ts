export type ChartExampleKind = 'line' | 'scatter' | 'bar' | 'heatmap' | 'pie' | 'donut';
export type ChartExampleHost = 'vue' | 'dom';

const dataSource: Readonly<Record<ChartExampleKind, string>> = Object.freeze({
  line: `const revenue = [
  { id: 'week-27', date: new Date('2026-07-06'), revenue: 128 },
  { id: 'week-28', date: new Date('2026-07-13'), revenue: 142 },
  { id: 'week-29', date: new Date('2026-07-20'), revenue: 137 },
  { id: 'week-30', date: new Date('2026-07-27'), revenue: 163 },
]`,
  scatter: `const services = [
  { id: 'api', deploys: 18, stability: 82 },
  { id: 'worker', deploys: 28, stability: 66 },
  { id: 'web', deploys: 42, stability: 74 },
  { id: 'billing', deploys: 51, stability: 48 },
]`,
  bar: `const orders = [
  { id: 'seoul', region: 'Seoul', orders: 812 },
  { id: 'busan', region: 'Busan', orders: 594 },
  { id: 'daegu', region: 'Daegu', orders: 436 },
  { id: 'incheon', region: 'Incheon', orders: 521 },
]`,
  heatmap: `const activity = [
  { id: 'mon-08', day: 'Mon', hour: '08', value: 3 },
  { id: 'mon-11', day: 'Mon', hour: '11', value: 8 },
  { id: 'tue-08', day: 'Tue', hour: '08', value: 5 },
  { id: 'tue-11', day: 'Tue', hour: '11', value: 9 },
]`,
  pie: `const budget = [
  { id: 'product', label: 'Product', value: 38 },
  { id: 'sales', label: 'Sales', value: 27 },
  { id: 'operations', label: 'Operations', value: 21 },
  { id: 'research', label: 'Research', value: 14 },
]`,
  donut: `const channels = [
  { id: 'direct', label: 'Direct', value: 42 },
  { id: 'search', label: 'Search', value: 33 },
  { id: 'referral', label: 'Referral', value: 16 },
  { id: 'campaign', label: 'Campaign', value: 9 },
]`,
});

const cartesian = Object.freeze({
  line: {
    data: 'revenue', xScale: 'temporal', xField: 'date', yScale: 'linear', yField: 'revenue',
    component: 'ChartLine', layerID: 'revenue-series', label: 'Revenue',
  },
  scatter: {
    data: 'services', xScale: 'linear', xField: 'deploys', yScale: 'linear', yField: 'stability',
    component: 'ChartScatter', layerID: 'service-health', label: 'Services',
  },
  bar: {
    data: 'orders', xScale: 'categorical', xField: 'region', yScale: 'linear', yField: 'orders',
    component: 'ChartBar', layerID: 'regional-orders', label: 'Orders',
  },
  heatmap: {
    data: 'activity', xScale: 'categorical', xField: 'day', yScale: 'categorical', yField: 'hour',
    component: 'ChartHeatmap', layerID: 'activity-grid', label: 'Sessions',
  },
});

function vueSource(kind: ChartExampleKind, korean: boolean): string {
  if (kind === 'pie' || kind === 'donut') {
    const component = kind === 'pie' ? 'ChartPie' : 'ChartDonut';
    const data = kind === 'pie' ? 'budget' : 'channels';
    return `<script setup lang="ts">
import { ${component}, ChartPlot, ChartRadial, ChartRenderer, ChartRoot } from '@sectile/vue/chart'

${dataSource[kind]}
</script>

<template>
  <ChartRoot :dom="{ renderer: 'auto', accessibilityLabel: '${korean ? (kind === 'pie' ? '예산 배분' : '유입 채널') : (kind === 'pie' ? 'Budget allocation' : 'Acquisition channels')}' }">
    <ChartRadial>
      <${component} id="${kind}" :data="${data}" label="${kind === 'pie' ? 'Budget' : 'Channels'}" />
    </ChartRadial>
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>`;
  }
  const chart = cartesian[kind];
  return `<script setup lang="ts">
import {
  ${chart.component}, ChartAxisView, ChartCartesian, ChartNavigation,
  ChartPanControl, ChartPlot, ChartRenderer, ChartResetView, ChartRoot,
  ChartViewControls, ChartXAxis, ChartYAxis, ChartZoomControl,
} from '@sectile/vue/chart'

${dataSource[kind]}
</script>

<template>
  <ChartRoot :dom="{ renderer: 'auto', accessibilityLabel: '${korean ? '업무 차트' : 'Business chart'}' }">
    <ChartCartesian>
      <ChartXAxis id="x" scale="${chart.xScale}" field="${chart.xField}">
        <ChartAxisView :minimum-span="1" />
      </ChartXAxis>
      <ChartYAxis id="y" scale="${chart.yScale}" field="${chart.yField}" />
      <${chart.component} id="${chart.layerID}" :data="${chart.data}" x-axis="x" y-axis="y" label="${chart.label}" />
      <ChartNavigation keyboard />
      <ChartViewControls axis="x">
        <ChartPanControl direction="backward">${korean ? '이전' : 'Previous'}</ChartPanControl>
        <ChartZoomControl direction="in">${korean ? '확대' : 'Zoom in'}</ChartZoomControl>
        <ChartZoomControl direction="out">${korean ? '축소' : 'Zoom out'}</ChartZoomControl>
        <ChartResetView>${korean ? '초기화' : 'Reset'}</ChartResetView>
      </ChartViewControls>
    </ChartCartesian>
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>`;
}

function definitionSource(kind: ChartExampleKind): string {
  if (kind === 'pie' || kind === 'donut') {
    const data = kind === 'pie' ? 'budget' : 'channels';
    return `const definition = {
  coordinate: { kind: 'radial' },
  layers: [{ kind: '${kind}', id: '${kind}', data: ${data}, label: '${kind === 'pie' ? 'Budget' : 'Channels'}' }],
} as const`;
  }
  const chart = cartesian[kind];
  return `const definition = {
  coordinate: { kind: 'cartesian', axes: [
    { id: 'x', orientation: 'x', scale: '${chart.xScale}', field: '${chart.xField}' },
    { id: 'y', orientation: 'y', scale: '${chart.yScale}', field: '${chart.yField}' },
  ] },
  layers: [{
    kind: '${kind}', id: '${chart.layerID}', data: ${chart.data},
    xAxis: 'x', yAxis: 'y', label: '${chart.label}',
  }],
} as const`;
}

function domSource(kind: ChartExampleKind, korean: boolean): string {
  const radial = kind === 'pie' || kind === 'donut';
  return `import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

${dataSource[kind]}
${definitionSource(kind)}

const root = document.querySelector<HTMLElement>('[data-chart]')!
const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
const controller = createChartController({
  definition,
  ${radial ? '' : "viewCapabilities: [{ axisID: 'x', minimumSpan: 1 }],\n"}})
const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: '${korean ? '업무 차트' : 'Business chart'}',
  ${radial ? '' : "navigation: { wheel: 'native', keyboard: true },\n"}})

window.addEventListener('pagehide', () => {
  chart.disconnect()
  controller.dispose()
}, { once: true })`;
}

export function chartExampleSources(
  kind: ChartExampleKind,
  korean = false,
): Readonly<Partial<Record<ChartExampleHost, string>>> {
  return Object.freeze({
    vue: vueSource(kind, korean),
    dom: domSource(kind, korean),
  });
}
