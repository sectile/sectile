---
title: Virtualization scaling changes
description: Implemented Core and Vue changes derived from large-collection browser measurements, with validation and remaining limits.
---

# Virtualization scaling changes

Large-collection browser runs showed that Sectile's fixed-height steady scrolling stayed bounded while setup and small Vue collection mutations scaled with source cardinality. This record describes the resulting implementation changes and the limits they intentionally do not hide.

## Measurement findings

The 100,000-row and 1,000,000-row runs came from different dirty builds and used different row heights, so their timings are directional rather than a release-to-release comparison. In the million-row fixed workload, setup and mount time grew by roughly the same factor as collection size while steady scroll timing remained nearly flat. Small uniform-list mutations also approached collection-linear time.

The million-row fixed workload produced no Sectile correctness failures and kept mounted DOM bounded. Heterogeneous layouts reached a different boundary: the requested logical height could exceed the browser's roughly 16.8-million-pixel physical scroll range. Those failures are physical scroll-projection limits, not evidence that logical extent arithmetic should be clamped.

## Implemented ownership by layer

### Core

`Sequence` remains the portable owner of stable identity, indexing, and structural sharing. Patched sequences already compacted before overlay depth could exceed 32. They now also compact when cumulative inserted, deleted, or moved cardinality exceeds one eighth of the resulting domain. This aligns the implementation with the frozen representation rule and prevents a large replacement from retaining both a full old domain and a large patch chain.

Small changes still retain a bounded overlay and resolve `at`, `indexOf`, `contains`, and `compare` without materializing the complete ID vector. Explicit `ids` output retains its linear materialization lower bound.

### Virtual

No Virtual algorithm changed. Linear layouts already apply Core sequence splices, uniform extents already use compressed shared storage, and viewport queries remain independent of total item cardinality after construction. Duplicating collection reconciliation or DOM resource ownership in this layer would weaken those boundaries.

### DOM

No DOM runtime change was required. One root observer and one item observer coalesce changed entries into a keyed map and one scheduled frame; measurement work is bounded by mounted changed entries and projected placements rather than the full collection.

The generic axis resolver still reads `getBoundingClientRect()`. Replacing it with `ResizeObserverEntry.borderBoxSize` was not made as part of this work because the two APIs differ for transformed geometry and fragmented boxes. That change needs browser equivalence evidence before it can preserve the existing measurement contract.

### Vue

Prepared virtual collections now retain their ID domain as a Core `Sequence` instead of an array plus a second adapter-owned index. Initial external input still receives one full key-validation and index-construction pass.

For a raw array replacement with the same `getKey` resolver, Vue still performs prefix/suffix identity discovery because the API does not provide a trusted patch descriptor. After finding the changed window, it validates only inserted keys and calls Core `applySequencePatch`. A small keyed change therefore allocates only the changed IDs and bounded patch metadata instead of another full ID array. Value-only replacements reuse the same domain owner.

This change reduces allocation and retained memory but does not make raw-array change discovery sublinear. Sublinear discovery would require a separate API whose semantic owner supplies trusted collection patches.

## Validation

The production builds for `@sectile/core` and `@sectile/vue` pass. Focused sequence reference-law coverage passes for splice, move, uniqueness, resource ceilings, long patch chains, depth compaction, and cumulative-change compaction. Focused Vue coverage passes for structural sharing, value-only replacement, duplicate rejection, pre-resolution item ceilings, declarative virtual collection reconciliation, and changed-entry DOM measurement.

The generated complexity contract records that stable-resolver raw replacements may scan `nItem` identities but allocate in proportion to `jChanged`; Core materialization records both the depth-32 and cumulative-one-eighth bounds. The complexity-contract checker and `git diff --check` pass.

Browser benchmark results were not regenerated as part of this implementation. A same-machine before/after run is still required to quantify latency and heap changes.

## Remaining limits

- Raw array replacement has an `O(nItem)` semantic discovery bound without a trusted patch descriptor.
- Core deliberately materializes when overlay depth or cumulative changed cardinality crosses its frozen crossover.
- Dense grid reconfiguration can still rebuild row extents when geometry or per-item estimates require it.
- Logical layouts taller than the browser's physical scroll range require explicit logical-to-physical scroll mapping; lowering expected height or clamping correctness checks would hide the problem rather than solve it.
