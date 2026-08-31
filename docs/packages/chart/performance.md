---
title: Chart large datasets
description: Select exact or aggregate semantics, cap drawing work honestly, and validate the largest supported browser case.
---

# Large datasets

Performance starts with a truthful chart contract. Decide whether every visible mark must retain a datum identity or whether the product can interact with a named aggregate. Then set a representative cap and renderer policy from the largest useful viewport.

## Choose exact or aggregate semantics

| Chart | Default | Scalable option | Result under an insufficient cap |
| --- | --- | --- | --- |
| Line | Extrema-preserving viewport envelope with datum representatives | Built in | Rejects only when even the envelope cannot fit |
| Scatter | `projection="raw"` | `projection="density"` | Raw rejects; density emits aggregate cells |
| Bar | Exact visible bars | None | Rejects |
| Heatmap | `projection="raw"` | `{ kind: 'aggregate', reduction }` | Raw rejects; aggregate emits reduced cells |
| Pie | Exact slices | None | Rejects |
| Donut | Exact slices | None | Rejects |

Heatmap reductions are `sum`, `mean`, `minimum`, and `maximum`. Aggregate hits return their count, bounds, and reduction instead of pretending to be a source datum.

```vue
<ChartScatter
  id="requests"
  :data="requests"
  x-axis="latency"
  y-axis="payload"
  projection="density"
/>

<ChartHeatmap
  id="traffic"
  :data="traffic"
  x-axis="day"
  y-axis="hour"
  :projection="{ kind: 'aggregate', reduction: 'mean' }"
/>
```

## Cap visible work

```ts
const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  renderPolicy: {
    type: 'fixed',
    renderScale: 1,
    maximumRepresentatives: 100_000,
  },
})
```

Set `maximumRepresentatives` from useful screen detail and interaction semantics, not only source row count. Axis-domain views exclude off-screen Cartesian data before projection. Exact visible data beyond the cap fails explicitly.

## Protect pixel and upload cost

`auto` prefers WebGL2 and falls back to Canvas2D. The WebGL2 renderer can retain unchanged geometry and upload only changed batches; Canvas2D remains the compatibility path. Adaptive rendering lowers backing resolution within declared bounds when measured frame cost exceeds the budget.

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

Adaptive scale never changes values, identities, selection, accessible state, or axis domains.

## Update and retain intentionally

- Replace declarative arrays when query results change; keep unchanged layer arrays referentially stable.
- Keep datum IDs stable so selection and cursor survive replacement.
- Use low-level patches only when the producer already owns small profile operations and axis domains do not need reassembly.
- Prepare hit-test queries before the first pointer event when first-hover latency matters.
- Disconnect DOM connections and dispose application-owned controllers and renderers.

Default safety ceilings allow 64 layers and 1,000,000 data items; a projection allows up to 1,000,000 representatives. These are rejection limits, not performance promises. Benchmark the maximum real cardinality, update rate, viewport, device-pixel ratio, supported browsers, and representative GPU classes before setting production budgets.
