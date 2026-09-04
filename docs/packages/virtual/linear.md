---
title: Linear lists
description: Measure variable-height rows and preserve the reading position after collection changes.
---

# Linear lists

Use linear layout for feeds, messages, search results, and other surfaces ordered along one axis. It supports vertical and horizontal flow, gaps, variable sizes, and ID-based scrolling. The placement cross extent comes from the effective virtual surface rather than from a CSS-only width correction.

## Example

These 50,000 rows repeat four different heights. Vue and DOM environments can refine item extents from mounted elements. Core and Terminal environments query the same layout state directly.

<VirtualExample kind="list" />

## Choose a size policy

| Available information | Vue `sizePolicy` | Behavior |
| --- | --- | --- |
| One exact size for every item | `{ kind: 'fixed', extent }` | Skip DOM measurement for the main axis |
| A useful starting estimate | `{ kind: 'estimated', estimate }` | Start from the estimate and refine mounted items |
| DOM must establish the initial estimate | `{ kind: 'measured' }` | Bootstrap from rendered items, then continue measuring mounted changes |

For the low-level DOM connection, pass `createAxisMeasurementResolver('vertical')` or `'horizontal'` to `createVirtualizer`. Core expresses the same state with exact, estimated, or unknown extents.

## Collection changes

Keep stable IDs when inserting, removing, or moving items. Sectile retains measurements for IDs that remain and corrects the anchor position by the amount that changed before the viewport.

Use Vue's `scrollToID()`, the DOM connection's `scrollTo()`, or Core's `linearScrollTarget()` to move to an item by ID.
