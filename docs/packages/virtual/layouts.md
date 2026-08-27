---
title: Virtual layout strategies
description: Choose linear, track-grid, masonry, or spatial geometry from the surface contract.
---

# Virtual layout strategies

Choose the lowest-cost strategy that represents the surface without application-side guessing.

<VirtualStrategyLab />

The explorer above builds and queries every plan through these public package APIs:

<<< ../../examples/virtual/strategy-explorer.ts

| Strategy | Use for | Geometry |
| --- | --- | --- |
| linear | lists, feeds, carousels | one ordered track with dynamic item extents |
| track grid | tables, schedules, spreadsheets | independent row and column tracks, sparse merged regions |
| masonry | galleries, boards | shortest-lane or stable round-robin placement |
| spatial | diagrams, canvases, layered editors | arbitrary rectangles, overlap, deterministic z-order |

## Track grid

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createTrackGridLayout } from '@sectile/virtual/track-grid-layout'

const exact = (value: number) => ({ kind: 'exact' as const, value })
const grid = createTrackGridLayout(
  createExtentIndex([exact(32), exact(40), exact(40)]),
  createExtentIndex([exact(180), exact(120), exact(120)]),
  [{ id: 'title', row: 0, column: 0, columnSpan: 3 }],
  { rowGap: 1, columnGap: 1 },
)
```

Storage is proportional to row tracks, column tracks, and declared regions—not `rows × columns`. Blank cells can be projected from returned row and column ranges. Frozen panes are multiple viewport queries over one state.

## Masonry

`shortest` balances columns but later items may change lanes after measurement. `round-robin` preserves lane ownership when continuity matters more than perfect balance. Responsive lane-count changes are explicit geometry mutations and return anchor correction.

## Spatial

Spatial layout accepts arbitrary rectangles and emits placements in `zIndex`, then declaration order. Use it for genuine freeform geometry. Linear and track-grid indexes are cheaper when the surface has regular structure.
