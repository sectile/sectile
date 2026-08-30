---
title: Chart
description: Build fast, accessible charts with renderer-neutral state and Canvas rendering.
---

<script setup>
import ChartPackageExample from '../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Chart

Sectile Chart provides the data, interaction, and browser behavior for charts without prescribing a visual system. Use the built-in Canvas renderer for data marks, then add the axes, labels, legend, colors, and layout your product needs.

## Try the chart types

Switch between the five built-in data profiles. Hover or select a mark to see the same chart state that application code receives. Open **Code** for a complete Vue example.

<ChartPackageExample />

## Choose a chart type

| What you want to show | Profile | Common charts |
| --- | --- | --- |
| Individual `x` and `y` observations | `point` | Scatter plot, bubble chart, dot plot |
| A sequence of `x` and `y` values | `ordered-series` | Line chart, area boundary, sparkline |
| A rectangular span | `cartesian-segment` | Bar, column, range bar, waterfall |
| A row and column position | `grid-cell` | Heatmap, matrix |
| A share of a whole | `radial-segment` | Pie, donut, radial proportion |

Combine layers when a chart needs more than one shape. Histograms, stacked charts, candlesticks, box plots, and gauges can be prepared as one or more of these profiles. Chart does not currently provide network graphs, maps, contours, 3D scenes, or an unbounded streaming data source.

## Choose an integration

- Use [Vue composition](./chart/vue) for `ChartRoot`, `ChartCanvas`, reactive models, and `v-model` state.
- Use [DOM rendering](./chart/dom) to connect an existing element and canvas directly.
- Use `@sectile/chart` alone when you need chart state, projection, and queries without browser rendering.

```sh
pnpm add @sectile/chart
```

`@sectile/chart` is an optional peer of the DOM and Vue packages. Install it only in applications that use their Chart entry points.

## Learn by task

| Task | Guide |
| --- | --- |
| Shape input data, choose IDs, and update values | [Data and scales](./chart/model) |
| Build tooltips, hit testing, or a custom renderer | [Drawing and hit testing](./chart/projection) |
| Control hover, selection, keyboard focus, pan, and zoom | [Interaction and state](./chart/interaction) |
| Connect an existing canvas | [DOM rendering](./chart/dom) |
| Build a chart in a Vue template | [Vue composition](./chart/vue) |
| Tune a large chart | [Large datasets](./chart/performance) |

## What Chart owns

Chart owns stable data identity, validation, selection, keyboard cursor, pan, zoom, hit testing, and bounded drawing work. Your application owns data loading, visual design, axes, labels, legends, annotations, layout, and animation.
