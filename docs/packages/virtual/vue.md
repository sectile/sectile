---
title: Virtual Vue connection
description: Render virtual placements with useVirtualizer or headless Vue parts.
---

# Virtual Vue connection

`@sectile/vue/virtual` offers two levels. Use `VirtualizerRoot`, `VirtualizerContent`, and `VirtualizerItem` for normal templates. Use `useVirtualizer` when generic strategy types, manual measurements, custom coordinates, or mutations must stay in application code.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { createSequence } from '@sectile/core/sequence'
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, linearLayoutStrategy } from '@sectile/virtual/linear-layout'
import {
  createAxisMeasurementResolver,
  VirtualizerContent,
  VirtualizerItem,
  VirtualizerRoot,
} from '@sectile/vue/virtual'

const items = Array.from({ length: 100_000 }, (_, index) => `item-${index}`)
const layout = shallowRef(createLinearLayout(
  createSequence(items),
  createExtentIndex(items.map(() => ({ kind: 'unknown' as const, fallback: 36 }))),
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

<style scoped>
.virtual-list { width: 20rem; height: 24rem; overflow: auto; }
</style>
```

The root owns its current layout state after `defaultState` initializes it and emits every committed state. `overscan` stays reactive. Strategy, measurement resolver, and `initialViewport` are construction-time options.

Provide a deterministic `initialViewport` for an SSR plan. Without it, Vue does not guess a server viewport and renders the first window after mount.

Semantic collection components still receive every identity. Apply virtualization only to the rendered item parts, using `asChild` when a Virtualizer item must share one element with Listbox, Feed, or Grid.
