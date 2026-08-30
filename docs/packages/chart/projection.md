---
title: Chart projection and queries
description: Produce bounded packed geometry and query it with an immutable spatial index.
---

# Projection and queries

`createChartProjection()` converts a model generation into typed-array batches. The five layouts are point positions, polyline positions, rectangles, cells, and arcs. Canvas2D and WebGL2 consume these arrays directly without rebuilding object graphs.

```ts
import { createChartProjection } from '@sectile/chart/projection'
import { hitTestChartProjection } from '@sectile/chart/query'

const projection = createChartProjection(model, {
  viewport: { width: 800, height: 480, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})

const [nearest] = hitTestChartProjection(projection, {
  x: 240,
  y: 160,
  radius: 8,
})
```

`maximumRepresentatives` is a deterministic global budget shared proportionally across layers. The default is the smaller of model size and 100,000; the hard ceiling is 1,000,000. The first and last representative of a nontrivial layer are retained by even sampling.

Projection diagnostics report source datums, represented datums, and emitted primitives. A controller retains only one cache entry for the latest default-scale request.

## Hit testing

Queries lazily build one immutable Morton-ordered bounding-volume hierarchy per projection. Broad-phase bounds reject unrelated primitives, then profile-specific exact tests handle points, polyline segments, rectangles, cells, and arcs. Results are ordered by distance, topmost layer, and primitive order. A query returns at most 256 hits.

Call `prepareChartProjectionQueries(projection)` outside a latency-sensitive input path when the first hit-test build cost should be paid eagerly.

