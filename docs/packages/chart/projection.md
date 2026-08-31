---
title: Chart drawing and hit testing
description: Turn a chart into draw-ready shapes and find the value under a pointer.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Drawing and hit testing

The DOM and Vue integrations handle drawing automatically. Use the APIs on this page only when you are building a custom renderer, exporting chart graphics, or placing your own tooltip or annotation.

<ChartPackageExample kind="heatmap" host="dom" />

## Create shapes for one chart size

A projection is a read-only snapshot of the shapes needed for a particular width and height. Creating one does not draw anything.

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({ definition })
const projection = controller.project({
  viewport: { width: 960, height: 540, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})

if (!projection.ok) {
  showChartError(projection.error)
} else {
  drawBatches(projection.value.batches)
}
```

A successful result contains batches of points, lines, rectangles, cells, or arcs. `maximumRepresentatives` limits how many draw-ready items the projection may return. The limit prevents an unexpectedly large data set from creating unbounded drawing work.

Sectile does not silently drop marks to fit the limit. Line charts can preserve visible high and low points with fewer line points. Density scatter plots and aggregated heatmaps can return summary cells. Other built-in modes return an error when every visible mark does not fit. See [Large datasets](./performance) before choosing a limit.

## Find what the pointer is over

```ts
import { hitTestChartProjection } from '@sectile/chart/query'

const [hit] = hitTestChartProjection(projection.value, {
  x: pointerX,
  y: pointerY,
  radius: 8,
  maximumHits: 1,
})

if (hit?.kind === 'datum') {
  showDatumTooltip(hit.id)
} else if (hit?.kind === 'aggregate') {
  showAggregateTooltip({
    count: hit.representative.count,
    bounds: hit.representative.bounds,
    reduction: hit.representative.reduction,
  })
}
```

For a normal mark, the result contains the record ID. A summary cell represents several records, so it returns a count, source-value bounds, and reduction instead of inventing one ID. Show that distinction in the tooltip.

Hits are ordered from nearest to farthest; a later layer wins a distance tie. One query returns at most 256 hits.

Sectile prepares its lookup structure on the first query. If the first hover must respond with no setup delay, call `prepareChartProjectionQueries(projection.value)` after a successful projection.

## Supply a custom renderer only when needed

Implement the public `ChartRenderer` interface when the built-in mark style is insufficient or you need another graphics API. Read only public batches and revision values so the renderer remains compatible with future releases. For ordinary axes, legends, accessible interaction, and Canvas drawing, use [DOM rendering](./dom) or [Vue composition](./vue).
