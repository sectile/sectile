---
title: Chart data and scales
description: Declare coordinates and axes, resolve business fields, preserve identity, and replace immutable data.
---

# Data and scales

Start with a declarative definition. It names the coordinate system, each axis, and the chart-specific meaning of every data layer.

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

`Date` and finite epoch-millisecond numbers are valid temporal inputs. Date strings are rejected so parsing and time-zone policy remain visible in application code.

## Let conventional records stay simple

Every datum needs a stable string or safe-integer ID. Sectile resolves it from `getId`, then the canonical `id` field. Converting existing numeric database keys to strings is unnecessary.

Cartesian values resolve in this order: layer `getX` or `getY`, axis `getValue`, axis `field`, then canonical `x` or `y`. Radial values use `getValue`, `valueField`, then `value`; labels use `getLabel`, `labelField`, then `label`. Use accessors only when the record cannot express the mapping declaratively.

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

Axis IDs must be unique within the coordinate. Layer and datum IDs share the compiled chart generation, so keep them unique across all layers and preserve datum IDs while the real-world item remains the same.

## Choose the scale from the domain

| Scale | Input | Domain |
| --- | --- | --- |
| `linear` | Finite numbers | Automatic or explicit numeric minimum/maximum |
| `logarithmic` | Positive finite numbers | Automatic or explicit positive minimum/maximum |
| `temporal` | `Date` or epoch milliseconds | Automatic or explicit temporal minimum/maximum |
| `categorical` | Strings or numbers | Automatic first-seen order or explicit values |

Automatic domains are derived from declared layer values. Bar charts include the zero baseline on their measure axis. Explicit domains are useful when multiple charts must remain comparable.

## Replace reactive data immutably

Treat a data array as one shallow reactive boundary. Replace it when new query results arrive; do not mutate records in place and expect Chart to discover deep changes.

```ts
revenue.value = response.points
```

Vue republishes only declarations whose shallow inputs changed. Core reuses unchanged layer ownership where identity and values permit it, then reconciles selection, cursor, and axis views.

Low-level `ChartModel` and `ChartPatch` APIs remain available for pipelines that already produce packed profile operations. They bypass declarative field and automatic-domain assembly; prefer `replaceDefinition()` when axis observations may change.

## Reject invalid data at the boundary

Construction and replacement are atomic: duplicate IDs, incompatible coordinates, invalid temporal values, non-finite numbers, and exceeded limits publish nothing. Use throwing constructors for trusted application data and matching `try*` functions at transport or user-input boundaries.
