---
title: DOM chart rendering
description: Connect declarative chart state to existing elements with accessible, page-safe Canvas rendering.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# DOM rendering

`@sectile/dom/chart` measures an existing root, projects its controller, renders data marks, exposes axes and accessibility overlays, translates browser input, and owns browser resource cleanup.

<ChartPackageExample kind="bar" host="dom" />

## Install

```sh
pnpm add @sectile/chart @sectile/dom
```

## Connect existing elements

```html
<div data-chart>
  <canvas></canvas>
</div>
```

```ts
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

const root = document.querySelector<HTMLElement>('[data-chart]')!
const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
const controller = createChartController({
  definition,
  viewCapabilities: [{ axisID: 'date', minimumSpan: 86_400_000 }],
})

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: 'Weekly revenue',
  getAccessibleDatumLabel: id => revenueLabels.get(id) ?? String(id),
  navigation: { wheel: 'native', keyboard: true },
})
```

Give the root a real layout size and make the canvas fill it in application CSS. The connection observes root size and device-pixel-ratio changes; displayed examples omit that product styling so the integration contract stays visible.

## Choose a renderer

`auto` uses WebGL2 when available and falls back to Canvas2D. Choose `canvas2d` for compatibility diagnosis, or `webgl2` when missing acceleration must be an explicit failure.

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

Pass the renderer object to `createDOMChart` when using it. A borrowed renderer remains application-owned; a renderer created from a mode string is connection-owned.

## Keep page input predictable

Native wheel behavior, no drag, no pinch, and no keyboard navigation are the defaults. Opt into each binding. Direct drag or pinch requires `controlAlternative: 'built-in'` or `'external'`; wire the corresponding buttons to controller view events when using an external alternative.

## Bound frame work

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

The representative cap follows the exact/aggregate contract described in [Large datasets](./performance). Adaptive scale changes backing-pixel cost only; it never changes data, selection, or view domains.

## Disconnect ownership

```ts
chart.disconnect()
controller.dispose()
renderer.disconnect() // only for an application-owned renderer
```

`disconnect()` removes listeners and observers, cancels pending frames, drops overlay nodes, and releases connection-owned graphics resources. It is idempotent.
