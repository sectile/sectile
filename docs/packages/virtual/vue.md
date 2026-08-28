---
title: Vue connection
description: Virtualize lists, responsive grids, masonry cards, and spatial surfaces with declarative markup.
---

# Vue connection

`@sectile/vue/virtual` accepts an item array, stable keys, and slot markup, then measures real rendered elements automatically.

## Install

```sh
pnpm add vue @sectile/vue @sectile/virtual
```

## List

```vue
<script setup lang="ts">
import { VirtualList } from '@sectile/vue/virtual'

const rows = Array.from({ length: 50_000 }, (_, index) => ({
  id: `row-${index}`,
  text: `Row ${index + 1}`,
}))
</script>

<template>
  <VirtualList :items="rows" :get-key="row => row.id" class="list">
    <template #default="{ value: row }">
      <p>{{ row.text }}</p>
    </template>
  </VirtualList>
</template>

<style scoped>
.list { height: 24rem; }
</style>
```

Omitting size props measures an initial DOM sample before creating the virtual layout. The sample covers the initial render range for a list, the first row for a grid, and the first lane set for masonry. More complex item DOM adds to this bootstrap cost. `estimateSize` supplies the starting estimate directly, while `itemSize` skips measurement when every item has the same exact size.

## Declarative components

| Component | Surface | Main input |
| --- | --- | --- |
| `VirtualList` | Vertical or horizontal list | `items`, `getKey`, `axis` |
| `VirtualGrid` | Vertically flowing grid with responsive columns | `minLaneSize`, `maxLaneCount` |
| `VirtualMasonry` | Variable-height cards | `minLaneSize`, `placementPolicy` |
| `VirtualSpatial` | Application-positioned canvas | `getRect`, `getZIndex` |

All four components use `items`, `getKey`, and the default slot in the same way. Their root element is the scroll container, so set viewport size with CSS `height`, `max-height`, flex, or grid layout.

## A grid large on both axes

`VirtualGrid` derives responsive columns within viewport width and flows vertically. For a table or schedule with hundreds of independent rows and columns, connect `VirtualizerRoot` to `trackGridLayoutStrategy`. The [300 × 300 grid example](layouts.md#track-grid) contains the complete code.

## Low-level building blocks

Use these components with `useVirtualizer()` for merged cells, reverse axes, or custom measurement rules.

- `VirtualizerRoot`: connect state and layout strategy
- `VirtualizerContent`: apply full content size
- `VirtualizerItem`: connect placement coordinates and measurement

Provide a server-known `initialViewport` when the first visible range is rendered during SSR.
