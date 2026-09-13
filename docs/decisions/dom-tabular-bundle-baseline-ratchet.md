# DOM Tabular consumer-bundle baseline ratchet

Status: Accepted
Date: 2026-09-13

## Context

Release verification found one focused consumer-bundle result two bytes above its existing allowance: the Vite `@sectile/dom/tabular` named `connectDataGrid` fixture produced 8,000 gzip bytes against a 7,998-byte gate. The fixture keeps the same package closure and no external dependency is added.

The official npm `@sectile/dom@0.17.0` artifact was installed with its published Core and Tabular dependencies and bundled with the same repository `bundleFixture()` implementation. Its `connectDataGrid` fixture produces 27,063/7,979/7,185 raw/gzip/brotli bytes under esbuild and 27,284/7,988/7,173 bytes under Vite. The current candidate is only 4 raw bytes larger under each bundler, with gzip deltas of 10 bytes under esbuild and 12 bytes under Vite.

All 97 DOM fixtures, 194 bundler results total, were also executed against the published `@sectile/dom@0.17.0` package. None exceeds the stored baseline gate. The candidate's small delta follows the Tabular context-only row contract and subsequent DOM/Form selection, focus, and reconciliation corrections; it does not add another package owner to this fixture.

## Decision

Ratchet only the two `dom:./tabular:named` results in `verification/consumer-bundles/baseline.json` to the official npm `@sectile/dom@0.17.0` results. Do not re-record the DOM or repository-wide bundle baseline. The current candidate is not used as the replacement reference.

| Bundler / size | Previous baseline | Previous effective gate | Published 0.17.0 | Current candidate | Published → candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| esbuild raw | 25,979 B | 27,294 B | 27,063 B | 27,067 B | +4 B | 28,433 B |
| esbuild gzip | 7,594 B | 7,990 B | 7,979 B | 7,989 B | +10 B | 8,394 B |
| esbuild brotli | 6,844 B | 7,203 B | 7,185 B | 7,196 B | +11 B | 7,561 B |
| Vite raw | 26,168 B | 27,493 B | 27,284 B | 27,288 B | +4 B | 28,665 B |
| Vite gzip | 7,601 B | 7,998 B | 7,988 B | 8,000 B | +12 B | 8,404 B |
| Vite brotli | 6,836 B | 7,194 B | 7,173 B | 7,186 B | +13 B | 7,548 B |

The existing five-percent-plus-16-byte consumer-bundle policy remains unchanged.

## Consumer impact

Compared with the already-published DOM 0.17.0 fixture, the candidate adds at most 13 compressed bytes and four raw bytes to this focused import. It retains the same Core, DOM, and Tabular module ownership and no external dependency. All other DOM consumer-bundle references remain unchanged.
