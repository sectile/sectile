---
title: DOM connection
description: Connect Virtual layout state to an explicit scrollport and surface with browser measurement and scroll correction.
---

# DOM connection

`@sectile/dom/virtual` connects a physical scrollport and a layout surface to Virtual state. The scrollport owns browser scrolling; the surface is the coordinate origin and receives the layout plan's content size. Optional header and footer regions remain outside the item domain.

## Install and import

```sh
pnpm add @sectile/dom @sectile/virtual
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualItemStyle,
  virtualSurfaceStyle,
} from '@sectile/dom/virtual'
```

## Connect

```ts
const virtualizer = createVirtualizer({
  scrollport: scrollElement,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
  overscan: 240,
  viewportInsets: { top: 48 },
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(next) {
    layout = next
  },
  onPlanChange(plan, connection) {
    Object.assign(surfaceElement.style, virtualSurfaceStyle(plan))

    for (const placement of plan.placements) {
      const element = getOrCreateRow(placement.id)
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      connection.registerItem(element, placement.id)
    }
  },
})

const unregisterHeader = virtualizer.registerFrame(headerElement)
```

Keep only the returned placements in the surface during `onPlanChange`. `registerItem()` connects a mounted element to its stable ID so size changes feed the owning layout. `registerFrame()` marks ordinary header or footer DOM as frame geometry; it does not add that element to placements, measurements, or anchors. Call its returned disposer when the frame element unmounts.

`viewportInsets` is for persistent occlusion such as sticky or overlay UI. It is explicit input; the connection does not infer sticky behavior from computed styles.

## Common methods

| Method | Role |
| --- | --- |
| `registerFrame(element)` | Observe a bounded frame region outside the item domain |
| `registerItem(element, id)` | Connect a DOM element to a placement ID |
| `measure(batch)` | Apply application-supplied measurements |
| `mutate(change)` | Apply item, track, or coordinate changes |
| `scrollTo(id, alignment)` | Move to an item by ID |
| `setOverscan(value)` | Change offscreen preparation distance |
| `setViewportInsets(value)` | Change persistent viewport occlusion |
| `refresh()` | Invalidate frame and viewport geometry for the next frame |
| `flush()` | Publish pending work immediately and return the resulting plan |
| `disconnect()` | End listeners, observers, scheduled work, and registrations |

Provide `readViewport` and `writeScroll` for right-to-left scrolling or an application-specific physical coordinate model. Virtual layout queries remain surface-local; physical clamping occurs only when the DOM connection writes scroll coordinates.
