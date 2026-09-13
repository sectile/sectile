# Core geometry consumer-bundle baseline repair

Status: Accepted
Date: 2026-09-13

## Context

Release verification rejected the named `@sectile/core/geometry` fixture because its consumer-bundle baseline still represented the pre-validation implementation. The current esbuild bundle is 1,876 raw bytes against a 477-byte effective gate, and the current Vite bundle is 1,144 raw bytes against a 396-byte effective gate.

The increase was introduced by `08fa2570 fix(core): reject non-finite derived rectangles`, which routes `intersectRects()` and the other derived rectangle constructors through `createRect()` so overflowing arithmetic cannot publish invalid geometry. That commit is already shipped in `@sectile/core@0.14.5`.

The official npm `@sectile/core@0.14.5` artifact was bundled with the same repository `bundleFixture()` implementation and the same `intersectRects` named-import fixture. Its esbuild and Vite byte counts match the current release candidate exactly. All 80 Core fixtures were also run against the published package; only these two geometry results exceed the stored baseline, and neither introduces an external dependency.

## Decision

Repair only the two `core:./geometry:named` results in `verification/consumer-bundles/baseline.json` using the already-published `@sectile/core@0.14.5` results. Do not re-record the full consumer-bundle baseline and do not use the current release candidate as an independent justification for a larger allowance.

| Bundler / size | Stale baseline | Stale effective gate | Published 0.14.5 | Current candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: |
| esbuild raw | 439 B | 477 B | 1,876 B | 1,876 B | 1,986 B |
| esbuild gzip | 259 B | 288 B | 852 B | 852 B | 911 B |
| esbuild brotli | 217 B | 244 B | 738 B | 738 B | 791 B |
| Vite raw | 361 B | 396 B | 1,144 B | 1,144 B | 1,218 B |
| Vite gzip | 223 B | 251 B | 600 B | 600 B | 646 B |
| Vite brotli | 186 B | 212 B | 521 B | 521 B | 564 B |

The existing five-percent-plus-16-byte bundle comparison formula remains unchanged.

## Consumer impact

This is a verification-provenance repair for behavior already present in the published package. Consumers of the release candidate receive the same `intersectRects` named-import bundle size as `@sectile/core@0.14.5`. The closure remains dependency-free; the additional bytes are the Core-owned finite-rectangle validation and result path required to reject invalid derived geometry.
