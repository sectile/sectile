---
title: Chart
description: Build fast Cartesian and radial charts with declarative semantics, bounded projection, and optional browser rendering.
---

<script setup>
import ChartPackageExample from '../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Chart

Sectile Chart turns application data into explicit coordinates, axes, layers, interaction state, and bounded drawing work. Core stays renderer-neutral; DOM and Vue add accessible Canvas rendering without becoming required dependencies.

## Try every built-in chart

The example uses realistic business fields, real axes, selectable marks, and visible view controls. Open **Code** to compare the declarative Vue interface with the equivalent DOM setup.

<ChartPackageExample />

## Choose a chart

| Question | Choose | Coordinate | Large-data behavior |
| --- | --- | --- | --- |
| How does a measure change over an ordered or temporal domain? | Line | Cartesian | Keeps an extrema-preserving viewport envelope |
| How are two measures related? | Scatter | Cartesian | Exact points or explicit density aggregates |
| How do categories compare from a common baseline? | Bar | Cartesian | Exact visible bars; rejects an undersized detail cap |
| Where is intensity concentrated across two dimensions? | Heatmap | Cartesian | Exact cells or an explicit aggregate reduction |
| How is one total divided into a few parts? | Pie | Radial | Exact slices; rejects an undersized detail cap |
| How is one total divided when the center carries another label? | Donut | Radial | Exact slices; rejects an undersized detail cap |

Cartesian charts declare `ChartXAxis` and `ChartYAxis`. Pie and donut declare `ChartRadial` and do not invent irrelevant axes, pan, or zoom.

Histograms, stacked bars, area fills, candlesticks, box plots, gauges, maps, networks, contours, and 3D scenes are not built-in chart contracts. Some can be prepared as current primitives or drawn through a custom renderer, but Sectile does not label an approximation as a first-class chart type.

## Choose an integration

| Needed scope | Install | Start with |
| --- | --- | --- |
| Definitions, immutable state, projection, and hit testing | `@sectile/chart` | `createChartController` |
| Existing elements and Canvas rendering | `@sectile/chart @sectile/dom` | `createDOMChart` |
| Declarative Vue composition | `vue @sectile/chart @sectile/dom @sectile/vue` | `ChartRoot` |

Chart is an optional peer of DOM and Vue. Applications that never import their `/chart` subpaths do not need to install it.

## Continue by task

| Task | Guide |
| --- | --- |
| Shape records, axes, IDs, and updates | [Data and scales](./chart/model) |
| Build a custom renderer, tooltip, or hit test | [Drawing and hit testing](./chart/projection) |
| Design selection, keyboard access, pan, and zoom | [Interaction and state](./chart/interaction) |
| Connect existing browser elements | [DOM rendering](./chart/dom) |
| Compose a chart in a Vue template | [Vue composition](./chart/vue) |
| Select an exact or aggregate strategy | [Large datasets](./chart/performance) |

## Responsibility boundary

Chart owns portable coordinates, axes, identity, validation, view domains, selection, projection, and queries. DOM owns browser input, responsive measurement, accessibility overlays, Canvas2D/WebGL2 resources, and cleanup. Vue owns declarative composition and reactive synchronization. The application owns data loading, product styling, annotations, formatting policy, and persistence.
