---
title: DOM connection
description: Connect Virtual layout state to existing DOM scrolling, rendering, and real-size measurement.
---

# DOM connection

`@sectile/dom/virtual` connects an existing DOM surface to Virtual layout. It reads scrolling, observes real element sizes, and applies scroll correction after changes.

## Install and import

```sh
pnpm add @sectile/dom @sectile/virtual
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
} from '@sectile/dom/virtual'
```

## Connect

```ts
const virtualizer = createVirtualizer({
  root: scrollElement,
  state: layout,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(next) {
    layout = next
  },
  onPlanChange(plan, connection) {
    Object.assign(contentElement.style, virtualContentStyle(plan))

    for (const placement of plan.placements) {
      const element = getOrCreateRow(placement.id)
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      connection.registerItem(element, placement.id)
    }
  },
})
```

Keep only the returned placements in the DOM during `onPlanChange`. Connecting an element to its stable ID with `registerItem()` routes size changes back into the same layout state.

## Common methods

| Method | Role |
| --- | --- |
| `registerItem(element, id)` | Connect a DOM element to a placement ID |
| `measure(batch)` | Apply application-supplied measurements |
| `mutate(change)` | Apply item, track, or coordinate changes |
| `scrollTo(id, alignment)` | Move to an item by ID |
| `setOverscan(value)` | Change offscreen preparation distance |
| `refresh()` | Refresh viewport and measurements on the next frame |
| `disconnect()` | End event and observer connections |

Provide `readViewport` and `writeScroll` for right-to-left scrolling or an application-specific coordinate system.
