# Virtual publication baseline repair

Status: Accepted
Date: 2026-09-13

## Context

Release verification compared the current `@sectile/virtual` publication artifact against a source-map baseline that still described 54 packed files: 17 JavaScript files, 17 declarations, and 17 external source maps. That record set a 66,724-byte effective tarball ceiling and rejected the current 68,347-byte release candidate.

The published `@sectile/virtual@0.15.2` artifact on npm already contains 57 files: 18 JavaScript files, 18 declarations, and 18 external source maps. `npm pack @sectile/virtual@0.15.2 --dry-run --json --ignore-scripts` reports a 69,178-byte tarball and 331,152 unpacked bytes. Its `dist` files total 325,950 bytes: 157,944 JavaScript, 49,261 declarations, and 118,745 source maps.

The release candidate has the same 57-file shape. It is 68,347 bytes packed and 331,251 bytes unpacked, so it is 831 bytes smaller when packed and 99 bytes larger unpacked than the already-published package. Its `dist` total is 326,038 bytes, 88 bytes above the published package. No additional published file or dependency is introduced by this release.

## Decision

Repair only the Virtual entry in `verification/source-maps/baseline.json` using the official npm `0.15.2` artifact as the reference. Do not use the current release candidate as the replacement baseline and do not change any other package record.

| Measurement | Stale baseline | Published 0.15.2 reference | Current candidate | Published → candidate |
| --- | ---: | ---: | ---: | ---: |
| Packed files | 54 | 57 | 57 | 0 |
| JavaScript files | 17 | 18 | 18 | 0 |
| Declaration files | 17 | 18 | 18 | 0 |
| Source-map files | 17 | 18 | 18 | 0 |
| Dist bytes | 309,022 B | 325,950 B | 326,038 B | +88 B |
| Tarball | 63,531 B | 69,178 B | 68,347 B | -831 B |
| Unpacked package | 314,129 B | 331,152 B | 331,251 B | +99 B |

With the existing source-map policy unchanged, the repaired published reference yields a 72,653-byte tarball ceiling and a 347,726-byte unpacked ceiling. The current candidate remains below both without weakening the five-percent-plus-16-byte policy.

## Consumer impact

This change repairs verification provenance; it does not add runtime behavior or package files. Relative to the package consumers can already install from npm, the candidate has the same file count and dependency surface, a smaller compressed tarball, and a 99-byte unpacked increase. Existing bundle, install, source-map structure, and package verification gates remain unchanged.
