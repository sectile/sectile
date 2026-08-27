---
title: Virtual
description: Renderer-neutral viewport queries, dynamic measurement, layout strategies, and anchor correction.
---

# Virtual

`@sectile/virtual` is a framework-independent layout engine that calculates **where a large collection belongs and which placements should render now**. Give it stable IDs, order, estimated extents or rectangles, and a viewport; it returns the full content size and nearby placements as a `VirtualLayoutPlan`.

When measured geometry differs from its estimate—or items are inserted, removed, moved, or resized—the engine returns a new layout state and `scrollDelta`. The host applies that correction to keep the item being read at the same viewport position. Linear, track-grid, masonry, and arbitrary spatial layouts share one query, measurement, and mutation contract. DOM and Vue adapters connect those calculations to browser measurement and rendering.

## Where Sectile Virtual is strongest

<VirtualStrengthOverview />

## Install

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
```

## How it compares

Conventional list virtualization has many good options. TanStack Virtual provides a broad headless virtualizer; react-window keeps conventional React lists and grids concise. React Virtuoso supplies higher-level list behavior, react-virtualized offers a mature component collection, Virtua spans several frameworks, and Vue Virtual Scroller connects directly to Vue collections.

Sectile differs in **how much layout state one model owns**. Dynamic list measurement and anchor correction share state transitions with grids, masonry, and arbitrary spatial surfaces.

<VirtualLibraryComparison />

The browser suite separates fixed and dynamic height conditions, then compares initial rendering, scrolling, and the time required to settle after inserts, moves, removals, and height changes. Current results and execution details are published in the [virtualization benchmark](/packages/virtual/benchmark).

## Customer request list

Work with 50,000 customer requests rendered as complete component rows with selection, disclosures, status, metrics, and activity history. Changing the view or adding a reply alters row height, and browser measurements update the layout automatically. Insert, remove, or move requests before the viewport and the item being read stays in place.

<VirtualWindowLab />

## Compare every strategy

The same viewport contract drives 50k linear records, 48k grid cells, 30k masonry tiles, and 25k spatial nodes. Switch strategies and scroll both axes to compare actual placement plans against the number of DOM nodes created.

<VirtualStrategyLab />

## Learning path

1. [Mental model](virtual/concepts.md): identity, geometry, render windows, and loaded windows.
2. [Linear lists](virtual/linear.md): dynamic rows, overscan, scrolling, and collection changes.
3. [Grid, masonry, and spatial layouts](virtual/layouts.md): choose the lowest-cost fitting strategy.
4. [Measurement and anchoring](virtual/measurement.md): generation-safe measurement and scroll correction.
5. [DOM connection](virtual/dom.md): browser scheduling, reads, writes, and normalized scrolling.
6. [Vue connection](virtual/vue.md): `useVirtualizer` and headless rendering parts.
7. [Benchmark](virtual/benchmark.md): same-list browser observations across widely used libraries.

Runtime layout states are opaque handles. Use each strategy's `snapshot*Layout()` and `restore*Layout()` pair when state must cross a worker or serialization boundary.
