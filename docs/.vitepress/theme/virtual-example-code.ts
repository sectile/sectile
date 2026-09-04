import type { Host } from './host-preference.js';

export type VirtualExampleKind = 'list' | 'grid' | 'masonry' | 'spatial';

type VirtualExampleSources = Readonly<Record<Host, string>>;

const listSources: VirtualExampleSources = Object.freeze({
  vue: `<script setup lang="ts">
import { VirtualList } from '@sectile/vue/virtual/list'

const rows = Array.from({ length: 50_000 }, (_, index) => ({
  id: \`row-\${index}\`,
  title: \`Row \${index + 1}\`,
  lines: Array.from(
    { length: 1 + (index % 3) },
    () => 'Content determines this row height.',
  ),
}))
</script>

<template>
  <VirtualList
    :items="rows"
    :get-i-d="row => row.id"
    :size-policy="{ kind: 'measured' }"
  >
    <template #item="{ value: row }">
      <article>
        <h3>{{ row.title }}</h3>
        <p v-for="(line, lineIndex) in row.lines" :key="lineIndex">
          {{ line }}
        </p>
      </article>
    </template>
  </VirtualList>
</template>`,
  dom: `import { createSequence } from '@sectile/core/sequence'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, linearLayoutStrategy } from '@sectile/virtual/linear-layout'
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualItemStyle,
  virtualSurfaceStyle,
} from '@sectile/dom/virtual'

const ids = Array.from({ length: 50_000 }, (_, index) => \`row-\${index}\`)
let state = createLinearLayout(
  createSequence(ids),
  createUniformExtentIndex(ids.length, { kind: 'unknown', fallback: 48 }),
  { crossExtent: list.clientWidth },
)

createVirtualizer({
  scrollport: list,
  surface: listSurface,
  state,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange: next => { state = next },
  onPlanChange: plan => {
    Object.assign(listSurface.style, virtualSurfaceStyle(plan))
    renderRows(plan, virtualItemStyle)
  },
})`,
  core: `import { createSequence } from '@sectile/core/sequence'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, queryLinearLayout } from '@sectile/virtual/linear-layout'

const ids = Array.from({ length: 50_000 }, (_, index) => \`row-\${index}\`)
const state = createLinearLayout(
  createSequence(ids),
  createUniformExtentIndex(ids.length, { kind: 'unknown', fallback: 48 }),
  { crossExtent: 640 },
)

const plan = queryLinearLayout(state, {
  viewport: { x: 0, y: 12_000, width: 640, height: 384 },
  overscan: 240,
})

console.log(plan.placements)`,
  terminal: `import { createSequence } from '@sectile/core/sequence'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, queryLinearLayout } from '@sectile/virtual/linear-layout'

const ids = Array.from({ length: 50_000 }, (_, index) => \`row-\${index}\`)
const state = createLinearLayout(
  createSequence(ids),
  createUniformExtentIndex(ids.length, { kind: 'exact', value: 1 }),
  { crossExtent: process.stdout.columns },
)

const plan = queryLinearLayout(state, {
  viewport: { x: 0, y: offset, width: process.stdout.columns, height: process.stdout.rows },
  overscan: 2,
})

process.stdout.write(plan.placements.map(row => row.id).join('\\n'))`,
});

const gridSources: VirtualExampleSources = Object.freeze({
  vue: `<script setup lang="ts">
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createDenseTrackGridLayout, trackGridLayoutStrategy } from '@sectile/virtual/track-grid-layout'
import { VirtualizerItem, VirtualizerRoot, VirtualizerSurface } from '@sectile/vue/virtual/core'

const count = 300
const ids = Array.from({ length: count * count }, (_, index) =>
  \`cell-\${Math.floor(index / count)}-\${index % count}\`,
)
const grid = createDenseTrackGridLayout(
  createUniformExtentIndex(count, { kind: 'exact', value: 28 }),
  createUniformExtentIndex(count, { kind: 'exact', value: 72 }),
  ids,
)
</script>

<template>
  <VirtualizerRoot
    :default-state="grid"
    :strategy="trackGridLayoutStrategy"
  >
    <template v-slot="{ placements }">
      <VirtualizerSurface>
        <VirtualizerItem
          v-for="cell in placements"
          :key="cell.id"
          :placement="cell"
          size="both"
        >
          {{ cell.id }}
        </VirtualizerItem>
      </VirtualizerSurface>
    </template>
  </VirtualizerRoot>
</template>`,
  dom: `import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createDenseTrackGridLayout, trackGridLayoutStrategy } from '@sectile/virtual/track-grid-layout'
import { createVirtualizer, virtualSurfaceStyle } from '@sectile/dom/virtual'

const count = 300
const ids = Array.from({ length: count * count }, (_, index) =>
  \`cell-\${Math.floor(index / count)}-\${index % count}\`,
)
const state = createDenseTrackGridLayout(
  createUniformExtentIndex(count, { kind: 'exact', value: 28 }),
  createUniformExtentIndex(count, { kind: 'exact', value: 72 }),
  ids,
)

createVirtualizer({
  scrollport: grid,
  surface: gridSurface,
  state,
  strategy: trackGridLayoutStrategy,
  overscan: 160,
  onPlanChange: plan => {
    Object.assign(gridSurface.style, virtualSurfaceStyle(plan))
    renderCells(plan)
  },
})`,
  core: `import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createDenseTrackGridLayout, queryTrackGridLayout } from '@sectile/virtual/track-grid-layout'

const count = 300
const ids = Array.from({ length: count * count }, (_, index) =>
  \`cell-\${Math.floor(index / count)}-\${index % count}\`,
)
const grid = createDenseTrackGridLayout(
  createUniformExtentIndex(count, { kind: 'exact', value: 28 }),
  createUniformExtentIndex(count, { kind: 'exact', value: 72 }),
  ids,
)

const plan = queryTrackGridLayout(grid, {
  viewport: { x: 18_000, y: 5_000, width: 640, height: 384 },
  overscan: 160,
})

console.log(plan.rowRange, plan.columnRange, plan.placements)`,
  terminal: `// A 300 × 300 grid uses the same query in a terminal viewport.
const plan = queryTrackGridLayout(grid, {
  viewport: {
    x: columnOffset,
    y: rowOffset,
    width: process.stdout.columns,
    height: process.stdout.rows,
  },
  overscan: 2,
})

drawCells(plan.placements)`,
});

