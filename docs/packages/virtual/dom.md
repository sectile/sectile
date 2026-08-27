---
title: Virtual DOM connection
description: Connect a layout strategy to browser measurement, scrolling, and application-owned markup.
---

# Virtual DOM connection

`@sectile/dom/virtual` schedules browser work around any Virtual strategy. It owns observers and frame ordering, not collection records or markup.

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
} from '@sectile/dom/virtual'
import { linearLayoutStrategy } from '@sectile/virtual/linear-layout'

const virtualizer = createVirtualizer({
  root: scrollElement,
  state: linearState,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(state) {
    linearState = state
  },
  onPlanChange(plan, connection) {
    Object.assign(contentElement.style, virtualContentStyle(plan))
    reconcileItems(plan.placements, (element, placement) => {
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      return connection.registerItem(element, placement.id)
    })
  },
})
```

One animation frame collects root and item resize notifications, reads measurements as a batch, applies one semantic update, writes anchor correction, and publishes the next plan.

## Connection methods

- `registerItem()` associates a mounted element with a stable identity.
- `measure()` submits strategy-specific evidence such as row and column tracks.
- `mutate()` changes items or geometry through the same anchored path.
- `scrollTo()` targets an identity even when it is not mounted.
- `setOverscan()` updates the render margin without rebuilding the layout.
- `disconnect()` removes observers and listeners.

The default viewport uses non-negative physical `scrollLeft` and `scrollTop`. Provide `readViewport` and `writeScroll` for RTL or custom coordinate systems.
