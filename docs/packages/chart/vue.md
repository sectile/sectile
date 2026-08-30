---
title: Vue chart composition
description: Own chart state with Vue refs and connect a headless ChartRoot to DOM rendering.
---

# Vue chart composition

Install Chart only when the Chart subpath is used. It is an optional peer of both host packages.

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

## Composable

`useChart()` accepts a ref, getter, or plain model. Provide writable refs for controlled values and `default*` values for controller-owned state.

```ts
import { shallowRef } from 'vue'
import { useChart } from '@sectile/vue/chart'

const selection = shallowRef({ type: 'points' as const, ids: [] })
const chart = useChart({
  model: () => props.model,
  selection,
  onCommand(command) {
    audit(command)
  },
})

chart.dispatch({ type: 'zoom', x: 320, y: 180, factor: 1.2 })
```

The result exposes the controller, revision snapshot, current projection and DOM connection as shallow refs, plus replacement, patch, dispatch, synchronization, and disposal methods. A Vue effect scope disposes an owned controller automatically.

## Components

```vue
<script setup lang="ts">
import { ChartRoot, ChartCanvas } from '@sectile/vue/chart'

const options = { model: () => model.value }
</script>

<template>
  <ChartRoot :options="options" class="chart">
    <ChartCanvas />
  </ChartRoot>
</template>
```

`ChartRoot` accepts exactly one of `options` or an externally owned `controller`. Its default slot receives controller, snapshot, state, and projection. `ChartCanvas` registers the canvas used by the DOM connection. Both expose stable `data-scope="chart"` and `data-part` attributes without prescribing styles.

Setup is SSR-safe because DOM connection and renderer creation wait for mount. Provide the same model and initial controlled values on server and client to keep hydration deterministic.

