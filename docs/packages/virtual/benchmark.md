---
title: Virtualization benchmark
description: Same-condition measurements of display speed, dynamic height handling, and collection mutation stability across widely used virtualizers.
---

# Virtualization benchmark

Seven libraries render the same 100,000 rows. The suite measures initial display, scroll response, and the time required to settle after inserts, moves, removals, and height changes. Change the controls to compare every result in the same chart.

<VirtualBenchmarkReport />

In this run, Sectile completed 1,200 collection mutations across estimated and omitted-height modes without a recorded visual failure or a two-second recovery timeout.

## Why height input is split into three modes

The suite measures exact heights, estimates, and omitted height input separately. Combining them would hide the cost difference between a fixed-size fast path and DOM measurement.

- Fixed: the application supplies the exact 48px height.
- Estimated: the application supplies 48px for the initial layout, then the library reads the actual DOM height.
- No height input: the application omits both an exact height and an estimate, and the library completes the layout from DOM measurement.

Libraries that cannot start without a height or estimate are not given a synthetic value. The support table records the required input instead.

The height-change scenario expands one visible row to 96px. The browser DOM supplies the measured height; the exact 96px value is not passed back into the virtualization API.

Each adapter follows its library’s required integration. `react-virtualized` requires an explicit measurement-cache invalidation and layout recomputation call. The other adapters use APIs that observe DOM size changes automatically. That application-side work remains inside the timing boundary.

## Collection mutation scenario

Insert, move, remove, and height-change operations run at three collection positions:

- start: the first row;
- middle: row 50,000 aligned with the viewport start;
- end: the final row visible at the bottom boundary.

Insert, remove, and height change affect one row at that position. Move swaps it with the adjacent row. Every sample starts from the same 100,000-row collection, and each scenario runs 50 times.

Timing starts with the update request and ends on the first frame where DOM order, row heights, total scroll height, and anchor position are all correct. Five independent instances contribute ten samples each. Between samples, the runner restores and verifies the original collection; a failed restore discards that instance and mounts a fresh one. Clean and recovered samples are counted separately. A recovered sample retains both its recovery time and every observed correctness failure.

The settle bars cover every sample that reached a correct screen. Recovery bars use only samples that showed an incorrect screen before recovering. A failed condition is shown instead of a timing bar.

## Failure criteria

Every frame is checked for missing or duplicate IDs, incorrect order or height, gaps, overlap, blank viewport regions, total scroll-height errors, and unexpected anchor movement. Any incorrect frame creates a correctness record. An incorrect layout that remains unchanged for at least 300ms and eight frames is a hard failure. A layout whose coordinates keep changing remains under observation for up to two seconds. Sectile failures carry `fatal` severity in the raw result.

## Initial render and scrolling

The fixed-height suite renders 100,000 identical 72px rows in a 720 × 480px viewport. Text, CSS, input data, and the requested eight-row overscan target are shared. The actual 72px height differs from Sectile's 48px internal fallback, so the application-estimate and omitted-height paths begin with different geometry.

Library order rotates across five rounds. Initial rendering is split into synchronous setup, first row output, and the first state with correct total scroll height and viewport geometry. A visible row with an incorrect total height is not considered complete.

Each round discards five warm-up scrolls and records the next 40. The harness changes `scrollTop` after a frame boundary. Timing starts when the browser begins delivering the native scroll event and ends immediately after the runner reads the resulting DOM geometry. The exact target row, contiguous row geometry, total scroll height, and viewport coverage are then validated against that snapshot outside the timed interval.

The chart uses the conservative upper bound taken after geometry reads. Raw samples also retain the lower bound before those reads, probe cost, correctness-check count, round and sample number, MAD, and per-round ranges. This keeps validation work out of the score without hiding measurement uncertainty or a slow round.

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
