---
title: Virtual mental model
description: Keep identity, geometry, rendered ranges, and loaded data as separate domains.
---

# Virtual mental model

Virtualization is not one list with hidden state. Four domains cooperate through explicit values. Dynamic extent evidence remains a first-class input, so measurement, insertion, removal, movement, and live resizing can update geometry without losing identity or viewport position.

<VirtualConceptDiagram />

## Keep the windows separate

- **viewport**: the rectangle currently visible to the user
- **render bounds**: viewport plus overscan
- **placements**: identities whose geometry intersects the render bounds
- **loaded window**: records currently available to the application

A placement range is not a loaded-data range. The first changes with scrolling; the second changes when asynchronous requests are accepted. `collectionWindowEventForLinearPlan()` is a bridge, not shared state.

## One strategy contract

Every strategy accepts a two-dimensional viewport and optional overscan. A `VirtualLayoutPlan` returns content size, normalized render bounds, placements, visibility, generation, and an identity anchor.

Measurements and mutations produce a new immutable layout state plus `scrollDelta`. The host renders placements and performs effects. Virtual never reads DOM geometry or mutates input arrays.

## Extent evidence

`ExtentIndex` stores one of three kinds for each indexed item:

| Kind | Meaning |
| --- | --- |
| `exact` | measured or otherwise authoritative size |
| `estimated` | provisional size expected to be close |
| `unknown` | size is unknown; use an explicit fallback until measured |

Choose a realistic fallback. It determines initial scroll range and how much correction measurement may require.
