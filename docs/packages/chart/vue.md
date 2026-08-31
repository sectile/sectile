---
title: Vue charts
description: Build accessible Sectile charts with Vue components and reactive data.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Vue charts

`@sectile/vue/chart` provides components for the chart, axes, data layers, controls, and Canvas renderer. Records remain in arrays, so a large data set does not create one Vue component or watcher per record.

<ChartPackageExample kind="line" host="vue" />

## Install

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

These packages are needed only for the chart entry point. Other `@sectile/vue` components do not require them.

## Build a weekly revenue chart

This example includes a time axis, a numeric axis, keyboard navigation, visible range controls, accessible record labels, and a responsive plot area.

```vue
<script setup lang="ts">
import {
  ChartAxisTicks, ChartAxisView, ChartCartesian, ChartGrid, ChartLegend,
  ChartLine, ChartNavigation, ChartPanControl, ChartPlot, ChartRenderer,
  ChartResetView, ChartRoot, ChartViewControls, ChartXAxis, ChartYAxis,
  ChartZoomControl,
} from '@sectile/vue/chart'
import { computed, shallowRef } from 'vue'

const revenue = shallowRef([
  { id: 271, date: new Date('2026-07-06'), amount: 128_000 },
  { id: 272, date: new Date('2026-07-13'), amount: 142_000 },
  { id: 273, date: new Date('2026-07-20'), amount: 137_000 },
])

const revenueLabels = computed(() => new Map(revenue.value.map(point => [
  point.id,
  `${point.date.toLocaleDateString()}: ${point.amount.toLocaleString()}`,
])))

const dom = {
  renderer: 'auto',
  accessibilityLabel: 'Weekly revenue',
  getAccessibleDatumLabel: (id: number) => revenueLabels.value.get(id) ?? String(id),
} as const
</script>

<template>
  <ChartRoot :dom="dom" class="revenue-chart">
    <ChartCartesian>
      <ChartXAxis id="date" scale="temporal" field="date" label="Week">
        <ChartAxisView :minimum-span="86_400_000" update="follow-end" />
      </ChartXAxis>
      <ChartYAxis id="amount" scale="linear" field="amount" label="Revenue" />
      <ChartLine
        id="weekly-revenue"
        :data="revenue"
        x-axis="date"
        y-axis="amount"
        label="Revenue"
      />
      <ChartNavigation keyboard />
      <ChartViewControls axis="date">
        <ChartPanControl direction="backward">Previous</ChartPanControl>
        <ChartZoomControl direction="in">Zoom in</ChartZoomControl>
        <ChartZoomControl direction="out">Zoom out</ChartZoomControl>
        <ChartResetView>Reset</ChartResetView>
      </ChartViewControls>
    </ChartCartesian>
    <ChartGrid />
    <ChartAxisTicks />
    <ChartLegend />
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>

<style scoped>
.revenue-chart {
  position: relative;
  height: 24rem;
}

.revenue-chart :deep([data-part='plot']),
.revenue-chart :deep(canvas) {
  width: 100%;
  height: 100%;
}
</style>
```

The `field` props tell the chart where to read the date and amount, and the `id` property identifies each record. Accessor functions are needed only for nested or computed values.

Replace `revenue.value` when new records arrive. Keep the same ID for the same week so selection can survive the update. `ChartRoot` releases its controller, event listeners, observers, and graphics resources when Vue unmounts it.

## Build a pie or donut chart

```vue
<ChartRoot :dom="{ accessibilityLabel: 'Budget allocation' }">
  <ChartRadial>
    <ChartPie id="budget" :data="budget" label="Budget" />
  </ChartRadial>
  <ChartPlot><ChartRenderer /></ChartPlot>
</ChartRoot>
```

Records with `id`, `value`, and `label` fields need no additional mapping. Pie and donut charts do not use x-axes, y-axes, panning, or zooming.

## Control and share state

```vue
<ChartRoot
  v-model="selection"
  v-model:view="sharedView"
  v-model:cursor="cursor"
  @command="persistChartCommand"
>
  <!-- declarations -->
</ChartRoot>
```

The default slot exposes current `state`, `projection`, and `definition` values for a tooltip or nearby status. Components elsewhere in the page can read only the value they need with `useChartSelector`, `useChartLayerSelector`, or `useChartAxisSelector`.

Use `ChartProvider` or `createChartComponents(controller)` only when one controller must be shared across several chart roots or component subtrees.

During server rendering, `ChartRoot` does not create browser resources. Pass the same chart components and controlled values on the server and the first client render. Measurement and Canvas drawing start after hydration.
