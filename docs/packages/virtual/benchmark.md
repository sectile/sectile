---
title: Virtualization benchmark
description: Same-condition measurements of display speed, DOM output, dynamic height handling, and collection mutation stability across widely used virtualizers.
---

# Virtualization benchmark

Seven libraries render the same 100,000 rows. The suite measures initial display, scroll response, actual DOM output, and the time required to settle after inserts, moves, removals, and height changes.

<VirtualBenchmarkReport />

## Dynamic height scenario

Every row begins with a 48px estimate. The height-change scenario expands one visible row to 96px. The browser DOM supplies the measured height; the exact 96px value is not passed back into the virtualization API.

Each adapter follows its library’s required integration. `react-virtualized` requires an explicit measurement-cache invalidation and layout recomputation call. The other adapters use APIs that observe DOM size changes automatically. That application-side work remains inside the timing boundary.

## Collection mutation scenario

Insert, move, remove, and height-change operations run at three collection positions:

- start: the first row;
- middle: row 50,000 aligned with the viewport start;
- end: the final row visible at the bottom boundary.

Insert, remove, and height change affect one row at that position. Move swaps it with the adjacent row. Every sample starts from the same 100,000-row collection, and each scenario runs ten times.

Timing starts with the update request and ends on the first frame where DOM order, row heights, total scroll height, and anchor position are all correct. If a frame is incorrect before recovery, the result keeps both its settle time and a failure record.

## Failure criteria

Every frame is checked for missing or duplicate IDs, incorrect order or height, gaps, overlap, blank viewport regions, total scroll-height errors, and unexpected anchor movement. Any incorrect frame fails the correctness check. Three identical invalid frames in succession mark a scenario as unable to settle. Sectile failures carry `fatal` severity in the raw result.

## Fixed-height comparison

The fixed-height suite renders 100,000 identical 48px rows in a 720 × 480px viewport. Text, CSS, input data, and the requested eight-row overscan target are shared.

Library order rotates across five rounds. Each round discards five warm-up scrolls and records the next 40. Scroll time starts when `scrollTop` changes and ends when the target row appears in the DOM.

Rendered rows include the visible and overscan rows. DOM elements include each library’s internal wrappers. Those differences remain part of the end-to-end cost of producing the same HTML rows.

Measurements were recorded on 2026-08-27 in Chrome 151 on Apple Silicon macOS. Absolute timings vary by machine and browser state; compare the relative results together with correctness failures.

The suite covers [TanStack Virtual](https://www.npmjs.com/package/%40tanstack/react-virtual), [react-window](https://www.npmjs.com/package/react-window), [React Virtuoso](https://www.npmjs.com/package/react-virtuoso), [react-virtualized](https://www.npmjs.com/package/react-virtualized), [Virtua](https://www.npmjs.com/package/virtua), and [Vue Virtual Scroller](https://www.npmjs.com/package/vue-virtual-scroller). Runner code and committed JSON live in `benchmarks/virtual-ecosystem`.

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

## Isolated Sectile layout work

The browser suite includes framework and DOM work. This command isolates `@sectile/virtual` extent indexing, viewport queries, and layout-plan creation:

```sh
pnpm --filter @sectile/virtual benchmark
```

Observed on 2026-08-27 with Node 24.19.0, Apple Silicon, macOS:

| Operation | Median time |
|---|---:|
| Extent lookup pair, 100k | 0.676 µs |
| Extent lookup pair, 1m | 0.870 µs |
| Linear window reduction, 100k | 1.237 µs |
| Linear materialized plan, 100k | 7.694 µs |
| Linear changed 32-item measurement batch, 100k | 2.857 µs |
| Sparse track-grid query, 100k regions | 13.841 µs |
| Sparse track-grid changed 32-row batch | 5.451 µs |
| Masonry query, 100k items / 8 lanes | 21.873 µs |
| Spatial packed-tree query, 100k overlapping items | 39.982 µs |

| Strategy | 100k index construction |
|---|---:|
| sparse track grid | 45.742 ms |
| masonry, 8 lanes | 16.467 ms |
| spatial packed tree | 73.927 ms |

The query viewport moves across each domain instead of repeatedly hitting one cached coordinate. Re-run before and after a change on the same machine when evaluating a regression.
