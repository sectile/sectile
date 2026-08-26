---
title: Virtualization
description: Dynamic geometry, layout strategy, anchoring, and host scheduling contracts.
---

# Virtualization

Sectile keeps the logical collection, rendered geometry, and loaded data as separate domains:

```text
Sequence identity/order ─┐
ExtentIndex measurements ├─ Layout strategy ── LayoutPlan ── host renderer
Sparse regions/rects ────┘         │
                                   └─ scrollDelta after mutation

CollectionWindow ── asynchronous data loading only
```

`@sectile/core/sequence` remains the identity and order authority. `@sectile/virtual/extent-index` stores exact, estimated, or fallback geometry in a persistent prefix tree. A layout strategy turns those logical inputs into a renderer-neutral `VirtualLayoutPlan`. `CollectionWindow` only controls asynchronous data loading; a render window is never treated as a loaded-data window.

## Common layout contract

Every strategy accepts a two-dimensional viewport and independent overscan on all four sides. A plan contains content size, render bounds, placements, visibility, generation, and a stable identity anchor. Measurements and domain mutations return a new immutable state plus a two-dimensional scroll delta. Stale measurement generations are rejected instead of being guessed or silently applied.

All coordinates are renderer-neutral. DOM reads, `ResizeObserver`, scroll writes, terminal measurement, and animation scheduling stay in host adapters. State and input arrays are never mutated.

## Strategies

| Strategy | Best fit | Geometry and query model |
|---|---|---|
| linear | lists, feeds, carousels | vertical or horizontal, forward or reverse flow, dynamic per-item extents |
| track grid | spreadsheets, tables, schedules | independent dynamic row/column tracks, sparse and merged regions, independent axis reversal |
| masonry | galleries, boards | shortest-lane or stable round-robin placement, responsive lane geometry, either main axis |
| spatial | canvas, diagrams, layered editors | arbitrary overlapping rectangles, deterministic z-order, packed spatial index |

Track-grid storage is proportional to rows, columns, and declared regions. It does not allocate `rows × columns` cells. Blank spreadsheet cells can be projected from the returned row and column ranges, while merged or otherwise material cells remain explicit sparse regions. Frozen panes are multiple coordinated viewport queries over one state rather than duplicated grid state.

Masonry `shortest` placement may move downstream items when a measurement changes. This is the intended balanced-layout policy. `round-robin` keeps lane ownership stable when visual continuity matters more than perfect balancing. Responsive lane-count changes are explicit geometry mutations and return anchor correction.

Spatial layout permits overlap and emits placements in deterministic `zIndex`, then declaration order. It is the escape hatch for freeform geometry, not a replacement for the cheaper linear or track-grid indexes.

## Dynamic measurement cycle

1. Start with exact, estimated, or unknown-with-fallback extents.
2. Query a plan for the latest viewport.
3. Render only the plan placements.
4. Batch host measurements once with the plan generation.
5. Apply the returned scroll delta before the next paint.
6. Query the next plan.

When geometry before or around the visible anchor changes, the strategy compares that identity's old and new rectangle. The host adds the returned delta without animation. This preserves the anchor's viewport coordinate while allowing measured content to grow, shrink, move between masonry lanes, or span resized grid tracks.

Hosts should coalesce scroll observations per frame, batch all reads before writes, and report measurements together. Per-item read/write alternation is outside the contract and defeats browser layout batching.

## Domain changes and loading

Linear and masonry item mutations consume the same public `SequencePatch` used by collection and reorder semantics. Splices provide one initial extent per inserted identity; moves retain their extents and use post-removal destination indices. Track-grid mutations transform unaffected sparse regions and reject track splices that cut through a merged region; replace regions atomically when a new span is required. Spatial updates preserve existing declaration positions and append new identities.

Use `collectionWindowEventForLinearPlan()` only when a linear render range crosses the loaded range. Request generations and stale-response rejection remain owned by `CollectionWindow`.

Repository verification records the strategy complexity contracts and same-runner benchmark observations separately from this public semantic contract.
