---
title: Chart
description: Build large interactive charts from immutable data, packed projections, and host-owned rendering.
---

# Chart

`@sectile/chart` turns finite chart data into immutable interaction state and packed geometry. It owns chart meaning and bounded computation; `@sectile/dom/chart` owns browser input and Canvas resources, while `@sectile/vue/chart` owns Vue reactivity and component lifecycle.

```sh
pnpm add @sectile/chart
```

## Choose a profile

| Profile | Typical charts | Datum fields | Projection |
| --- | --- | --- | --- |
| `point` | scatter, bubble, dot plot | `x`, `y` | points |
| `ordered-series` | line, area boundary, sparkline | ordered `x`, `y` | polyline |
| `cartesian-segment` | bar, column, range bar, waterfall segment | `x1`, `y1`, `x2`, `y2` | rectangles |
| `grid-cell` | heatmap, matrix | `column`, `row`, `value` | cells |
| `radial-segment` | pie, donut, radial proportion | `value`, optional radii | arcs |

Area fills, stacked series, candlesticks, box plots, histograms, gauges, and similar charts can be built by deriving one or more supported layers in application code. Network graphs, geographic projections, contours, 3D scenes, streaming ring buffers, and unbounded data sources require additional domain invariants and are not claimed by this package.

## Responsibility boundary

Chart owns stable identities, validation, generations, scales, representative selection, packed projection, exact hit testing, selection, cursor, pan, zoom, and controlled-value commands. It does not own colors, axes, labels, legends, layout chrome, animation, network loading, or rendering resources.

The root import is type-only. Import runtime functions from focused subpaths so consumers pay only for the behavior they use.

```ts
import { createChartModel } from '@sectile/chart/model'
import { createChartController } from '@sectile/chart/controller'
```

## Continue

- [Models and scales](./chart/model)
- [Projection and queries](./chart/projection)
- [Interaction and controller](./chart/interaction)
- [DOM rendering](./chart/dom)
- [Vue composition](./chart/vue)
- [Performance contract](./chart/performance)

