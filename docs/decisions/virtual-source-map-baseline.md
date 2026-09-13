# Virtual publication baseline repair

Status: Accepted
Date: 2026-09-13

## Context

Release verification compared the current `@sectile/virtual` publication artifact against source-map and consumer-install baselines that still described 54 packed files: 17 JavaScript files, 17 declarations, and 17 external source maps. The stale source-map record set a 66,724-byte effective tarball ceiling and rejected the current 68,347-byte npm dry-run artifact. The stale consumer-install record used a 64,336-byte tarball reference and also rejected the current 69,198-byte pnpm-packed artifact.

The published `@sectile/virtual@0.15.2` artifact on npm already contains 57 files: 18 JavaScript files, 18 declarations, and 18 external source maps. `npm pack @sectile/virtual@0.15.2 --dry-run --json --ignore-scripts` reports a 69,178-byte tarball and 331,152 unpacked bytes. Its `dist` files total 325,950 bytes: 157,944 JavaScript, 49,261 declarations, and 118,745 source maps.

The release candidate has the same 57-file shape. The source-map collector reports 68,347 bytes packed and 331,251 bytes unpacked, while the consumer-install pnpm tarball is 69,198 bytes. Relative to the already-published npm tarball, those packed measurements are 831 bytes smaller and 20 bytes larger respectively; the unpacked source-map measurement is 99 bytes larger. Its `dist` total is 326,038 bytes, 88 bytes above the published package. No additional published file or dependency is introduced by this release.

## Decision

Repair only the Virtual entries in `verification/source-maps/baseline.json` and `verification/consumer-install/baseline.json` using the official npm `0.15.2` artifact as the reference. Do not use the current release candidate as the replacement baseline and do not change any other package record.

| Measurement | Stale baseline | Published 0.15.2 reference | Current candidate | Published → candidate |
| --- | ---: | ---: | ---: | ---: |
| Packed files | 54 | 57 | 57 | 0 |
| JavaScript files | 17 | 18 | 18 | 0 |
| Declaration files | 17 | 18 | 18 | 0 |
| Source-map files | 17 | 18 | 18 | 0 |
| Dist bytes | 309,022 B | 325,950 B | 326,038 B | +88 B |
| Source-map collector tarball | 63,531 B | 69,178 B | 68,347 B | -831 B |
| Source-map collector unpacked package | 314,129 B | 331,152 B | 331,251 B | +99 B |
| Consumer-install tarball | 64,336 B | 69,178 B | 69,198 B | +20 B |

With the existing source-map policy unchanged, the repaired published reference yields a 72,653-byte tarball ceiling and a 347,726-byte unpacked ceiling. With the existing consumer-install policy unchanged, the published tarball reference yields a 72,669-byte tarball ceiling. The current candidate remains below these gates without weakening either comparison formula.

## Consumer impact

This change repairs verification provenance; it does not add runtime behavior or package files. Relative to the package consumers can already install from npm, the candidate has the same file count and dependency surface; its pnpm-packed tarball differs by only 20 bytes and its source-map collector reports a 99-byte unpacked increase. Bundle, install, source-map structure, and package verification policies remain unchanged.
