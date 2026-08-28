---
title: Measurement and anchoring
description: Apply real sizes, accept only current measurements, and preserve the anchor's screen position.
---

# Measurement and anchoring

DOM-dependent sizes such as wrapped text, image ratios, and expanded content become known after rendering. Sectile's DOM and Vue connections collect those changes with `ResizeObserver` and apply them to layout in one batch.

## Update order

1. Render placements for the current viewport.
2. Read the sizes of rendered elements together.
3. Apply measurements from the same layout generation as one batch.
4. Update coordinates from the changed range.
5. Apply `scrollDelta` before the next screen is painted.

`generation` identifies the layout that produced a measurement. State accepts measurements whose generation matches the current layout.

## Anchor and `scrollDelta`

The anchor contains a stable ID and its relative viewport position. If a row before the viewport changes size or a new item is inserted, Sectile compares that ID's old and new coordinates. The difference becomes `scrollDelta`, which the DOM connection applies to the actual scroll position.

Vue's `VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial` include this flow. With the low-level API, process `measure()` and the returned state and `scrollDelta` in the same visual update.
