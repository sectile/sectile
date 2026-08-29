---
title: Virtualization benchmark
description: Browser comparisons across widely used virtualizers and isolated Sectile layout-engine costs.
---

# Virtualization benchmark

The browser suite and Sectile's internal layout benchmark answer different questions. The browser suite includes each framework adapter. The internal suite excludes DOM rendering and measures `@sectile/virtual` layout work.

## Browser comparison

<VirtualBenchmarkReport />

Every adapter renders the same 100,000 rows in a 720 × 480px viewport. Fixed, estimated, and omitted-height conditions are measured separately. Insert, move, remove, and height-change operations also run at the start, middle, and end of the collection.

Initial render and scrolling rotate library order across five rounds. Each mutation runs ten times. Any incorrect frame—row order, height, total scroll height, or anchor position—is recorded as a failure independently of timing.

Scroll timing begins when the browser starts delivering the native scroll event and ends after the runner has read the resulting DOM geometry. The chart uses this conservative upper bound. Raw results also retain the lower bound before geometry reads, probe cost, correctness-check count, MAD, and per-round ranges.

Observed on 2026-08-27 in Chrome 151 on Apple Silicon macOS. Framework and adapter scheduling remain inside the timing boundary, so these are not isolated layout-algorithm measurements.

The comparison covers [TanStack Virtual](https://www.npmjs.com/package/%40tanstack/react-virtual), [react-window](https://www.npmjs.com/package/react-window), [React Virtuoso](https://www.npmjs.com/package/react-virtuoso), [react-virtualized](https://www.npmjs.com/package/react-virtualized), [Virtua](https://www.npmjs.com/package/virtua), and [Vue Virtual Scroller](https://www.npmjs.com/package/vue-virtual-scroller). The runner and committed JSON live in `benchmarks/virtual-ecosystem`.

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

## Isolated Sectile layout engine

Run:

```sh
pnpm --filter @sectile/virtual benchmark
```

Observed on 2026-08-27 with Node 24.19.0, Apple Silicon, macOS:

| Operation | Median time |
|---|---:|
| Pretext one prepared `layout()` | 0.608 µs |
| Pretext 32 prepared layouts | 4.977 µs |
| Extent lookup pair, 100k | 0.676 µs |
| Extent lookup pair, 1m | 0.870 µs |
| Linear window reduction, 100k | 1.237 µs |
| Linear materialized plan, 100k | 7.694 µs |
| Linear changed 32-item measurement batch, 100k | 2.857 µs |
| Pretext 32 layouts plus changed Sectile batch | 7.730 µs |
| Added Sectile bookkeeping in the combined batch | 2.753 µs |
| Sparse track-grid query, 100k regions | 13.841 µs |
| Sparse track-grid changed 32-row batch | 5.451 µs |
| Masonry query, 100k items / 8 lanes | 21.873 µs |
| Spatial packed-tree query, 100k overlapping items | 39.982 µs |

Cold construction observations from the same run:

| Strategy | 100k build |
|---|---:|
| sparse track grid | 45.742 ms |
| masonry, 8 lanes | 16.467 ms |
| spatial packed tree | 73.927 ms |

The query viewport moves across each domain instead of repeatedly hitting one cached coordinate. The spatial workload returns roughly a viewport-sized cluster from overlapping rectangles, while the grid workload keeps regions sparse.

Pretext measures prepared text line layout. Sectile includes persistent geometry lookup, identity-aware placement materialization, measurement generations, and anchor bookkeeping. The operations are not equivalent, so the raw ratio is not presented as a winner.

Both scripts intentionally omit machine-dependent pass/fail thresholds. Re-run before and after a change on the same machine and browser.

Large-collection findings and the implementation work derived from them are tracked in [virtualization scaling work](virtualization-improvements.md).
