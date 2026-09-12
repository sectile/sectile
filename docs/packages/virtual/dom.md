---
title: DOM connection
description: Connect Virtual layout state to an element or document scroll host with browser measurement and scroll correction.
---

# DOM connection

`@sectile/dom/virtual` connects one physical scroll host and one layout surface to Virtual state. The scroll host can be an `HTMLElement` scroll container or a `Document` for page scrolling. The surface remains the Virtual coordinate origin in either mode, so layouts do not need separate page-coordinate rules.

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
  type VirtualScrollport,
} from '@sectile/dom/virtual'
```

`VirtualScrollport` is `HTMLElement | Document`. Use `Document` for page scrolling; `Window` is not a second public target form.

## Connect an element scroll container

Pass the element that physically owns scrolling together with the surface whose top-left is Virtual coordinate `(0, 0)`.

```ts
const virtualizer = createVirtualizer({
  scrollport: scrollElement,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
  overscan: 240,
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
```

Keep only the returned placements mounted in the surface. `registerItem()` associates a mounted element with its stable ID so later size changes can update the owning layout.

## Use page scrolling

For a virtual surface in ordinary document flow, pass its owning `Document` directly. Sectile uses that document's own browser view and scrolling environment, so the same form works for an iframe-owned document without referring to the ambient global window.

```ts
const virtualizer = createVirtualizer({
  scrollport: document,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
})
```

The application does not forward `window` scroll events, translate page offsets, or apply a second anchor correction. Document scrolling, physical writes, browser clamping, and the final settled viewport stay in the DOM connection.

An external element works the same way:

```ts
const virtualizer = createVirtualizer({
  scrollport: panelElement,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
})
```

One virtualizer selects one physical scrollport. Sectile does not discover or combine a nested ancestor scroll chain automatically.

## Account for sticky or fixed occlusion

If a sticky or fixed region permanently covers part of the layout viewport, declare that occlusion with `viewportInsets`.

```ts
const virtualizer = createVirtualizer({
  scrollport: document,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
  viewportInsets: { top: 64 },
})
```

`viewportInsets` participates in queries, target scrolling, and anchor correction. Sectile does not inspect CSS to infer sticky or fixed coverage.

Ordinary header or footer elements that move the surface can also be registered as frame regions:

```ts
const unregisterHeader = virtualizer.registerFrame(headerElement)
```

A frame region remains outside placements, measurements, and the item domain. Call the returned disposer when the element unmounts.

## Refresh after unrelated page-flow movement

Resize, registered frame changes, viewport resize, and normal scrolling invalidate the geometry they own. If unrelated page content moves the virtual surface without one of those signals, request a new frame measurement explicitly:

```ts
virtualizer.refresh()
```

`refresh()` is the boundary for unsignaled page-flow movement. It replaces application-owned window-scroll adapters; it is not something to call on every scroll.

## Scroll behavior and cost

Ordinary document scrolling reuses the cached surface frame. It reads the physical viewport and runs the owning Virtual query without reading element rectangles on every scroll. Scroll-event bursts are coalesced into scheduled frame work.

Each document-host virtualizer remains an independent connection. A page with many active virtualizers therefore has aggregate query and rendering work proportional to those active connections and the placements they emit. Sectile does not hide unrelated flow changes with document-wide mutation observation or continuous geometry polling.

Measurement and anchor correction are transactional with the selected host. CSS `scroll-behavior`, browser clamping or snapping, and native scroll anchoring may affect physical scrolling, but consumers should not add a parallel page-scroll or anchor adapter to compensate for them.

Document mode uses the layout viewport. It does not define `VisualViewport`, pinch-zoom, or virtual-keyboard semantics.

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
| `refresh()` | Remeasure host geometry on the next frame |
| `flush()` | Publish pending work immediately and return the resulting plan |
| `disconnect()` | End listeners, observers, scheduled work, and registrations |

Custom `readViewport` and `writeScroll` hooks remain available for an application-specific physical coordinate model. They are not required for normal page scrolling. Virtual layout queries remain surface-local, while the DOM connection owns the physical scroll boundary.

Browser physical scroll-range limits for extremely large surfaces are separate from the document-scrollport contract.
