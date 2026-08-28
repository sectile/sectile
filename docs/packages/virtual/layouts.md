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

For a product-card grid that only flows vertically and changes its column count with viewport width, `VirtualGrid` is the smaller API. `minLaneSize` derives its responsive column count.

## Masonry

Masonry places variable-height cards across lanes while reducing empty space. This example measures the actual DOM height of 30,000 cards and creates only those around the viewport.

<VirtualExample kind="masonry" />

`VirtualMasonry` derives its lane count from viewport width and `minLaneSize`. Once a card is measured, only the affected tail of the layout is updated.

## Spatial

Use spatial layout when a diagram or editor already owns each item's x-y coordinates and size. This example arranges 40,000 service nodes in irregular clusters. With no row-column rule or fixed node size, moving in either direction queries only nodes intersecting the viewport.

<VirtualExample kind="spatial" />

Pass x, y, width, and height through `getRect`. Sectile keeps those coordinates and performs the viewport intersection query.

## Choose by data shape

| Structure already present in the data | Layout |
| --- | --- |
| Order and item size | [Linear](linear.md) |
| Independent rows and columns | Track grid |
| Order and variable card heights | Masonry |
| Existing x-y rectangles | Spatial |
