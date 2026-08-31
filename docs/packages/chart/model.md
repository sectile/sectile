---
title: Chart data and scales
description: Map application records to chart axes, choose scales, keep IDs stable, and update data safely.
---

# Data and scales

A chart definition tells Sectile which records to draw and which fields belong on each axis. This example plots weekly revenue from the `date` and `amount` fields.

```ts
import type { ChartDefinition } from '@sectile/chart/definition'

const revenue = [
  { id: 271, date: new Date('2026-07-06'), amount: 128_000 },
  { id: 272, date: new Date('2026-07-13'), amount: 142_000 },
  { id: 273, date: new Date('2026-07-20'), amount: 137_000 },
]

const definition = {
  coordinate: { kind: 'cartesian', axes: [
    { id: 'date', orientation: 'x', scale: 'temporal', field: 'date', label: 'Week' },
    { id: 'amount', orientation: 'y', scale: 'linear', field: 'amount', label: 'Revenue' },
  ] },
  layers: [{
    kind: 'line', id: 'weekly-revenue', data: revenue,
    xAxis: 'date', yAxis: 'amount', label: 'Revenue',
  }],
} satisfies ChartDefinition<(typeof revenue)[number]>
```

The `field` values refer to properties on each record. The line layer then names the two axes it uses. For a temporal axis, pass a valid `Date` or a finite epoch-millisecond number. Parse date strings in your application so its time-zone rules stay explicit.

## Give each record a stable ID

Every plotted record needs a string or safe-integer ID. When a record already has an `id` field, Sectile uses it automatically. Keep that value unchanged while the record represents the same real item; selection and hover state can then survive a data refresh.

Use `getId`, `getX`, or `getY` only when the required value is nested or computed. For example:

```ts
const layer = {
  kind: 'scatter',
  id: 'service-health',
  data: services,
  getId: service => service.key,
  getX: service => service.deployments.last30Days,
  getY: service => service.slo.successRate,
  xAxis: 'deployments',
  yAxis: 'stability',
} as const
```

Axis IDs must be unique within one chart. Layer IDs and record IDs must also be unique across all layers in that chart.

For radial charts, records with `id`, `value`, and `label` fields work without accessors. Use `valueField` and `labelField` when your property names differ.

## Choose a scale for the field

| Scale | Accepted values | Use it for |
| --- | --- | --- |
| `linear` | Finite numbers | Amounts, counts, percentages, and other numeric ranges |
| `logarithmic` | Positive finite numbers | Positive values spread across several orders of magnitude |
| `temporal` | `Date` or epoch milliseconds | Dates and times |
| `categorical` | Strings or numbers | Named groups in a fixed order |

By default, Sectile finds the minimum and maximum from the plotted records. This range is called the axis domain. Bar charts also include zero on the value axis. Set a domain yourself when several charts must use the same range for a fair comparison.

## Replace the array when data changes

Sectile watches the array reference, not every property on every record. Replace the array when a request or subscription returns new values.

```ts
revenue.value = response.points
```

In Vue, keep large record collections in a `shallowRef`. If a chart has several layers, preserve the array reference for layers whose data did not change.

Outside Vue, call `controller.replaceDefinition(nextDefinition)` after replacing a layer's data. The method returns a result so the application can keep the previous chart when the new data is invalid.

`ChartModel` and `ChartPatch` are advanced APIs for systems that already produce incremental chart operations. Most applications should use definitions so Sectile can recalculate axes when values change.

## Handle invalid data before showing it

Sectile rejects duplicate IDs, incompatible axes, invalid dates, non-finite numbers, and data above configured limits. A failed replacement leaves the current chart unchanged.

Use `createChartController` when invalid input is a programming error. Use `tryCreateChartController` or inspect the result from `replaceDefinition` when data came from a network or user-controlled source and the application needs to show an error.
