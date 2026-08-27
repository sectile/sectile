---
title: Virtualized surfaces in Vue
description: Build large lists, responsive grids, masonry collections, and spatial surfaces with ordinary Vue markup.
---

# Virtualized surfaces in Vue

Use `VirtualList` for ordinary vertical and horizontal lists. The application provides its data, stable keys, and row markup. Sectile mounts only the nearby rows and updates their layout from browser measurements.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VirtualList } from '@sectile/vue/virtual'
import WorkItemRow from './WorkItemRow.vue'

interface WorkItem {
  id: string
  title: string
  description: string
}

const rows = ref<WorkItem[]>(loadWorkItems())
const rowKey = (row: WorkItem) => row.id
</script>

<template>
  <VirtualList
    :items="rows"
    :get-key="rowKey"
    :overscan="240"
    class="work-list"
  >
    <template #default="{ value }">
      <WorkItemRow :work="value" />
    </template>
  </VirtualList>
</template>

<style scoped>
.work-list { height: 32rem; }
</style>
```

`WorkItemRow` belongs to the example application; it is not a Sectile API. The slot receives the original array entry as `value`, along with `index`, `key`, and `placement`.

You can omit row heights. The first layout starts from a 48px fallback, then replaces it with each row's measured DOM height. Expansion, wrapping, and other intrinsic-size changes are measured again automatically.

Choose a size input when the application already knows more:

| Available size information | Prop | Behavior |
| --- | --- | --- |
| One exact size for every row | `itemSize` | Uses fixed geometry and skips item measurement. |
| An approximate initial size | `estimateSize` | Renders from the estimate, then corrects it from DOM measurements. Accepts one number or an item function. |
| None | omit both | Starts at 48px and replaces it with measured sizes. |

`itemSize` and `estimateSize` select different execution paths and are mutually exclusive.

Replacing the array reconciles it by stable key. Surviving rows retain their measurements across insertion, removal, and movement, while the scroll correction keeps the active viewport anchored.

Use `as`, `contentAs`, and `itemAs` to choose the rendered elements. `itemAttributes` can provide row-specific classes, accessibility attributes, and data attributes. Sectile applies only the positioning and observation styles required for virtualization.

## Grid, masonry, and spatial layouts

Each built-in layout has a declarative component. All four components use `items`, `getKey`, and the default slot in the same way.

| Surface | Component | Size handling |
| --- | --- | --- |
| One-dimensional list | `VirtualList` | Measures each item's height or width. |
| Responsive grid | `VirtualGrid` | Recomputes columns from the viewport and uses the tallest cell as each row's height. |
| Uneven card collection | `VirtualMasonry` | Measures every card and fills the shortest lane first. |
| Canvas or diagram | `VirtualSpatial` | Uses application-owned coordinates, renders intersecting items, and can correct their size from the DOM. |

`VirtualGrid` and `VirtualMasonry` are responsive when `laneCount` is omitted. They derive the number and width of lanes from the viewport while preserving `minLaneSize`. Supply `laneCount` only for a fixed lane count.

The component root is the scroll viewport. Give it a browser-resolvable size through `height`, `max-height`, or a constrained flex layout.

```vue
<script setup lang="ts">
import { VirtualGrid } from '@sectile/vue/virtual'
</script>

<template>
<VirtualGrid
  :items="products"
  :get-key="product => product.id"
  :min-lane-size="240"
  :max-lane-count="6"
  :lane-gap="16"
  :row-gap="16"
  class="product-grid"
>
  <template #default="{ value }">
    <ProductCard :product="value" />
  </template>
</VirtualGrid>
</template>
```

Switch to `VirtualMasonry` when cards have intrinsic heights and should fill the shortest available lane. The application does not need to calculate card heights.

```vue
<script setup lang="ts">
import { VirtualMasonry } from '@sectile/vue/virtual'
</script>

<template>
<VirtualMasonry
  :items="articles"
  :get-key="article => article.id"
  :min-lane-size="280"
  :lane-gap="20"
  :item-gap="20"
  class="article-board"
>
  <template #default="{ value }">
    <ArticleCard :article="value" />
  </template>
</VirtualMasonry>
</template>
```

Use `VirtualSpatial` when position belongs to the data. `getRect` supplies initial coordinates and size. Its `measureSize` prop defaults to `true`, so the DOM can replace the estimated width and height while preserving the supplied position.

```vue
<script setup lang="ts">
import { VirtualSpatial } from '@sectile/vue/virtual'
</script>

<template>
<VirtualSpatial
  :items="nodes"
  :get-key="node => node.id"
  :get-rect="node => ({
    x: node.x,
    y: node.y,
    width: node.estimatedWidth,
    height: node.estimatedHeight,
  })"
  :get-z-index="node => node.layer"
  class="diagram"
>
  <template #default="{ value }">
    <DiagramNode :node="value" />
  </template>
</VirtualSpatial>
</template>
```

## Direct layout control

Use `VirtualizerRoot`, `VirtualizerContent`, `VirtualizerItem`, or `useVirtualizer` for merged cells, reversed axes, or an application-specific layout strategy. This path accepts the existing `@sectile/virtual` state and strategy contracts.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { createSequence } from '@sectile/core/sequence'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, linearLayoutStrategy } from '@sectile/virtual/linear-layout'
import {
  createAxisMeasurementResolver,
  VirtualizerContent,
  VirtualizerItem,
  VirtualizerRoot,
} from '@sectile/vue/virtual'

const ids = Array.from({ length: 100_000 }, (_, index) => `item-${index}`)
const layout = shallowRef(createLinearLayout(
  createSequence(ids),
  createUniformExtentIndex(ids.length, { kind: 'unknown', fallback: 36 }),
  { crossExtent: 320 },
))
</script>

<template>
  <VirtualizerRoot
    :default-state="layout"
    :strategy="linearLayoutStrategy"
    :measure="createAxisMeasurementResolver('vertical')"
    :overscan="240"
    class="virtual-list"
    @state-change="layout = $event"
    v-slot="{ placements }"
  >
    <VirtualizerContent>
      <VirtualizerItem
        v-for="placement in placements"
        :key="placement.id"
        :placement="placement"
        size="width"
      >
        {{ placement.id }}
      </VirtualizerItem>
    </VirtualizerContent>
  </VirtualizerRoot>
</template>
```

Provide `initialViewport` when the server must render the first window. The browser replaces that deterministic starting geometry with the real viewport after connection.
