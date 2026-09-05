---
title: DOM chart rendering
description: Render a chart in existing HTML, label it for assistive technology, and clean it up safely.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# DOM rendering

Use `@sectile/dom/chart` when your application owns the HTML and does not need Vue components. It measures the chart container, draws into a Canvas element, updates when the container size changes, and adds the elements needed for keyboard and screen-reader access.

<ChartPackageExample kind="bar" host="dom" />

## Install

```sh
pnpm add @sectile/chart @sectile/dom
```

## Connect existing elements

Start with the `definition` and `revenue` records from [Data and scales](./model). The container needs an explicit height; the Canvas can then fill it.

```html
<div data-chart>
  <canvas></canvas>
</div>
```

```css
[data-chart] {
  position: relative;
  height: 24rem;
}

[data-chart] canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

```ts
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

const root = document.querySelector('[data-chart]')
const canvas = root?.querySelector('canvas')

if (!(root instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Chart container is missing')
}

const controller = createChartController({
  definition,
  viewCapabilities: [{ axisID: 'date', minimumSpan: 86_400_000 }],
})
const revenueLabels = new Map(revenue.map(point => [
  point.id,
  `${point.date.toLocaleDateString()}: ${point.amount.toLocaleString()}`,
]))

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: 'Weekly revenue',
  getAccessibleDatumLabel: id => revenueLabels.get(id) ?? String(id),
  navigation: { wheel: 'native', keyboard: true },
})

window.addEventListener('pagehide', () => {
  chart.disconnect()
  controller.dispose()
}, { once: true })
```

In a single-page application, run the same two cleanup calls when the route or owning component unmounts instead of waiting for `pagehide`.

`onCommand` runs after the command's required render scheduling, focus, or announcement effect. `onProjectionChange` runs after renderer, navigation, and accessibility publication. A callback error does not roll back committed controller state or skip the remaining required host work; the first synchronous error is rethrown after those phases finish.

Projection failures use a separate failure contract. If the initial projection fails, `tryCreateDOMChart()` returns the typed Chart error and the connection rolls back its acquired resources; `createDOMChart()` throws that result error. After a successful projection exists, a later failure keeps the last successful visual projection in place. Set `onProjectionError` to receive the typed error and handle that state. Without that callback, an explicit `refresh()` or `flush()` that encounters the failure throws it instead of silently discarding it.

## Choose a renderer

`auto` uses WebGL2 when available and falls back to Canvas2D. It is the right default for most applications. Choose `canvas2d` when diagnosing compatibility, or `webgl2` when the application must fail instead of using the slower fallback.

```ts
import { createChartRenderer } from '@sectile/dom/chart'

const renderer = createChartRenderer(canvas, {
  mode: 'auto',
  style: {
    color: [0.18, 0.42, 0.86, 1],
    pointRadius: 4,
    lineWidth: 2,
  },
})
```

Pass this renderer object as the `renderer` option of `createDOMChart`. Because your code created it, your code must also call `renderer.disconnect()`. When you pass the string `'auto'`, `'canvas2d'`, or `'webgl2'` instead, the chart connection creates and cleans up the renderer.

## Keep page input predictable

By default, the chart leaves wheel scrolling to the page and disables drag, pinch, and keyboard navigation. Enable only the inputs the chart needs. Drag or pinch also requires `controlAlternative: 'built-in'` or `'external'`, which ensures the same action is available through visible controls.

## Limit drawing work per frame

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

The item limit follows the detail rules in [Large datasets](./performance). Adaptive rendering may lower Canvas resolution to meet the frame budget, but it does not change values, IDs, selection, or visible axis ranges.

## Clean up

```ts
chart.disconnect()
controller.dispose()
renderer.disconnect() // only for an application-owned renderer
```

`chart.disconnect()` removes event listeners and resize observers, cancels pending frames, removes accessibility elements, and releases graphics resources created by the connection. Calling it more than once is safe.
