# Virtualization benchmark

Run:

```sh
pnpm --filter @sectile/virtual benchmark
```

The benchmark imports Pretext 0.0.8 through its installed package export. It never reads another package's source or distribution directory. Pretext text is prepared before timing, so its number is the arithmetic `layout()` call only. Sectile timings include persistent geometry lookup, identity-aware plan reduction, immutable generations, and anchor bookkeeping. These are not equivalent operations; use same-runner absolute costs and the combined-path delta instead of presenting the raw ratio as a winner.

Observed on Node 24.19.0, Apple Silicon, macOS:

| Operation | Median time |
|---|---:|
| Pretext one prepared `layout()` | 0.152 µs |
| Pretext 32 prepared layouts | 5.107 µs |
| Extent lookup pair, 100k | 0.624 µs |
| Extent lookup pair, 1m | 0.905 µs |
| Linear window reduction, 100k | 1.226 µs |
| Linear materialized plan, 100k | 7.567 µs |
| Linear changed 32-item measurement batch, 100k | 2.447 µs |
| Pretext 32 layouts plus changed Sectile batch | 7.443 µs |
| Added Sectile bookkeeping in the combined batch | 2.336 µs |
| Sparse track-grid query, 100k regions | 13.896 µs |
| Sparse track-grid changed 32-row batch | 3.158 µs |
| Masonry query, 100k items / 8 lanes | 21.682 µs |
| Spatial packed-tree query, 100k overlapping items | 39.532 µs |

Cold construction observations from the same run:

| Strategy | 100k build |
|---|---:|
| sparse track grid | 47.144 ms |
| masonry, 8 lanes | 18.870 ms |
| spatial packed tree | 71.301 ms |

The stress domains contain 100,000 layout items; the extent lookup also runs at 1,000,000 items. Query viewports move across the domain instead of repeatedly hitting one cached coordinate. The spatial workload returns roughly a viewport-sized cluster from overlapping rectangles, while the grid workload keeps regions sparse.

The script emits one JSON line and intentionally has no machine-dependent pass/fail threshold. Compare commits on the same runner. A regression investigation should separate range reduction, placement allocation, dynamic measurement locality, and cold index construction.
