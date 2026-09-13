# Vue consumer-install baseline ratchet

Status: Accepted
Date: 2026-09-13

## Context

The consumer-install baseline for `@sectile/vue` still predates the latest published package. It records a 267,580-byte tarball with 110 JavaScript files, 110 declarations, and 110 source maps. The official npm `@sectile/vue@0.17.0` artifact is 279,252 bytes with 109 files in each emitted category and 330 packed files total. That published artifact remains within the old five-percent-plus-32-byte tarball gate.

Issue #118 subsequently accepted the package-footprint cost of conditional exit Presence and Form Presence ownership. Its footprint decision updated the Vue source-map publication baseline but deliberately did not replace consumer bundle ceilings. The consumer-install reference therefore remained behind the already-shipped package. The current release candidate adds the approved conditional-presence, form-context, and form-presence-parts modules plus the later Tabular and date/focus correctness fixes. It packs to 285,026 bytes with 339 files and introduces no new runtime dependency.

## Decision

Ratchet only the Vue package record in `verification/consumer-install/baseline.json` to the official npm `@sectile/vue@0.17.0` artifact. The release candidate is not used as the replacement baseline. The existing five-percent-plus-32-byte category and tarball comparison formula remains unchanged.

| Measurement | Previous baseline | Published 0.17.0 reference | Current candidate | Published → candidate | New effective gate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tarball | 267,580 B | 279,252 B | 285,026 B | +5,774 B | 293,247 B |
| Runtime JavaScript | 582,488 B | 593,497 B | 604,547 B | +11,050 B | 623,204 B |
| Declarations | 651,277 B | 661,649 B | 671,946 B | +10,297 B | 694,764 B |
| Source maps | 448,783 B | 470,525 B | 478,045 B | +7,520 B | 494,084 B |
| Other package files | 16,756 B | 16,736 B | 16,736 B | 0 B | 17,605 B |
| Packed files | 333 | 330 | 339 | +9 | n/a |

Every byte category in the current candidate remains below the gate derived from the last published artifact. Consumer bundle baselines are not changed by this decision; their focused fixtures separately verify that the new Presence ownership remains tree-shakeable.

## Consumer impact

Compared with `@sectile/vue@0.17.0`, the candidate tarball grows by 5,774 bytes and the unpacked emitted categories grow by 28,567 bytes. The nine additional packed files are three focused internal module triplets for conditional Presence and Form Presence ownership. The package adds no runtime dependency, and the increase remains within the repository's existing delivery budget rather than requiring a wider policy.
