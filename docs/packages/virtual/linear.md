---
title: Linear lists
description: Measure variable-height rows and preserve the reading position after collection changes.
---

# Linear lists

Use linear layout for feeds, messages, search results, and other surfaces ordered along one axis. It supports vertical and horizontal flow, gaps, variable sizes, and ID-based scrolling.

## Example

These 50,000 rows repeat four different heights. Vue and DOM environments measure the rendered elements automatically. Core and Terminal environments show the same viewport query as data.

<VirtualExample kind="list" />

## Choose a size mode

| Available information | Vue prop | Behavior |
| --- | --- | --- |
| Actual DOM size only | Omit both | Measure the initial render range, then create the virtual layout from that sample |
| Approximate starting size | `estimateSize` | Start from the estimate and replace it with real measurements |
| Exact fixed size for every item | `itemSize` | Skip measurement and calculate from the fixed size |

For DOM, pass `createAxisMeasurementResolver('vertical')` or `'horizontal'` to `createVirtualizer`. Core represents the same choice with `unknown`, `estimated`, and `exact` extents.

## Collection changes

Keep stable IDs when inserting, removing, or moving items. Sectile retains measurements for IDs that remain and corrects the anchor position by the amount that changed before the viewport.

Use Vue's `scrollTo()`, the DOM connection's `scrollTo()`, or Core's `linearScrollTarget()` to move to an item by ID.
