# DOM range-calendar consumer-bundle baseline ratchet

Status: Accepted
Date: 2026-09-14

## Context

After the focused date-range-picker baseline repair, a complete run of all 97 DOM consumer fixtures found exactly one remaining over-budget fixture: the `@sectile/dom/temporal/range-calendar` named `createRangeCalendar` import. The candidate produces 16,122 gzip and 14,426 brotli bytes under esbuild against stale gates of 16,078 and 14,366 bytes; Vite similarly produces 16,169 gzip and 14,466 brotli bytes against 16,118 and 14,391-byte gates.

The stored fixture predates the latest published DOM package and omits `dist/internal/hidden-binding.js`. The official npm `@sectile/dom@0.18.0` artifact, installed with its published `@sectile/core@0.14.6` and `@sectile/temporal@0.14.7` dependencies and bundled under the same repository settings, already contains that module in this closure. It produces 52,639/15,882/14,224 raw/gzip/brotli bytes under esbuild and 53,006/15,926/14,241 bytes under Vite.

The current candidate produces 53,407/16,122/14,426 bytes under esbuild and 53,793/16,169/14,466 bytes under Vite, with the same package ownership and no external dependency.

## Decision

Ratchet only the two `dom:./temporal/range-calendar:named` result records in `verification/consumer-bundles/baseline.json` to the direct measurements of the official npm `@sectile/dom@0.18.0` artifact. Do not re-record the DOM or repository-wide consumer-bundle baseline. The current candidate is not used as the replacement reference.

| Bundler / size | Previous baseline | Previous effective gate | Published 0.18.0 | Current candidate | Published → candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| esbuild raw | 51,026 B | 53,594 B | 52,639 B | 53,407 B | +768 B | 55,287 B |
| esbuild gzip | 15,297 B | 16,078 B | 15,882 B | 16,122 B | +240 B | 16,693 B |
| esbuild brotli | 13,666 B | 14,366 B | 14,224 B | 14,426 B | +202 B | 14,952 B |
| Vite raw | 51,374 B | 53,959 B | 53,006 B | 53,793 B | +787 B | 55,673 B |
| Vite gzip | 15,335 B | 16,118 B | 15,926 B | 16,169 B | +243 B | 16,739 B |
| Vite brotli | 13,690 B | 14,391 B | 14,241 B | 14,466 B | +225 B | 14,970 B |

The existing five-percent-plus-16-byte consumer-bundle policy remains unchanged. The baseline module list is advanced only by `@sectile/dom/dist/internal/hidden-binding.js`, matching the already-published `0.18.0` closure.

## Consumer impact

Compared with the already-published DOM `0.18.0` fixture, the candidate adds at most 787 raw bytes and 243 gzip bytes. It retains the same Core, DOM, and Temporal ownership and introduces no external dependency. After this focused ratchet, the full 97-fixture DOM consumer-bundle suite is required to pass without any additional baseline change.
