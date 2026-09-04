---
title: Vue connection
description: Virtualize lists, responsive grids, masonry cards, and spatial surfaces with declarative Vue components.
---

# Vue connection

The declarative Virtual components accept an item collection, a stable `getID` resolver, and an explicit sizing policy. They keep one scrollport and one surface while the collection moves between bootstrap, ready, and empty states.

## Install

```sh
pnpm add vue @sectile/vue @sectile/virtual
```

## List

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
.list { height: 24rem; overflow: auto; }
</style>
```

`sizePolicy` makes main-axis size ownership explicit. Use `{ kind: 'fixed', extent }` when every item has the same exact size, `{ kind: 'estimated', estimate }` when mounted elements should refine an initial estimate, or `{ kind: 'measured' }` when the first rendered sample must establish the initial estimate. Measured bootstrap happens inside the same surface that later renders placements.

## Declarative components

| Component | Surface | Layout-specific input |
| --- | --- | --- |
| `VirtualList` | Vertical or horizontal list | `sizePolicy`, `axis`, `gap` |
| `VirtualGrid` | Dense vertically flowing grid | `sizePolicy`, `lanePolicy`, `rowGap` |
| `VirtualMasonry` | Variable-height masonry cards | `sizePolicy`, `lanePolicy`, `itemGap`, `placementPolicy` |
| `VirtualSpatial` | Application-positioned canvas | `getRect`, `getZIndex`, `sizeOwnership` |

Grid and Masonry accept either a fixed lane policy such as `{ kind: 'fixed', count: 4, gap: 12 }` or a responsive policy such as `{ kind: 'responsive', minExtent: 180, maxCount: 6, gap: 12 }`. Spatial uses `sizeOwnership: 'declared'` when `getRect` owns width and height, or `'mounted'` when DOM measurements own width and height while `getRect` continues to own position.

All four high-level components use `items`, `getID`, and the named `header`, `item`, `empty`, and `footer` slots. Their exposed contract is also shared: `scrollport`, `surface`, `state`, `plan`, `phase`, `scrollToID()`, `refresh()`, and `flush()`. `scrollToID()` and `flush()` return controlled results even before the host elements are connected.

Use `viewportInsets` when sticky or overlay UI permanently occludes part of the visible viewport. Header and footer slots are ordinary frame regions outside the item domain; they are not synthetic virtual items.

## A grid large on both axes

`VirtualGrid` derives a dense lane layout and flows along the main axis. For a table or schedule with hundreds of independent rows and columns, connect `VirtualizerRoot` to `trackGridLayoutStrategy`. The [300 × 300 grid example](layouts.md#track-grid) contains the complete code.

## Low-level building blocks

Use `@sectile/vue/virtual/core` when you need a custom layout strategy, merged cells, custom measurements, or manual mutations.

- `VirtualizerRoot`: connect layout state to the scrollport
- `VirtualizerHeader`: render an optional leading frame region
- `VirtualizerSurface`: establish the layout coordinate surface and apply plan size
- `VirtualizerItem`: project one placement and, when configured, measure it
- `VirtualizerFooter`: render an optional trailing frame region

Provide a deterministic `initialViewport` when the first visible range is rendered during SSR. Otherwise the initial plan is produced after the browser mounts the host elements.
