---
title: Vue chart composition
description: Declare chart semantics in a Vue template while keeping only high-cardinality records in arrays.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Vue composition

`@sectile/vue/chart` uses compound components for the small semantic structure—coordinate, axes, layers, view capabilities, controls, and renderer. Only potentially large datum collections remain arrays.

<ChartPackageExample kind="line" />

## Install

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

Chart and DOM are optional peers of Vue and are needed only when importing `@sectile/vue/chart`.

## Declare a production-shaped chart

```vue
<script setup lang="ts">
import {
  ChartAxisView, ChartCartesian, ChartLine, ChartNavigation,
  ChartPanControl, ChartPlot, ChartRenderer, ChartResetView, ChartRoot,
  ChartViewControls, ChartXAxis, ChartYAxis, ChartZoomControl,
} from '@sectile/vue/chart'
import { shallowRef } from 'vue'

const revenue = shallowRef([
  { id: 271, date: new Date('2026-07-06'), amount: 128_000 },
  { id: 272, date: new Date('2026-07-13'), amount: 142_000 },
  { id: 273, date: new Date('2026-07-20'), amount: 137_000 },
])
</script>

<template>
  <ChartRoot :dom="{ renderer: 'auto', accessibilityLabel: 'Weekly revenue' }">
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
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>
```

The axis `field` props already describe how to read `date` and `amount`; `ChartLine` does not repeat `getX` or `getY`. The canonical `id` field also makes `getId` unnecessary. Pass accessors only for nested or computed values.

Replace `revenue.value` to publish new records. The declaration registry observes shallow prop identity and does not create one Vue component, watcher, or registry record per datum.

## Match composition to the coordinate

```vue
<ChartRoot :dom="{ accessibilityLabel: 'Budget allocation' }">
  <ChartRadial>
    <ChartPie id="budget" :data="budget" label="Budget" />
  </ChartRadial>
  <ChartPlot><ChartRenderer /></ChartPlot>
</ChartRoot>
```

Records with canonical `id`, `value`, and `label` fields need no accessors. Pie and donut do not contain `ChartXAxis`, `ChartYAxis`, `ChartAxisView`, or Cartesian navigation controls.

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

Use the root slot for a nearby tooltip or status that needs the current `state`, `projection`, or resolved `definition`. For distant consumers, `useChartSelector`, `useChartLayerSelector`, and `useChartAxisSelector` publish only selected values. Use `ChartProvider` or `createChartComponents(controller)` when one application-owned controller must span multiple roots or component subtrees.

`ChartRoot` delays DOM resources until mount and renders semantic state during SSR. Provide identical declaration and controlled values on server and first client render; browser measurement and Canvas connection begin after hydration.
