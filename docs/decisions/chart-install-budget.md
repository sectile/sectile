# Chart install budget

Status: Accepted
Date: 2026-09-02

## Context

The Chart model and projection changes add two required runtime kernels:

- raw model and patch cardinality preflight, including the non-variadic large-insert path;
- `cloneChartProjection()`, which isolates every public binary buffer while preserving the zero-copy borrowed projection path.

The packed-install check applies a five-percent plus 32-byte tolerance to each package category. The measured Chart runtime and source-map categories exceeded their previous effective gates; Chart declarations, other files, the tarball, every installed dependency tree, and every other package remained within their existing gates.

## Decision

Update only the two exceeded Chart category baselines. Do not refresh unaffected package or category budgets.

| Category | Previous baseline | Previous effective gate | Measured | Delta | Approved baseline | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Runtime JavaScript | 192,559 B | 202,219 B | 203,274 B | +10,715 B (+5.56%) | 203,274 B | 213,470 B |
| Source maps | 146,400 B | 153,752 B | 154,278 B | +7,878 B (+5.38%) | 154,278 B | 162,024 B |

The measured category file counts move from 16 to 17. No runtime dependency is added.

## Consumer impact

Consumers that install `@sectile/chart` receive 10,715 additional bytes of uncompressed runtime JavaScript and 7,878 additional bytes of source maps relative to the previous baseline. Source maps are publication/debugging artifacts rather than executed code. The clone path allocates only when explicitly requested; ordinary controller projections retain their existing cached, borrowed-buffer path. The preflight path replaces late rejection and an uncontained large-insert `RangeError` with bounded validation.

The existing Chart tarball budget remains unchanged because the measured tarball stayed within its prior gate. Bundle fixtures separately cover the focused projection-clone surface, and no unrelated install baseline is changed.
