# Vue collection consumer-bundle baseline ratchet

Status: Accepted
Date: 2026-09-14

## Context

Issue #170 bounds Grid, Listbox, and Menu item-slot invalidation to the identities whose projected state changes. After implementation compaction, focused verification executes exactly two consumer item slots for one cursor/highlight move at both 1,000 and 4,000 mounted identities, and the focused Vue collection/presence suite passes 59/59.

The remaining release failure is delivery provenance, not a new dependency or a failed runtime bound. Three Vue fixtures still compare against references older than the latest published package: the root namespace fixture plus the Listbox direct and root-named fixtures. Direct identical-setting measurement of official npm `@sectile/vue@0.18.0`, with its published workspace dependencies, remains below the repository's existing five-percent-plus-16-byte policy. The stored Listbox brotli references leave only 2–3 bytes of headroom above the already-published `0.18.0` artifact, so they no longer represent the current shipped package.

The current candidate was optimized before this decision. Its item-projection registry and per-item watcher overhead were removed in favor of transient Vue reactive-key invalidation, reducing bundle size while preserving the #170 complexity and lifecycle contract. The candidate still costs more than published `0.18.0`, but every affected result remains within the unchanged policy when measured against the published artifact.

## Decision

Ratchet only these six result records in `verification/consumer-bundles/baseline.json` to direct measurements of official npm `@sectile/vue@0.18.0`:

- `vue:.:namespace` under esbuild and Vite;
- `vue:./listbox:named` under esbuild and Vite;
- `vue:./listbox:root-named` under esbuild and Vite.

Do not re-record the Vue package or repository-wide bundle baseline. Do not use the current release candidate as the replacement reference. The comparison formula remains `ceil(reference × 1.05) + 16` for raw, gzip, and brotli sizes.

| Fixture / bundler | Previous reference raw/gzip/brotli | Published 0.18.0 reference | Current candidate | Published → candidate | New gate raw/gzip/brotli |
| --- | ---: | ---: | ---: | ---: | ---: |
| namespace / esbuild | 589,873 / 141,880 / 109,926 B | 607,883 / 147,675 / 114,295 B | 612,094 / 150,041 / 115,965 B | +4,211 / +2,366 / +1,670 B | 638,294 / 155,075 / 120,026 B |
| namespace / Vite | 584,372 / 138,375 / 106,688 B | 602,545 / 144,087 / 111,165 B | 606,888 / 146,283 / 112,830 B | +4,343 / +2,196 / +1,665 B | 632,689 / 151,308 / 116,740 B |
| Listbox direct / esbuild | 38,213 / 11,428 / 10,310 B | 39,646 / 11,991 / 10,840 B | 41,007 / 12,524 / 11,324 B | +1,361 / +533 / +484 B | 41,645 / 12,607 / 11,398 B |
| Listbox direct / Vite | 38,055 / 11,314 / 10,224 B | 39,429 / 11,868 / 10,749 B | 40,824 / 12,398 / 11,230 B | +1,395 / +530 / +481 B | 41,417 / 12,478 / 11,303 B |
| Listbox root / esbuild | 38,213 / 11,452 / 10,330 B | 39,646 / 12,025 / 10,860 B | 41,007 / 12,563 / 11,334 B | +1,361 / +538 / +474 B | 41,645 / 12,643 / 11,419 B |
| Listbox root / Vite | 38,055 / 11,357 / 10,258 B | 39,429 / 11,903 / 10,753 B | 40,824 / 12,428 / 11,226 B | +1,395 / +525 / +473 B | 41,417 / 12,515 / 11,307 B |

The published module/dependency closure is recorded with each replaced result. No external dependency is added; `vue` remains the only external dependency in these fixtures.

## Consumer impact

Relative to the package consumers can already install, the namespace compressed increase is about 1.5–1.6%. The focused Listbox increase is about 3.4–3.5% raw and 4.4–4.5% compressed. These deltas stay inside the existing delivery policy and buy a measured runtime improvement: a single cursor/highlight move no longer executes every mounted collection item slot and instead executes exactly the old and new item slots at 1k and 4k scale.

The ratchet does not alter package exports, dependencies, semantic ownership, or the bundle comparison formula. All four Vue consumer-bundle shards must pass after this change, and final release certification remains the release gate.
