# Vue Virtual Grid consumer-bundle baseline ratchet

Status: Accepted
Date: 2026-09-13

## Context

Release verification rejected the `@sectile/vue/virtual/grid` named `VirtualGrid` fixture after sparse Track Grid region validation was changed by `04356679 perf(virtual): bound sparse region validation`. That change replaced an active-set overlap scan with a bounded sweep/tree implementation and added `@sectile/virtual/dist/internal/region-overlap.js` to the Track Grid closure.

The stored esbuild reference is 71,668/20,640/18,557 raw/gzip/brotli bytes and the stored Vite reference is 72,066/20,548/18,504 bytes. The already-published Vue 0.17.0 package combination remains within those old gates at 73,181/21,682/19,458 bytes under esbuild and 73,437/21,514/19,392 bytes under Vite, but it leaves almost no remaining compressed-size allowance.

The current candidate is 73,254/21,792/19,545 bytes under esbuild and 73,513/21,620/19,434 bytes under Vite. Relative to the published package combination, the bounded overlap implementation adds 73 raw and 110 gzip bytes under esbuild, and 76 raw and 106 gzip bytes under Vite. It adds no external dependency.

The Virtual runtime suite passes all 90 tests, including the 4,096-region `ISSUE-092` work-counter case that bounds binary-search and tree work to logarithmic factors instead of the previous active-set quadratic worst case.

## Decision

Accept the bounded sparse-region validation cost and ratchet only the two `vue:./virtual/grid:named` results in `verification/consumer-bundles/baseline.json` to the stabilized release-candidate measurements. This is an explicit performance-for-delivery tradeoff, not a blanket re-recording of the Vue or repository-wide baseline.

| Bundler / size | Previous baseline | Previous effective gate | Published 0.17.0 | Approved candidate | Published → candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| esbuild raw | 71,668 B | 75,268 B | 73,181 B | 73,254 B | +73 B | 76,933 B |
| esbuild gzip | 20,640 B | 21,688 B | 21,682 B | 21,792 B | +110 B | 22,898 B |
| esbuild brotli | 18,557 B | 19,501 B | 19,458 B | 19,545 B | +87 B | 20,539 B |
| Vite raw | 72,066 B | 75,686 B | 73,437 B | 73,513 B | +76 B | 77,205 B |
| Vite gzip | 20,548 B | 21,592 B | 21,514 B | 21,620 B | +106 B | 22,717 B |
| Vite brotli | 18,504 B | 19,446 B | 19,392 B | 19,434 B | +42 B | 20,422 B |

The existing five-percent-plus-16-byte consumer-bundle policy remains unchanged.

## Consumer impact

Virtual Grid consumers pay about 0.5% additional compressed code relative to the already-published package combination in exchange for bounded sparse-region overlap validation. The closure keeps the same Sectile package owners and `vue` external dependency; only the new Virtual-owned overlap helper is added.
