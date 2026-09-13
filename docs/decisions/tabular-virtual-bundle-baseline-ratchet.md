# Tabular Virtual consumer-bundle baseline ratchet

Status: Accepted
Date: 2026-09-13

## Context

Release verification rejected the esbuild `@sectile/tabular/virtual` named `createDataGridVirtualAdapter` fixture at 15,402 gzip bytes against a 14,966-byte gate. The stored reference predates the package shape already published as `@sectile/tabular@0.15.2` with `@sectile/core@0.14.5` and `@sectile/virtual@0.15.2`.

The official published package combination was installed independently and bundled with the repository `bundleFixture()` implementation. Its named Virtual fixture produces 52,257/15,304/13,696 raw/gzip/brotli bytes under esbuild and 43,115/12,908/11,562 bytes under Vite. The current candidate produces 52,329/15,402/13,785 bytes under esbuild and 43,119/12,908/11,561 bytes under Vite.

All 10 Tabular fixtures, 20 bundler results total, were executed against the published package combination. Only this named Virtual fixture exceeds the stored baseline gate, and no external dependency is introduced.

## Decision

Ratchet only the two `tabular:./virtual:named` results in `verification/consumer-bundles/baseline.json` to the official published `@sectile/tabular@0.15.2` results. Do not re-record the Tabular or repository-wide baseline, and do not use the current release candidate as the replacement reference.

| Bundler / size | Previous baseline | Previous effective gate | Published reference | Current candidate | Published → candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| esbuild raw | 49,839 B | 52,347 B | 52,257 B | 52,329 B | +72 B | 54,886 B |
| esbuild gzip | 14,238 B | 14,966 B | 15,304 B | 15,402 B | +98 B | 16,086 B |
| esbuild brotli | 12,739 B | 13,392 B | 13,696 B | 13,785 B | +89 B | 14,397 B |
| Vite raw | 40,400 B | 42,436 B | 43,115 B | 43,119 B | +4 B | 45,287 B |
| Vite gzip | 11,962 B | 12,577 B | 12,908 B | 12,908 B | 0 B | 13,570 B |
| Vite brotli | 10,725 B | 11,278 B | 11,562 B | 11,561 B | -1 B | 12,157 B |

The existing five-percent-plus-16-byte consumer-bundle policy remains unchanged.

## Consumer impact

This change repairs verification provenance for a package shape already available from npm. Relative to the published reference, the candidate adds at most 98 compressed bytes and 72 raw bytes to this focused import, remains inside the existing policy allowance, and retains a dependency-free bundled closure.
