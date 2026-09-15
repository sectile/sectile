# DOM date-range-picker consumer-bundle baseline ratchet

Status: Accepted
Date: 2026-09-14

## Context

Release certification reached consumer verification after the first 29 stages passed and found one focused result above its stored allowance: the esbuild `@sectile/dom/temporal/date-range-picker` named `createDateRangePicker` fixture produced 16,117 gzip bytes against a 16,085-byte gate.

The stored fixture predates the latest published DOM package. It does not include `dist/internal/hidden-binding.js`, although that module entered the date-range-picker closure in commit `b8538e06` on 2026-09-04, before `@sectile/dom@0.18.0` was released on 2026-09-13.

The official npm `@sectile/dom@0.18.0` artifact was installed together with its published `@sectile/core@0.14.6` and `@sectile/temporal@0.14.7` dependencies and bundled with the same esbuild/Vite settings as the repository fixture. The published fixture includes `dist/internal/hidden-binding.js` and produces 52,639/15,878/14,200 raw/gzip/brotli bytes under esbuild and 53,006/15,926/14,241 bytes under Vite.

The current candidate produces 53,407/16,117/14,425 bytes under esbuild and 53,793/16,169/14,466 bytes under Vite, with the same package ownership and no external dependency.

## Decision

Ratchet only the two `dom:./temporal/date-range-picker:named` result records in `verification/consumer-bundles/baseline.json` to the direct measurements of the official npm `@sectile/dom@0.18.0` artifact. Do not re-record the DOM or repository-wide consumer-bundle baseline. The current candidate is not used as the replacement reference.

| Bundler / size | Previous baseline | Previous effective gate | Published 0.18.0 | Current candidate | Published → candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| esbuild raw | 51,026 B | 53,594 B | 52,639 B | 53,407 B | +768 B | 55,287 B |
| esbuild gzip | 15,303 B | 16,085 B | 15,878 B | 16,117 B | +239 B | 16,688 B |
| esbuild brotli | 13,647 B | 14,346 B | 14,200 B | 14,425 B | +225 B | 14,926 B |
| Vite raw | 51,374 B | 53,959 B | 53,006 B | 53,793 B | +787 B | 55,673 B |
| Vite gzip | 15,335 B | 16,118 B | 15,926 B | 16,169 B | +243 B | 16,739 B |
| Vite brotli | 13,690 B | 14,391 B | 14,241 B | 14,466 B | +225 B | 14,970 B |

The existing five-percent-plus-16-byte consumer-bundle policy remains unchanged. The baseline module list is advanced only by `@sectile/dom/dist/internal/hidden-binding.js`, matching the already-published `0.18.0` closure.

## Consumer impact

Compared with the already-published DOM `0.18.0` fixture, the candidate adds at most 787 raw bytes and 243 gzip bytes. It retains the same Core, DOM, and Temporal ownership, introduces no external dependency, and remains below every gate derived from the published artifact. All other consumer-bundle baseline records remain unchanged.
