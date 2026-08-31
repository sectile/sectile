---
title: Chart large datasets
description: Choose how much detail to draw, limit frame cost, and test the largest data set your application supports.
---

# Large datasets

Before setting a limit, decide what users must be able to inspect. An exact chart keeps a separate mark and ID for every visible record. An aggregated chart combines nearby records into a summary cell with a count and value range. Aggregation handles more records, but users can no longer select one source record from that cell.

## Choose exact marks or summary cells

| Chart | Default detail | Option for more data | When the limit is too small |
| --- | --- | --- | --- |
| Line | Keeps visible high and low points while reducing line detail | Automatic | Returns an error only when the reduced line still does not fit |
| Scatter | One point per visible record | `projection="density"` | Exact mode returns an error; density mode returns summary cells |
| Bar | One bar per visible record | None | Returns an error |
| Heatmap | One cell per visible record | `{ kind: 'aggregate', reduction }` | Exact mode returns an error; aggregate mode returns summary cells |
| Pie | One slice per record | None | Returns an error |
| Donut | One slice per record | None | Returns an error |

For a heatmap summary, choose `sum`, `mean`, `minimum`, or `maximum` to calculate the displayed value. Hovering a summary returns its count, source-value bounds, and chosen calculation instead of a record ID.

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

## Limit the number of drawn items

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

`maximumRepresentatives` is the maximum number of draw-ready items for the current view. Choose it from the amount of detail users can read and interact with, not only from the number of source rows. Records outside the visible x- and y-axis ranges do not count. If exact visible marks exceed the limit, the chart reports an error instead of dropping data silently.

## Limit Canvas resolution when frames are slow

`auto` prefers WebGL2 and falls back to Canvas2D. WebGL2 can reuse unchanged drawing data between updates. Adaptive rendering lowers the Canvas backing resolution within the range you provide when measured frame time exceeds the budget.

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

Lowering the backing resolution may make the image less sharp. It does not change values, record IDs, selection, accessible labels, or visible axis ranges.

## Keep updates predictable

- Replace a layer's array when its query result changes; keep the same array for unchanged layers.
- Keep record IDs stable so selection and cursor survive replacement.
- Use low-level patches only when your data source already emits incremental chart operations and axis ranges do not need recalculation.
- Prepare hit-test queries before the first pointer event when the first hover must have no setup delay.
- Disconnect DOM charts and dispose controllers and renderers created by your application.

Built-in safety ceilings allow up to 64 layers, 1,000,000 source records, and 1,000,000 drawn items. These values only reject larger input; they do not promise that every device can render that much data smoothly.

Before choosing application limits, measure the largest expected record count and update rate at the largest supported chart size. Test each supported browser, high device-pixel ratios, and the slowest GPU class you intend to support.
