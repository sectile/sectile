---
title: Virtualization benchmark
description: Browser comparisons across widely used virtualizers and isolated Sectile layout-engine costs.
---

# Virtualization benchmark

The browser suite and Sectile's internal layout benchmark answer different questions. The browser suite includes each framework adapter. The internal suite excludes DOM rendering and measures `@sectile/virtual` layout work.

## Fixed-row browser comparison

Every adapter renders 100,000 fixed 48px rows with identical text and CSS in a 720 × 480px viewport. Each receives an eight-row overscan target. Library order rotates across five rounds; five warm-up scrolls are discarded before 40 samples per round. Scroll time starts when `scrollTop` changes and ends when the expected row appears in the DOM.

Observed on 2026-08-27 in Chrome 151 on Apple Silicon macOS:

| Library | Adapter stack | Initial render | Scroll median | Scroll p95 | Rows | DOM elements |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Sectile Virtual 0.7.0 | Vue 3.5.22 | 3.6 ms | 1.5 ms | 2.7 ms | 27 | 56 |
| TanStack Virtual 3.14.10 | React 19.2.8 | 13.3 ms | 0.9 ms | 1.4 ms | 27 | 56 |
| react-window 2.3.0 | React 19.2.8 | 10.6 ms | 3.7 ms | 7.6 ms | 27 | 56 |
| React Virtuoso 4.18.12 | React 19.2.8 | 40.6 ms | 1.6 ms | 2.2 ms | 27 | 84 |
| react-virtualized 9.22.6 | React 19.2.8 | 15.8 ms | 0.9 ms | 1.5 ms | 20 | 42 |
| Virtua 0.50.5 | React 19.2.8 | 25.9 ms | 1.4 ms | 1.9 ms | 19 | 59 |
| Vue Virtual Scroller 3.0.5 | Vue 3.5.22 | 11.8 ms | 16.7 ms | 17.6 ms | 27 | 84 |

Sectile had the shortest prepared-data initial render at 3.6ms. TanStack Virtual and react-virtualized recorded 0.9ms median scroll response; Sectile recorded 1.5ms and a 2.7ms p95.

Initial render includes adapter mount, the first rows, and one following animation frame. Scroll observations include framework and adapter scheduling, so they are not isolated layout-algorithm timings. Overscan semantics differ; actual rendered rows and DOM elements are disclosed instead of assuming equivalent node counts.

This common-denominator scenario excludes dynamic measurement, collection anchoring after insert/remove/move operations, grids, masonry, and spatial layouts. Forcing those different APIs into one artificial scenario would obscure rather than improve the comparison.

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
