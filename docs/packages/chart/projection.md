---
title: Chart drawing and hit testing
description: Draw bounded chart marks, find data under a pointer, and prepare custom rendering.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Drawing and hit testing

Projection maps chart data into the current viewport. The DOM and Vue integrations do this automatically. Use the projection API directly when you are building a custom renderer, a tooltip layer, an annotation system, or a non-DOM host.

<ChartPackageExample kind="heatmap" host="dom" />

## Create a projection

```ts
import { createChartModel } from '@sectile/chart/model'
import { createChartProjection } from '@sectile/chart/projection'

const state = createChartModel(model)
const projection = createChartProjection(state, {
  viewport: { width: 800, height: 480, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})
```

`maximumRepresentatives` caps how many data items reach drawing and hit testing. When the source is larger, Chart chooses representatives deterministically across all layers. It preserves the model and interaction state; only the detail available in this projection changes.

## Find data under a pointer

```ts
import { hitTestChartProjection } from '@sectile/chart/query'

const [hit] = hitTestChartProjection(projection, {
  x: pointerX,
  y: pointerY,
  radius: 8,
  maximumHits: 1,
})

if (hit) showTooltip(hit.id)
```

Results are ordered from the nearest visible mark, with the topmost layer winning ties. Point, line, rectangle, cell, and radial profiles use shape-aware hit testing. One query returns no more than 256 results.

The first query prepares the projection for repeated searches. Call `prepareChartProjectionQueries(projection)` earlier when the first pointer interaction must not pay that setup cost.

## Use a custom renderer

A projection exposes public batches for points, polylines, rectangles, cells, and arcs. A custom `ChartRenderer` can use those batches to draw per-series colors, fills, annotations, or a different graphics API while keeping the same model and interaction behavior.

If the built-in Canvas renderer is sufficient, stay with [DOM rendering](./dom) or [Vue composition](./vue). You do not need to inspect projection batches for ordinary charts.
