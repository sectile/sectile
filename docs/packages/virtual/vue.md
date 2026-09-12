---
title: Vue connection
description: Virtualize lists, responsive grids, masonry cards, and spatial surfaces with root, page, or external scrolling.
---

# Vue connection

The declarative Virtual components accept an item collection, a stable `getID` resolver, and an explicit sizing policy. `VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial` can use their rendered root, the owning document, or an external element/document as the physical scrollport while keeping layout coordinates local to the Virtual surface.

## Install

```sh
pnpm add vue @sectile/vue @sectile/virtual
```

## List with root-owned scrolling

Omit `scrollport` for the default root-owned mode. `VirtualList` supplies its root with `overflow: auto`; give that root a bounded size so it has a scrollable viewport.

```vue
<script setup lang="ts">
import { VirtualList } from '@sectile/vue/virtual/list'

const rows = Array.from({ length: 50_000 }, (_, index) => ({
  id: `row-${index}`,
  text: `Row ${index + 1}`,
}))
</script>

<template>
  <VirtualList
    :items="rows"
    :get-i-d="row => row.id"
    :size-policy="{ kind: 'estimated', estimate: 40 }"
    class="list"
  >
    <template #item="{ value: row }">
      <p>{{ row.text }}</p>
    </template>
    <template #empty>No rows</template>
  </VirtualList>
</template>

<style scoped>
.list { height: 24rem; }
</style>
```

`sizePolicy` makes main-axis size ownership explicit. Use `{ kind: 'fixed', extent }` when every item has the same exact size, `{ kind: 'estimated', estimate }` when mounted elements should refine an initial estimate, or `{ kind: 'measured' }` when the first rendered sample must establish the initial estimate. Measured bootstrap uses the effective projected viewport, regardless of which scrollport is selected.

## Use page scrolling

Set `scrollport="document"` when the collection should participate in ordinary page flow instead of creating a nested scroll container.

```vue
<VirtualMasonry
  scrollport="document"
  :items="cards"
  :get-i-d="card => card.id"
  :size-policy="{ kind: 'measured' }"
  :lane-policy="{ kind: 'responsive', minExtent: 180, maxCount: 4, gap: 12 }"
  :viewport-insets="{ top: 64 }"
>
  <template #item="{ value: card }">
    <article>{{ card.title }}</article>
  </template>
</VirtualMasonry>
```

Here `viewportInsets.top` accounts for a 64 px fixed or sticky page header. Sectile does not discover that occlusion from CSS. In document mode, `VirtualList` also stops injecting its default nested `overflow: auto` style.

The selected document's own browser realm is used. Page-level virtualization therefore works with an iframe-owned `Document` through the same low-level host contract.

## Use an external element

Pass an element when scrolling is owned by a container outside the Virtual component root.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { VirtualList } from '@sectile/vue/virtual/list'

const panel = useTemplateRef<HTMLElement>('panel')
</script>

<template>
  <section ref="panel" class="panel">
    <VirtualList
      :scrollport="panel"
      :items="rows"
      :get-i-d="row => row.id"
      :size-policy="{ kind: 'fixed', extent: 40 }"
    >
      <template #item="{ value: row }">{{ row.text }}</template>
    </VirtualList>
  </section>
</template>

<style scoped>
.panel { height: 24rem; overflow: auto; }
</style>
```

The accepted target forms are `'root'`, `'document'`, `HTMLElement`, `Document`, and `null`. Explicit `null` means no physical target is connected; it does not fall back to root mode. Omitting the prop keeps the default `'root'` behavior.

## Declarative components

| Component | Surface | Layout-specific input |
| --- | --- | --- |
| `VirtualList` | Vertical or horizontal list | `sizePolicy`, `axis`, `gap` |
| `VirtualGrid` | Dense vertically flowing grid | `sizePolicy`, `lanePolicy`, `rowGap` |
| `VirtualMasonry` | Variable-height masonry cards | `sizePolicy`, `lanePolicy`, `itemGap`, `placementPolicy` |
| `VirtualSpatial` | Application-positioned canvas | `getRect`, `getZIndex`, `sizeOwnership` |

Grid and Masonry accept either a fixed lane policy such as `{ kind: 'fixed', count: 4, gap: 12 }` or a responsive policy such as `{ kind: 'responsive', minExtent: 180, maxCount: 6, gap: 12 }`. Their responsive geometry comes from the projected surface-local viewport, so vertical page movement alone does not repack lanes. Spatial rectangles also remain surface-local when the page or external scrollport moves.

All four high-level components use `items`, `getID`, the same `scrollport` target vocabulary, and the named `header`, `item`, `empty`, and `footer` slots. Their exposed contract is shared: `scrollport`, `surface`, `state`, `plan`, `phase`, `scrollToID()`, `refresh()`, and `flush()`. `scrollToID()` delegates physical scrolling to the selected host; applications do not translate page coordinates themselves.

## Refresh after external page-flow changes

Normal scroll, viewport resize, item measurement, and registered frame changes are observed by the host. If unrelated page content moves the Virtual surface without one of those signals, call the exposed `refresh()` method.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { VirtualMasonry } from '@sectile/vue/virtual/masonry'

const masonry = useTemplateRef<{ refresh(): void }>('masonry')

function afterExternalLayoutChange() {
  masonry.value?.refresh()
}
</script>
```

Do not forward `window` scroll events or add a second anchor-correction layer. The DOM host owns document scrolling, browser clamping, and measurement correction.

## Scope of document mode

Document scrolling uses the layout viewport. `Window` is not a parallel target type, and the contract does not cover `VisualViewport`, pinch-zoom, or virtual-keyboard semantics. One Virtual connection selects one physical scrollport rather than auto-discovering a nested scroll chain. Browser physical scroll-range limits for extremely large logical surfaces are a separate concern.

## A grid large on both axes

`VirtualGrid` derives a dense lane layout and flows along the main axis. For a table or schedule with hundreds of independent rows and columns, connect `VirtualizerRoot` to `trackGridLayoutStrategy`. The [300 × 300 grid example](layouts.md#track-grid) contains the complete code.

## Low-level building blocks

Use `@sectile/vue/virtual/core` when you need a custom layout strategy, merged cells, custom measurements, or manual mutations.

- `VirtualizerRoot`: resolve and connect the selected physical scrollport
- `VirtualizerHeader`: render an optional leading frame region
- `VirtualizerSurface`: establish the layout coordinate surface and apply plan size
- `VirtualizerItem`: project one placement and, when configured, measure it
- `VirtualizerFooter`: render an optional trailing frame region

Provide a deterministic `initialViewport` when the first visible range is rendered during SSR. `scrollport="document"` does not require a browser global during server rendering; the physical target is resolved after the root mounts during hydration.
