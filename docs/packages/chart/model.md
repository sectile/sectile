---
title: Chart models and scales
description: Validate immutable chart generations and map domain values into viewport coordinates.
---

# Models and scales

Every layer and datum has a globally unique `StableID`, either a non-empty string or a safe integer. Numeric IDs avoid string allocation when an application already owns dense numeric identity. IDs must remain stable across replacements and patches.

```ts
import { createChartModel, applyChartPatch } from '@sectile/chart/model'

let model = createChartModel({
  layers: [{
    id: 'revenue',
    profile: 'ordered-series',
    data: [
      { id: 101, x: 0, y: 12 },
      { id: 102, x: 1, y: 18 },
    ],
  }],
})

model = applyChartPatch(model, {
  expectedGeneration: model.generation,
  operations: [{ type: 'replace', layerID: 'revenue', index: 1, data: [{ id: 102, x: 1, y: 21 }] }],
})
```

Construction validates all coordinates, values, profiles, and identities before publishing a state. A successful material change advances `generation`; a no-op preserves object identity. `expectedGeneration` rejects stale patch writers without partial mutation.

Default ceilings are 64 layers, 1,000,000 datums, 100,000 patch operations, and 1,024 UTF-16 code units per string ID. Override them downward or upward with `ChartLimits`, within the package's hard validation rules.

## Scales

The `/scale` subpath provides linear, logarithmic, temporal, and categorical scales. Each scale supports `normalize`, `invert`, and bounded `ticks`. Tick requests cannot exceed 10,000.

```ts
import { createLinearScale, createChartViewTransform } from '@sectile/chart/scale'

const x = createLinearScale(
  { minimum: 0, maximum: 100 },
  { start: 0, end: 800 },
)

const view = createChartViewTransform({ xScale: 2, xOffset: -120 })
```

Scales describe domain-to-viewport mapping. `ChartViewTransform` describes interaction-driven pan and zoom after that mapping. Both remain renderer-neutral.

