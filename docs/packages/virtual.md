---
title: Virtual
description: Measure real elements, update only the affected layout range, and preserve scroll position.
---

# Virtual

`@sectile/virtual` lays out large surfaces whose item sizes and order keep changing. Once an element renders, its browser size updates coordinates from the changed point onward. Inserts, removals, and moves before the viewport also preserve the screen position of the item currently being read.

## Install

The command follows the **Usage** environment selected in the top navigation.

<VirtualInstall />

## Variable-height list

This list contains 50,000 rows with different heights. Sectile creates only the rows around the viewport and automatically applies their actual DOM sizes. The code tab shows only the implementation for the selected **Usage** environment.

<VirtualExample kind="list" />

## What Sectile handles

- **Real element sizes**: rendered elements can supply their dimensions without a fixed height or an application-owned sizing function.
- **Incremental layout**: changing one size updates coordinates from the affected range.
- **Anchored scrolling**: collection and size changes preserve the viewport position of the current anchor.
- **Large two-dimensional surfaces**: lists, track grids, masonry, and spatial layouts share the same query and measurement flow.

## Choose a layout

| Surface | Layout | Read more |
| --- | --- | --- |
| One ordered axis | Linear | [Linear lists](virtual/linear.md) |
| Many rows and many columns | Track grid | [Grid, masonry, and spatial](virtual/layouts.md#track-grid) |
| Variable-height cards | Masonry | [Grid, masonry, and spatial](virtual/layouts.md#masonry) |
| Application-positioned canvas | Spatial | [Grid, masonry, and spatial](virtual/layouts.md#spatial) |

## Continue

- [Core concepts](virtual/concepts.md): viewport, overscan, placement, and anchor.
- [Measurement and anchoring](virtual/measurement.md): when real sizes and scroll corrections are applied.
- [DOM connection](virtual/dom.md): connect existing markup with `createVirtualizer`.
- [Vue connection](virtual/vue.md): `VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial`.
- [Benchmark](virtual/benchmark.md): initial render, scrolling, stabilization time, and visual failures.
