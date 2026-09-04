---
title: Virtualization scaling changes
description: Current ownership, complexity bounds, and browser limits for Sectile Virtual collection and surface framing.
---

# Virtualization scaling changes

Sectile treats virtualization cost as part of the public behavior. The current model separates collection identity, portable layout geometry, browser frame geometry, and Vue projection so each layer can scale with the smallest cardinality its semantics permit.

## Collection changes

`@sectile/virtual/collection` owns raw-array projection, stable-ID reconciliation, size policies, and lane policies. Initial raw projection validates and indexes every item once, so its bound is `O(nItem)` time and retained space.

A raw replacement has no trusted patch descriptor, so unchanged prefix and suffix discovery may still inspect the complete source. With stable resolver provenance, however, IDs are resolved and retained only for the discovered changed window. The contract is `O(nItem + jChanged)` time with `O(jChanged)` additional allocation. Callers that already own a trusted patch can use the owner patch path and avoid rediscovering unchanged raw-array identity.

Value-dependent size policies follow the same boundary. Fixed policies require no value repair; estimated and measured policies invalidate only the changed value window before mounted measurement establishes exact extents again.

## Layout geometry

Linear layout stores the effective surface cross extent in layout state, so placement rectangles and `contentSize` agree with the surface without a CSS-only width correction. A semantically unchanged cross extent returns the existing state.

Grid and Masonry derive lane geometry from the effective surface width through `lanePolicy`. A frame-origin change at the same width does not issue a layout geometry mutation. A true lane-count or lane-extent change may affect the complete dense Grid or Masonry placement domain, so that branch retains its necessary full-repair bound.

Spatial layout keeps application rectangles in the Virtual owner. Moving the surface does not rewrite those rectangles or rebuild the packed spatial index. With `sizeOwnership: 'mounted'`, DOM measurement can replace width and height while StableID preserves the measured size across collection reorder and value updates.

## Browser frame work

`@sectile/dom/virtual` connects an explicit scrollport and surface. Header and footer elements are registered as frame regions, not virtual items. The connection caches frame geometry, coalesces scroll, frame invalidation, measurement, and mutation work into one scheduled frame, and composes frame and layout anchor correction before publishing the next plan.

Ordinary scroll uses cached frame geometry. Explicit refresh or geometry invalidation is the boundary that rereads frame rectangles. Item measurement work is driven by changed mounted entries rather than by scanning the complete logical collection. A connection owns one passive scroll listener, one geometry observer, one item observer, and at most one pending animation frame, all of which are released on disconnect.

## Vue projection

The high-level Vue components share one collection host and project native or consumer item elements directly. They do not create one Sectile component instance per placement. Render work is therefore proportional to emitted placements, while retained item registrations are proportional to mounted identities.

The common public contract uses `StableID`, `getID`, named frame/item slots, explicit size and lane policies, and a stable scrollport/surface anatomy across bootstrap, ready, and empty phases.

## Remaining browser limit

Logical layout size is not clamped to a browser's physical scroll range. Very large logical extents can exceed what a browser can represent as one physical scrollable element. That case requires a separate logical-to-physical scroll-range mapping layer; lowering logical extents or relaxing correctness checks would hide the boundary rather than solve it.

Timing certification is kept separate from these deterministic complexity and resource contracts. Same-machine timing evidence is used when a release or targeted performance decision requires it.
