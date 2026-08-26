---
title: Virtualization
description: Dynamic-size collection geometry, anchoring, and host scheduling contracts.
---

# Virtualization

Sectile virtualization separates four responsibilities:

```text
Sequence identity/order ── SequencePatch ──┐
                                          ├─ VirtualLayout ── host commands
ExtentIndex geometry ── measurements ─────┘

CollectionWindow ── asynchronous data loading only
```

`Sequence` remains the identity and order authority. `ExtentIndex` stores one effective extent per logical item as `exact`, `estimated`, or `unknown` with a fallback. `VirtualLayout` owns viewport geometry, visible and overscanned render ranges, measurement generations, and scroll corrections. `CollectionWindow` remains a separate generation-bound data-loading state; a render window is not a loaded-data window.

## Dynamic extents

Items do not need a fixed size. A host starts with estimates or fallbacks, renders the requested range, measures the resulting elements, and reports a batch of exact extents. Updates path-copy only affected extent-index chunks. Prefix offsets, offset-to-index lookup, splice, and move do not scan the complete collection.

When a measurement or sequence patch changes geometry before the first visible item, VirtualLayout keeps that anchor at the same viewport coordinate and emits `set-scroll-offset` with reason `anchor-correction`. The host applies the command without animation. This prevents content above the viewport from causing visible jumps while allowing the measured item itself to grow or shrink naturally.

## Host cycle

1. Apply scroll observations with `viewport-changed`.
2. Render `renderRange` or handle `render-range-changed`.
3. Read layout once, then report one `measurements-reported` batch with the active generation.
4. Apply `set-scroll-offset` before the next paint.
5. Ignore no commands; reject and discard stale measurement generations.

DOM reads and writes remain outside Core. A host should batch observers, avoid alternating measurement and mutation per item, and coalesce scroll observations to its frame scheduler.

## Domain changes

Apply the same `SequencePatch` to the identity owner and VirtualLayout. Splice patches provide one initial extent per inserted identity. Move patches reuse the existing extent subtree and use a destination index in the sequence after source removal. Reorder commands publish this patch directly, so a virtualized consumer does not need to diff complete arrays.

Use `collectionWindowEventForVirtualLayout()` only when the render range crosses the loaded range. It derives a normal `CollectionWindowEvent`; request generations and stale-response rejection stay owned by CollectionWindow.
