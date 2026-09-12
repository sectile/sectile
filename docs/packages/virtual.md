---
title: Virtual
description: Virtualize long lists and large two-dimensional surfaces while keeping measured size and scroll position stable.
---

# Virtual

`@sectile/virtual` calculates which items of a large surface belong near the current viewport and where those items should be placed. Stable item IDs, size evidence, placements, and scroll correction stay independent of Vue or the DOM; a host supplies the viewport and real measurements, then renders the returned placements.

Use the Vue integration when you want ready-made list, grid, masonry, or spatial components. Install Virtual directly when application logic, a worker, server rendering, or a custom host needs the layout state without a rendering dependency.

## Install

The installation command follows the **Integration** selected in the page header.

<VirtualInstall />

See the [Virtual API reference](/api/virtual) for the renderer-neutral package subpaths.

## Virtualize a variable-height feed

The example below contains 50,000 rows whose rendered heights vary. Only the placements near the viewport are mounted. When a mounted row reports a different height, the layout updates and keeps the current reading position stable instead of making the viewport jump.

<VirtualExample kind="list" />

The **Usage code** view follows the Integration selected in the page header. Vue and DOM integrations perform browser measurement and scroll correction; renderer-neutral code queries the same layout state directly.

## Query a large list without a renderer

A renderer-neutral layout starts from stable IDs and an initial size estimate. Querying it returns a plan for one viewport plus overscan rather than one placement for every item.

```ts
import { createVirtualCollection } from '@sectile/virtual/collection'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import {
  createLinearLayout,
  queryLinearLayout,
} from '@sectile/virtual/linear-layout'

const rows = Array.from({ length: 50_000 }, (_, index) => ({
  id: `row-${index}`,
  title: `Row ${index + 1}`,
}))

const collection = createVirtualCollection(rows, row => row.id)
const extents = createUniformExtentIndex(rows.length, {
  kind: 'estimated',
  value: 44,
})

const layout = createLinearLayout(collection.domain, extents, {
  axis: 'vertical',
  gap: 8,
  crossExtent: 720,
})

const plan = queryLinearLayout(layout, {
  viewport: {
    x: 0,
    y: 12_000,
    width: 720,
    height: 640,
  },
  overscan: 240,
})

console.log(plan.contentSize)
console.log(plan.placements.map(({ id, rect }) => ({ id, rect })))
```

`plan.contentSize` describes the full scrollable surface. `plan.placements` contains only the items that intersect the viewport and its overscan region. A browser, terminal, canvas renderer, or worker can therefore consume the same plan without changing the layout rules.

## Match the size policy to what the application knows

Virtualization needs some initial main-axis extent before an item has been measured. The high-level Vue components expose that choice as `sizePolicy`; the renderer-neutral package represents the same evidence as exact, estimated, or unknown extents.

| What is known before rendering | Vue `sizePolicy` | Result |
| --- | --- | --- |
| Every item has the same exact size | `{ kind: 'fixed', extent }` | No main-axis DOM measurement is needed |
| A useful estimate is available | `{ kind: 'estimated', estimate }` | The estimate lays out unmounted items; mounted sizes can refine it |
| Mounted content must establish the estimate | `{ kind: 'measured' }` | Rendering supplies the initial evidence before normal measurement continues |

Wrapped text, images, expanded content, and other DOM-dependent sizes can refine the initial estimate after mount. Measurement updates carry the layout generation that produced them, so stale measurements are rejected instead of being applied to a newer arrangement.

## Preserve the reading position while data changes

Stable IDs let Virtual distinguish an item's identity from its current index. When rows are inserted, removed, moved, or remeasured before the viewport, the layout compares the previous and next position of the current anchor and returns a scroll correction.

The Vue and DOM integrations apply that correction to the physical scrollport. A custom host receives the same correction from the renderer-neutral mutation APIs and decides how to apply it. Items that keep the same ID also keep their usable measurement evidence across collection changes.

See [Measurement and anchoring](virtual/measurement.md) for the full update sequence.

## Choose where physical scrolling lives

Browser integrations can use either an element scroll container or page scrolling without changing the Virtual layout model. In Vue, omit `scrollport` to keep the component root as the default scroll owner, use `scrollport="document"` for ordinary page flow, or pass an external `HTMLElement` or `Document`. The DOM integration accepts the same physical distinction as `VirtualScrollport = HTMLElement | Document`.

Sticky or fixed UI that covers the viewport is declared with `viewportInsets`; Sectile does not infer that coverage from CSS. If unrelated page-flow content later moves the virtual surface without a resize or registered frame signal, call `refresh()` rather than forwarding `window` scroll events or building a second anchor adapter.

See [Vue connection](virtual/vue.md#use-page-scrolling) and [DOM connection](virtual/dom.md#use-page-scrolling) for page and external-scrollport examples and their browser scope.

## Choose the layout that matches the data

| Application surface | Layout or component | Details |
| --- | --- | --- |
| Feed, messages, search results, command history | Linear | [Linear lists](virtual/linear.md) |
| Vertically flowing responsive card grid | `VirtualGrid` | [Vue connection](virtual/vue.md#declarative-components) |
| Independently large rows and columns | Track grid | [Grid, masonry, and spatial](virtual/layouts.md#track-grid) |
| Variable-height cards packed into lanes | Masonry | [Grid, masonry, and spatial](virtual/layouts.md#masonry) |
| Diagram, editor, or canvas with application-owned rectangles | Spatial | [Grid, masonry, and spatial](virtual/layouts.md#spatial) |

Use the smallest layout that matches the structure already present in the data. A vertically flowing product grid does not need an independently virtualized row-and-column model, while a spreadsheet-sized surface does.

## Choose the integration level

For Vue, [`VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial`](virtual/vue.md) own the ordinary mount, measurement, and scroll-correction loop. For existing browser markup or a custom renderer, [`createVirtualizer`](virtual/dom.md) connects an explicit scrollport and surface to Virtual state. Direct `@sectile/virtual/*` imports are available when the application owns rendering or needs layout work in a worker or server environment.

## Continue by task

- [Linear lists](virtual/linear.md) covers variable-height feeds, size policies, collection changes, and ID-based scrolling.
- [Grid, masonry, and spatial layouts](virtual/layouts.md) covers large two-axis surfaces and non-linear placement.
- [Measurement and anchoring](virtual/measurement.md) covers real sizes and scroll correction.
- [Vue connection](virtual/vue.md) covers the high-level components and low-level Vue building blocks.
- [DOM connection](virtual/dom.md) covers `createVirtualizer`, element registration, measurement, and cleanup.
- The [Virtual API reference](/api/virtual) lists the supported renderer-neutral import paths.
