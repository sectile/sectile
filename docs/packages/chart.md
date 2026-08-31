---
title: Chart
description: Add line, scatter, bar, heatmap, pie, and donut charts to Vue or a browser page.
---

<script setup>
import ChartPackageExample from '../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Chart

Sectile Chart draws line, scatter, bar, heatmap, pie, and donut charts. Use the Vue components for a Vue application, connect it to existing HTML with the DOM API, or use the renderer-independent package when you need to draw the result yourself.

Your records stay in ordinary arrays. You choose which fields supply the ID and plotted values, and Sectile handles scales, selection, panning, zooming, hit testing, and Canvas rendering.

## Try every built-in chart

Switch between the six chart types below. Hover or select a mark, then use the visible controls on Cartesian charts to move or resize the horizontal range. Open **Code** for a complete Vue or DOM example you can adapt.

<ChartPackageExample />

## Choose a chart

| What you want to show | Chart |
| --- | --- |
| Change over time or another ordered value | Line |
| Relationship between two numeric values | Scatter |
| Comparison between categories | Bar |
| Concentration across two dimensions | Heatmap |
| A few parts of one total | Pie |
| Parts of a total with room for a center label | Donut |

Line, scatter, bar, and heatmap charts use an x-axis and y-axis. Pie and donut charts use a radial coordinate and do not have pan or zoom controls.

Sectile does not currently provide first-class histogram, stacked-bar, area, candlestick, box-plot, gauge, map, network, contour, or 3D chart components. A custom renderer can cover some of these cases, but it requires more work than the built-in chart types.

## Choose an integration

| Your application | Install | Start with |
| --- | --- | --- |
| Vue | `vue @sectile/chart @sectile/dom @sectile/vue` | [`ChartRoot`](./chart/vue) |
| Existing HTML and TypeScript | `@sectile/chart @sectile/dom` | [`createDOMChart`](./chart/dom) |
| Custom renderer or non-browser host | `@sectile/chart` | [`createChartController`](./chart/projection) |

`@sectile/chart` is needed only when you import the chart entry points from `@sectile/dom` or `@sectile/vue`. Other DOM and Vue features do not pull it into your application.

## Continue by task

| Task | Guide |
| --- | --- |
| Map records to axes and update data | [Data and scales](./chart/model) |
| Build a custom renderer, tooltip, or hit test | [Drawing and hit testing](./chart/projection) |
| Add selection, keyboard access, pan, and zoom | [Interaction and state](./chart/interaction) |
| Connect existing browser elements | [DOM rendering](./chart/dom) |
| Compose a chart in a Vue template | [Vue composition](./chart/vue) |
| Choose how much detail to keep with large data | [Large datasets](./chart/performance) |

## What your application still provides

Sectile reads and validates data you provide, but it does not fetch that data or decide how values should be formatted. Your application still supplies loading and error states, colors and layout, number and date formatting, annotations, and any saved selection or visible range.

The DOM and Vue integrations measure the chart, render it with Canvas, expose accessible labels, and remove their browser resources when disconnected or unmounted.
