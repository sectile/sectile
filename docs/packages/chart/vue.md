---
title: Vue chart composition
description: Render a responsive chart, react to model changes, and control chart state from Vue.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Vue composition

`@sectile/vue/chart` provides a headless root, canvas, and composable. It keeps Vue reactivity at the framework boundary while the chart model and interaction behavior stay portable.

<ChartPackageExample kind="line" />

## Install

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

Chart is an optional peer of the DOM and Vue packages. These dependencies are needed only when the Chart entry point is imported.

## Render a chart

```vue
<script setup lang="ts">
import type { ChartModel } from '@sectile/chart/model'
import { ChartCanvas, ChartRoot } from '@sectile/vue/chart'

const model = {
  layers: [{
    id: 'revenue',
    profile: 'ordered-series',
    data: [
      { id: 'jan', x: 1, y: 32 },
      { id: 'feb', x: 2, y: 41 },
      { id: 'mar', x: 3, y: 38 },
    ],
  }],
} satisfies ChartModel<string>

const options = { model }
</script>

<template>
  <ChartRoot
    :options="options"
    :dom="{ accessibilityLabel: 'Monthly revenue' }"
    class="chart"
  >
    <ChartCanvas />
  </ChartRoot>
</template>

<style scoped>
.chart { position: relative; height: 22rem; }
.chart canvas { width: 100%; height: 100%; }
</style>
```

Pass a ref, computed value, getter, or plain model through `options.model`. Replacing the reactive value updates the existing chart and reconciles selection and cursor IDs.

## Control selection and view

```vue
<script setup lang="ts">
import { ref } from 'vue'

const selection = ref({ type: 'points' as const, ids: [] as string[] })
const viewTransform = ref({ xScale: 1, yScale: 1, xOffset: 0, yOffset: 0 })
</script>

<template>
  <ChartRoot
    v-model="selection"
    v-model:view-transform="viewTransform"
    :options="options"
  >
    <ChartCanvas />
  </ChartRoot>
</template>
```

`v-model` controls selection. `v-model:cursor` and `v-model:view-transform` control keyboard focus and pan/zoom. Do not also pass a writable ref for the same value inside `options`.

## Read chart state in a slot

```vue
<ChartRoot v-slot="{ state, controller, projection }" :options="options">
  <ChartCanvas />
  <output>{{ state.activeDatum }}</output>
</ChartRoot>
```

The default slot exposes the controller, revision snapshot, current state, and latest projection. Use it for tooltips, legends, status text, or other presentation that reacts to the chart.

Use `useChart()` when the controller must live outside the component tree. A Vue effect scope disposes a composable-owned controller automatically. `ChartRoot` is SSR-safe because it creates browser resources only after mount; provide the same initial model and controlled values on server and client.
