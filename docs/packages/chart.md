---
title: Chart
description: Build line, scatter, bar, heatmap, pie, and donut charts with shared data, scale, and interaction semantics.
---

# Chart

Sectile Chart keeps chart data, scales, visible ranges, selection, and interaction state independent of the renderer. Vue and DOM integrations add browser measurement, accessible interaction, and Canvas rendering; `@sectile/chart` can also drive an application-owned renderer or export pipeline.

Application records stay in ordinary arrays. Stable record IDs connect data updates to selection and hover state, while chart definitions describe which fields belong on each axis or radial layer.

## Choose the chart by the question the data should answer

Start with one representative case: twelve weeks of revenue in a line chart. Hover or select a point to inspect that week, and use the visible-range controls only when the time series needs a closer view. The other chart types appear as focused examples in the task guides instead of changing the dataset inside this preview.

The **Usage code** follows the Integration selected in the page header. The preview adds its title, summary, and detail row for documentation; the code view focuses on connecting the same chart data through the public Vue or DOM integration.

| Question | Chart |
| --- | --- |
| How does a value change across time or another ordered domain? | Line |
| How are two numeric values related? | Scatter |
| How do categories compare from one baseline? | Bar |
| Where is activity concentrated across two dimensions? | Heatmap |
| How is one total divided into a small number of parts? | Pie |
| How is one total divided when the center should remain available? | Donut |

Line, scatter, bar, and heatmap charts use Cartesian axes. Pie and donut charts use a radial coordinate and do not expose axis pan or zoom.

## Map application records to axes

A declarative chart definition points at the application fields that contain IDs and plotted values. This example describes weekly revenue without creating any renderer-specific resources.

```ts
import type { ChartDefinition } from '@sectile/chart/definition'

const revenue = [
  { id: 'week-27', date: new Date('2026-07-06'), amount: 128_000 },
  { id: 'week-28', date: new Date('2026-07-13'), amount: 142_000 },
  { id: 'week-29', date: new Date('2026-07-20'), amount: 137_000 },
]

const definition = {
  coordinate: {
    kind: 'cartesian',
    axes: [
      { id: 'date', orientation: 'x', scale: 'temporal', field: 'date', label: 'Week' },
      { id: 'amount', orientation: 'y', scale: 'linear', field: 'amount', label: 'Revenue' },
    ],
  },
  layers: [{
    kind: 'line',
    id: 'weekly-revenue',
    data: revenue,
    xAxis: 'date',
    yAxis: 'amount',
    label: 'Revenue',
  }],
} satisfies ChartDefinition<(typeof revenue)[number]>
```

Keep the same record ID while a record still represents the same application entity. Selection and hover state can then reconcile across a data refresh instead of depending on array position. Temporal axes accept `Date` values or finite epoch milliseconds; parsing strings and choosing timezone rules remain application decisions.

See [Data and scales](./chart/model) for nested accessors, scale choice, custom domains, replacement data, and validation failures.

## Add exploration only when the chart needs it

Selection works independently from the visible axis range. Panning and zooming require a view capability for the axis, so an ordinary static chart does not acquire navigation behavior merely because it has Cartesian axes.

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({
  definition,
  viewCapabilities: [{
    axisID: 'date',
    minimumSpan: 86_400_000,
    update: 'follow-end',
  }],
})

const result = controller.dispatch({
  type: 'zoom-axis-view',
  axisID: 'date',
  factor: 1.5,
  anchor: 0.5,
  phase: 'settled',
})

if (!result.ok) {
  console.error(result.error.code)
}
```

Browser integrations leave normal wheel scrolling to the page unless the application explicitly enables chart wheel behavior. Visible controls are the safer default for pan and zoom because the action remains discoverable for pointer, keyboard, and assistive-technology users.

See [Interaction and state](./chart/interaction) for selection, controlled state, shared axis ranges, keyboard navigation, and input policy.

## Choose who owns rendering

For Vue, [`@sectile/vue/chart`](./chart/vue) provides `ChartRoot`, axes, layers, navigation controls, and the Canvas renderer. For existing browser markup, [`@sectile/dom/chart`](./chart/dom) connects an application-owned container and Canvas to a chart controller. Both integrations handle browser measurement and accessibility resources and clean them up with their host lifecycle.

Use `@sectile/chart` directly when the application needs renderer-neutral state, exports graphics elsewhere, or implements another renderer. Runtime APIs come from focused subpaths; the package root itself is type-only. The [Chart API reference](/api/chart) is the canonical list of supported import paths.

The Vue and DOM guides contain the exact packages required for those integrations. Chart remains an optional peer of the host packages, so unrelated Sectile Vue or DOM components do not require it. The application still owns data fetching, loading and error presentation, colors and layout, value formatting, annotations, and persistence of any controlled chart state.

## Replace data without losing interaction state

When new records arrive, replace the layer data and update the definition. A definition-backed controller validates the new axes, layers, IDs, and data before accepting the generation.

Using the `definition` and `controller` from the previous sections:

```ts
const nextRevenue = [
  { id: 'week-27', date: new Date('2026-07-06'), amount: 131_000 },
  { id: 'week-28', date: new Date('2026-07-13'), amount: 145_000 },
  { id: 'week-29', date: new Date('2026-07-20'), amount: 140_000 },
  { id: 'week-30', date: new Date('2026-07-27'), amount: 163_000 },
]

const nextDefinition = {
  ...definition,
  layers: [{
    ...definition.layers[0],
    data: nextRevenue,
  }],
} satisfies ChartDefinition<(typeof nextRevenue)[number]>

const replaced = controller.replaceDefinition(nextDefinition)
if (!replaced.ok) {
  console.error(replaced.error.code)
}
```

A failed replacement leaves the accepted chart generation intact. Preserve IDs for unchanged records so selection and active-record state can be reconciled; use a new ID when the application entity itself changed.

## Keep large-data policy explicit

Ordinary charts should start with the original records. When drawing every visible mark would exceed the application's work budget, projection can enforce a maximum representative count. Line and density-oriented profiles have documented reduction behavior; other modes report that the requested detail does not fit rather than silently discarding marks.

Use [Large datasets](./chart/performance) when the chart actually needs a detail policy. Custom drawing, exported projections, and pointer hit testing are covered separately in [Drawing and hit testing](./chart/projection).

## Continue by task

- [Data and scales](./chart/model) covers record mapping, stable IDs, scales, domains, and data replacement.
- [Interaction and state](./chart/interaction) covers selection, keyboard access, controlled state, pan, and zoom.
- [Vue charts](./chart/vue) covers compound components, reactive data, accessible labels, lifecycle, and SSR.
- [DOM rendering](./chart/dom) covers existing elements, Canvas rendering, navigation input, and cleanup.
- [Drawing and hit testing](./chart/projection) covers custom rendering, exported projections, and pointer queries.
- [Large datasets](./chart/performance) covers representative limits and supported reduction strategies.
- The [Chart API reference](/api/chart) lists the supported public import paths.
