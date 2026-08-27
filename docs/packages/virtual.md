---
title: Virtual
description: Automatic measurement, anchored collection changes, and four layout strategies for large dynamic surfaces.
---

# Virtual

`@sectile/virtual` manages layout for large surfaces whose item sizes and order keep changing. Insert items before the viewport, expand a row, or change the number of grid columns; Sectile calculates the new coordinates and render range. The returned `scrollDelta` preserves the viewport coordinate of the anchor item across that change.

Vue applications can omit exact item heights from `VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial`. The DOM adapter measures rendered elements and Sectile updates layout from the changed region. Lists, responsive grids, masonry cards, and spatial surfaces share this measurement and mutation flow.

## Sectile Virtual strengths

<VirtualStrengthOverview />

## Install

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
```

## Validation scope

The browser benchmark separates fixed and dynamic height conditions, then measures initial rendering and scrolling. It also records time to reach a correct screen after inserts, moves, removals, and height changes, along with every visual failure. Current results, failure criteria, and execution details are published in the [virtualization benchmark](/packages/virtual/benchmark).

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
7. [Benchmark](virtual/benchmark.md): timing and visual stability for initial rendering, scrolling, and dynamic changes.

Runtime layout states are opaque handles. Use each strategy's `snapshot*Layout()` and `restore*Layout()` pair when state must cross a worker or serialization boundary.
