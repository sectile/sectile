---
title: Linear virtualization
description: Build vertical or horizontal dynamic-size lists with overscan and identity scrolling.
---

# Linear virtualization

Use the linear strategy for lists, feeds, carousels, and any one-dimensional ordered surface. It supports vertical or horizontal axes, forward or reverse flow, gaps, dynamic item extents, and identity-based scrolling.

## Complete calculation example

The interactive example on the [Virtual overview](/packages/virtual) runs this domain source. It creates 1,000 unknown-size rows with a fallback and exposes identity-preserving insert, remove, and move patches. The DOM connection observes rendered elements and commits their changing heights automatically.

<<< ../../examples/virtual/linear-window.ts

`plan.placements` is the only collection the renderer should mount. Keep the complete identity sequence in Core and use `placement.id` as the rendering key.

## Query and scroll

```ts
import {
  linearScrollTarget,
  queryLinearLayout,
} from '@sectile/virtual/linear-layout'

const viewport = { x: 0, y: 12_000, width: 560, height: 480 }
const plan = queryLinearLayout(layout, { viewport, overscan: 240 })
const target = linearScrollTarget(layout, 'item-900', viewport, 'center')
```

Overscan increases mounted work but gives the host more time before an item becomes visible. Start near one viewport or the distance a fast input can cross in one frame, then measure with production content.

## Collection changes

Use `applyLinearPatch()` with the public Core `SequencePatch`. A splice supplies one starting extent per inserted identity. A move retains the existing extents and uses a destination index after source removal. Pass the current plan anchor to preserve the visible identity when changes occur before it.

For asynchronous records, keep `CollectionWindow` in Core. Call `collectionWindowEventForLinearPlan()` only when the render window crosses the loaded range.
