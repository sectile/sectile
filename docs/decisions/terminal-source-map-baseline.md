# Terminal publication baseline repair

Status: Accepted
Date: 2026-09-14

## Context

Release certification compared the current `@sectile/terminal` publication artifact against a source-map baseline that still described 243 packed files: 80 JavaScript files, 80 declarations, and 80 external source maps. That stale record set a 112,943-byte effective tarball ceiling and rejected the current release candidate.

The already-published `@sectile/terminal@0.14.7` artifact on npm contains 246 files: 81 JavaScript files, 81 declarations, and 81 external source maps. `npm pack @sectile/terminal@0.14.7 --dry-run --json --ignore-scripts` reports a 114,174-byte tarball and 623,920 unpacked bytes. Its `dist` files total 609,464 bytes: 259,973 JavaScript, 168,229 declarations, and 181,262 source maps.

The release candidate has the same 246-file shape. After restoring the focused `@sectile/terminal/node` tree-shaking boundary, it is 113,432 bytes packed and 627,619 bytes unpacked. Its `dist` total is 613,148 bytes: 261,784 JavaScript, 168,229 declarations, and 183,135 source maps. Relative to the already-published package, the candidate is 742 bytes smaller when packed and 3,699 bytes larger unpacked; no additional published file or dependency is introduced.

## Decision

Repair only the Terminal entry in `verification/source-maps/baseline.json` using the official npm `0.14.7` artifact as the reference. Do not use the current release candidate as the replacement baseline and do not change any other package record.

| Measurement | Stale baseline | Published 0.14.7 reference | Current candidate | Published → candidate |
| --- | ---: | ---: | ---: | ---: |
| Packed files | 243 | 246 | 246 | 0 |
| JavaScript files | 80 | 81 | 81 | 0 |
| Declaration files | 80 | 81 | 81 | 0 |
| Source-map files | 80 | 81 | 81 | 0 |
| Dist bytes | 589,380 B | 609,464 B | 613,148 B | +3,684 B |
| Tarball | 107,549 B | 114,174 B | 113,432 B | -742 B |
| Unpacked package | 603,715 B | 623,920 B | 627,619 B | +3,699 B |

With the existing source-map policy unchanged, the repaired published reference yields a 119,899-byte tarball ceiling and a 655,132-byte unpacked ceiling. The current candidate remains below both without weakening the five-percent-plus-16-byte policy.

## Consumer impact

The Terminal consumer-bundle baseline is unchanged. All three Terminal fixture shards pass after the TTY text-filter closure repair. The focused `@sectile/terminal/node` named import contains only `dist/node.js` plus the fixture and retains only `node:readline` and `node:stream` dependencies; `dist/internal/grapheme.js` is no longer in that closure. Its current esbuild result is 1,903 raw / 932 gzip / 814 brotli bytes, and its Vite result is 1,925 / 935 / 813 bytes, all within the existing ceilings.

This change repairs verification provenance against an artifact consumers can already install. It does not add a public export, dependency, or package file, and it does not raise any consumer bundle or install ceiling.
