---
title: Grid, masonry, and spatial layouts
description: Virtualize large two-axis grids, variable-height cards, and wide coordinate spaces.
---

# Grid, masonry, and spatial layouts

Choose the layout that matches the structure already present in the surface. Every code tab follows the **Usage** environment selected in the top navigation.

## Track grid

Use a track grid when rows and columns are both independently large. This example contains **300 rows × 300 columns**, or 90,000 cells with equal axis counts. Scrolling in either direction keeps only the cells inside the viewport and overscan in the DOM.

<VirtualExample kind="grid" />

A track grid manages row heights and column widths separately. Spanning regions can occupy multiple tracks in the same coordinate system. In Vue, connect `trackGridLayoutStrategy` to `VirtualizerRoot`.

For a product-card grid that only flows vertically, `VirtualGrid` is the smaller API. Give it a responsive `lanePolicy`, for example `{ kind: 'responsive', minExtent: 180, maxCount: 6, gap: 12 }`, to derive lane geometry from the effective surface width.

## Masonry

Masonry places variable-height cards across lanes while reducing empty space. This example measures the actual DOM height of 30,000 cards and creates only those around the viewport.

<VirtualExample kind="masonry" />

`VirtualMasonry` uses the same `lanePolicy` model as Grid. Pair it with an estimated or measured `sizePolicy` when mounted card heights should refine the layout; fixed-size cards can use a fixed size policy instead.

## Spatial

Use spatial layout when a diagram or editor already owns each item's x-y coordinates and size. This example arranges 40,000 service nodes in irregular clusters. With no row-column rule or fixed node size, moving in either direction queries only nodes intersecting the viewport.

<VirtualExample kind="spatial" />

Pass x, y, width, and height through `getRect`. Use `sizeOwnership: 'declared'` when those dimensions remain authoritative, or `'mounted'` when DOM measurement should replace width and height while preserving the application's x-y position. Surface movement itself does not rewrite application rectangles.

## Choose by data shape

| Structure already present in the data | Layout |
| --- | --- |
| Order and item size | [Linear](linear.md) |
| Independent rows and columns | Track grid |
| Order and variable card heights | Masonry |
| Existing x-y rectangles | Spatial |
