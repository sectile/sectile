---
title: Virtualization benchmark
description: Same-condition measurements of display speed, dynamic height handling, and collection mutation stability across widely used virtualizers.
---

# Virtualization benchmark

Seven libraries render the same 100,000 rows. The suite measures initial display, scroll response, and the time required to settle after inserts, moves, removals, and height changes. Change the controls to compare every result in the same chart.

<VirtualBenchmarkReport />

## Row profiles

The uniform profile isolates each library's base cost with identical 72px rows. The heterogeneous profile uses 256 deterministic combinations of titles, summaries, tags, and expanded details. Its measured row heights range from 71px to 159px.

The application does not calculate per-row heights. Each library measures the DOM it renders, while a separate calibration fixture supplies geometry only to the correctness validator. Visible rows are checked for order, overlap, gaps, viewport coverage, and anchor position. Total-height estimation error is reported separately for heterogeneous rows because unseen content has not been measured yet.

## Why height input is split into three modes

The suite measures exact heights, estimates, and omitted height input separately. Combining them would hide the cost difference between a fixed-size fast path and DOM measurement.

- Fixed: the application supplies the exact 72px height. This mode is available for the uniform profile.
- Estimated: the application supplies one common 72px estimate, then the library reads the actual DOM height.
- No height input: the application omits both an exact height and an estimate. Sectile renders an initial viewport-sized sample, measures those elements, and derives the remaining extent from those measurements.

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

Both row profiles render 100,000 rows in a 720 × 480px viewport. Text, CSS, input data, and the requested eight-row overscan target are shared. The no-height-input path starts from measured DOM rather than a library-wide numeric fallback.

Library order rotates across three to five rounds. A condition stops after three rounds when its cumulative median and p95 are stable; otherwise it continues through round five. Initial rendering is split into synchronous setup, first row output, and the first state with correct viewport geometry. Uniform rows also require the exact total scroll height. Heterogeneous rows retain total-height estimation error as a separate result.

Each round discards five warm-up scrolls and records the next 20. The harness changes `scrollTop` after a frame boundary. Timing starts when the browser begins delivering the native scroll event and ends immediately after the runner reads the resulting DOM geometry. The exact target row, contiguous row geometry, and viewport coverage are then validated against that snapshot outside the timed interval. Uniform rows also validate total scroll height.

The chart uses the conservative upper bound taken after geometry reads. Raw samples also retain the lower bound before those reads, probe cost, correctness-check count, round and sample number, MAD, and per-round ranges. This keeps validation work out of the score without hiding measurement uncertainty or a slow round.

The initial-render and scroll observation was recorded on 2026-08-28 in Chrome 151 on Apple Silicon macOS after removing Sectile's numeric automatic-height fallback. All 27 supported profile and height-input conditions completed; the uniform automatic condition reported 0% total-height error, and the heterogeneous automatic condition reported 3.967% initial total-height error. Absolute timings vary by machine and browser state; compare relative results together with correctness and height-error data.

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
