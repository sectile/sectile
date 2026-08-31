---
title: Chart drawing and hit testing
description: Project chart semantics into bounded public batches and distinguish exact datum hits from aggregate hits.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Drawing and hit testing

DOM and Vue project automatically. Use this API directly for custom graphics, tooltips, annotations, export, or another host.

<ChartPackageExample kind="heatmap" host="dom" />

## Project a declarative chart

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({ definition })
const projection = controller.project({
  viewport: { width: 960, height: 540, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})

if (!projection.ok) showChartError(projection.error)
```

A successful projection exposes bounded point, polyline, rectangle, cell, or arc batches. It also retains data-space geometry and layer revisions so a custom renderer can reuse unchanged geometry when only the viewport changes.

`maximumRepresentatives` is a correctness boundary, not silent sampling. Line layers may emit an extrema-preserving viewport envelope. Scatter density and heatmap aggregation emit explicit aggregate representatives. Exact scatter, bar, raw heatmap, pie, and donut reject a cap that cannot represent all visible marks.

## Handle both hit kinds

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

An aggregate has no fabricated datum ID. Its count, data-space bounds, and reduction are the truthful interaction result. Results are nearest-first with later layers winning ties, and one query returns at most 256 hits.

The first query lazily prepares an immutable spatial index. Call `prepareChartProjectionQueries(projection)` after projection when first-hover latency matters.

## Supply a custom renderer only when needed

Implement the public `ChartRenderer` contract when one built-in mark style is insufficient or another graphics API is required. Consume public batches and revision metadata; do not depend on packed internal storage. For ordinary axes, legends, accessible interaction, and Canvas drawing, stay with [DOM rendering](./dom) or [Vue composition](./vue).
