---
title: DOM chart rendering
description: Connect chart state to an existing element and canvas with accessible browser input.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# DOM rendering

`@sectile/dom/chart` connects a chart controller to an existing root element and canvas. It handles sizing, drawing, pointer and keyboard input, accessibility, and cleanup.

<ChartPackageExample kind="bar" host="dom" />

## Install

```sh
pnpm add @sectile/chart @sectile/dom
```

## Connect a canvas

```html
<div data-chart style="position: relative; height: 22rem">
  <canvas style="width: 100%; height: 100%"></canvas>
</div>
```

```ts
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

const root = document.querySelector<HTMLElement>('[data-chart]')!
const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
const controller = createChartController({ model })

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: 'Orders by weekday',
  getAccessibleDatumLabel: id => orderLabels[id],
})
```

`auto` uses WebGL2 when available and falls back to Canvas2D. Use `canvas2d` to force the compatibility renderer or `webgl2` when the chart must fail instead of falling back.

The root needs a real width and height. The connection observes size changes and updates the canvas backing resolution for the device pixel ratio.

## Style the marks

Create a renderer when the built-in color, point radius, or line width needs to change.

```ts
import { createChartRenderer } from '@sectile/dom/chart'

const renderer = createChartRenderer(canvas, {
  mode: 'auto',
  style: {
    color: [0.33, 0.41, 0.92, 1],
    pointRadius: 4,
    lineWidth: 2,
  },
})

const chart = createDOMChart({ root, canvas, controller, renderer })
```

The built-in renderer applies one style to its data marks. Add axes, labels, legends, and annotations as normal DOM or SVG content around the canvas. Supply a custom `ChartRenderer` when the drawing itself needs per-series colors, fills, or another graphics API.

## Bound the work

Use a fixed policy for a stable backing resolution. Use an adaptive policy when a dense chart should reduce pixel work to stay within a frame budget.

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

## Clean up

```ts
chart.disconnect()
controller.dispose()
```

`disconnect()` removes listeners and observers, cancels pending frames, and releases a renderer created by the connection. If you pass a renderer object, it remains yours; call `renderer.disconnect()` as well.