const masonrySources: VirtualExampleSources = Object.freeze({
  vue: `<script setup lang="ts">
import { VirtualMasonry } from '@sectile/vue/virtual/masonry'

const cards = Array.from({ length: 30_000 }, (_, index) => ({
  id: \`card-\${index}\`,
  lines: 1 + (index % 5),
}))
</script>

<template>
  <VirtualMasonry
    :items="cards"
    :get-i-d="card => card.id"
    :size-policy="{ kind: 'measured' }"
    :lane-policy="{ kind: 'responsive', minExtent: 104, maxCount: 8, gap: 8 }"
    :item-gap="8"
  >
    <template #item="{ value: card }">
      <article>
        <h3>{{ card.id }}</h3>
        <p v-for="lineIndex in card.lines" :key="lineIndex">
          Content
        </p>
      </article>
    </template>
  </VirtualMasonry>
</template>`,
  dom: `import { createSequence } from '@sectile/core/sequence'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createMasonryLayout, masonryLayoutStrategy } from '@sectile/virtual/masonry-layout'
import { createAxisMeasurementResolver, createVirtualizer, virtualSurfaceStyle } from '@sectile/dom/virtual'

const ids = Array.from({ length: 30_000 }, (_, index) => \`card-\${index}\`)
const state = createMasonryLayout(
  createSequence(ids),
  createUniformExtentIndex(ids.length, { kind: 'unknown', fallback: 96 }),
  { laneCount: 8, laneExtent: 108, laneGap: 8, itemGap: 8 },
)

createVirtualizer({
  scrollport: board,
  surface: boardSurface,
  state,
  strategy: masonryLayoutStrategy,
  measure: createAxisMeasurementResolver('vertical'),
  onPlanChange: plan => {
    Object.assign(boardSurface.style, virtualSurfaceStyle(plan))
    renderCards(plan)
  },
})`,
  core: `const plan = queryMasonryLayout(masonry, {
  viewport: { x: 0, y: 20_000, width: 664, height: 384 },
  overscan: 240,
})

console.log(plan.placements)`,
  terminal: `const plan = queryMasonryLayout(masonry, {
  viewport: { x: 0, y: offset, width: process.stdout.columns, height: process.stdout.rows },
  overscan: 2,
})

drawCards(plan.placements)`,
});

const spatialSources: VirtualExampleSources = Object.freeze({
  vue: `<script setup lang="ts">
import { VirtualSpatial } from '@sectile/vue/virtual/spatial'

const nodes = Array.from({ length: 40_000 }, (_, index) => {
  const cluster = Math.floor(index / 180)
  const local = index % 180
  const angle = local * 2.4
  const radius = Math.sqrt(local) * 26

  return {
    id: \`service-\${index}\`,
    x: 480 + (cluster % 15) * 1_000 + Math.cos(angle) * radius,
    y: 450 + Math.floor(cluster / 15) * 800 + Math.sin(angle) * radius,
    width: 72 + (index % 4) * 12,
    height: 40 + (index % 3) * 8,
    layer: local === 0 ? 2 : 0,
  }
})
</script>

<template>
  <VirtualSpatial
    :items="nodes"
    :get-i-d="node => node.id"
    :get-rect="node => node"
    :get-z-index="node => node.layer"
    size-ownership="declared"
  >
    <template #item="{ value: node }">
      {{ node.id }}
    </template>
  </VirtualSpatial>
</template>`,
  dom: `import { createSpatialLayout, spatialLayoutStrategy } from '@sectile/virtual/spatial-layout'
import { createVirtualizer, virtualSurfaceStyle } from '@sectile/dom/virtual'

const nodes = serviceMap.map(node => ({
  id: node.id,
  rect: {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  },
  zIndex: node.layer,
}))

createVirtualizer({
  scrollport: canvas,
  surface: canvasSurface,
  state: createSpatialLayout(nodes),
  strategy: spatialLayoutStrategy,
  overscan: 160,
  onPlanChange: plan => {
    Object.assign(canvasSurface.style, virtualSurfaceStyle(plan))
    renderNodes(plan)
  },
})`,
  core: `const plan = querySpatialLayout(spatial, {
  viewport: { x: 12_000, y: 12_000, width: 640, height: 384 },
  overscan: 160,
})

console.log(plan.placements)`,
  terminal: `const plan = querySpatialLayout(spatial, {
  viewport: {
    x: columnOffset,
    y: rowOffset,
    width: process.stdout.columns,
    height: process.stdout.rows,
  },
  overscan: 2,
})

drawNodes(plan.placements)`,
});

const byKind: Readonly<Record<VirtualExampleKind, VirtualExampleSources>> = Object.freeze({
  list: listSources,
  grid: gridSources,
  masonry: masonrySources,
  spatial: spatialSources,
});

export function virtualExampleSources(kind: VirtualExampleKind): VirtualExampleSources {
  return byKind[kind];
}
