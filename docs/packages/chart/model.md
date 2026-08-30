---
title: Chart data and scales
description: Shape chart layers, choose stable IDs, update data, and map values to a viewport.
---

# Data and scales

A chart model is a list of layers. Every layer chooses one profile, and every datum has an ID that remains the same while that real-world item remains the same.

```ts
import type { ChartModel } from '@sectile/chart/model'

const model = {
  layers: [{
    id: 'revenue',
    profile: 'ordered-series',
    data: [
      { id: '2026-01', x: 1, y: 32 },
      { id: '2026-02', x: 2, y: 41 },
      { id: '2026-03', x: 3, y: 38 },
    ],
  }],
} satisfies ChartModel<string>
```

Use a non-empty string or a safe integer for each ID. Numeric IDs are useful when your data already has stable numeric keys; converting them to strings is unnecessary. Layer IDs and datum IDs share one chart-wide namespace, so each ID must be unique across the model.

## Update the data

Replace the model when the application already receives a complete next dataset. Apply a patch when an insert, removal, or replacement is naturally available as a small operation.

```ts
const result = controller.applyPatch({
  operations: [{
    type: 'replace',
    layerID: 'revenue',
    index: 2,
    data: [{ id: '2026-03', x: 3, y: 46 }],
  }],
})

if (!result.ok) showChartError(result.error)
```

An update is accepted in full or rejected without publishing a partial chart. When separate writers may race, pass the current model generation in `expectedGeneration` so stale patches fail explicitly.

## Use scales directly

The DOM and Vue integrations create the viewport projection for you. Import a scale when you are building custom axes, converting a pointer back to a domain value, or supplying your own projection flow.

```ts
import { createLinearScale } from '@sectile/chart/scale'

const x = createLinearScale(
  { minimum: 0, maximum: 100 },
  { start: 0, end: 800 },
)

const pixel = x.normalize(25) // 200
const value = x.invert(200)   // 25
```

Chart includes linear, logarithmic, temporal, and categorical scales. Every scale can normalize a domain value, invert a viewport coordinate, and produce a bounded set of ticks.

## Input limits

The defaults allow up to 64 layers, 1,000,000 data items, and 100,000 operations in one patch. Set lower limits when your product has a smaller known ceiling. Invalid coordinates, duplicate IDs, incompatible profile fields, and values over the configured limits are rejected before the chart changes.

Use throwing functions for trusted application data. Use the matching `try*` function when invalid input is an expected result of parsing user or transport data.
