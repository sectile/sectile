import { createSequence } from '@sectile/core/sequence'
import { createExtentIndex, type Extent } from '@sectile/virtual/extent-index'
import { createLinearLayout, queryLinearLayout } from '@sectile/virtual/linear-layout'
import { createMasonryLayout, queryMasonryLayout } from '@sectile/virtual/masonry-layout'
import { createSpatialLayout, querySpatialLayout } from '@sectile/virtual/spatial-layout'
import { createTrackGridLayout, queryTrackGridLayout } from '@sectile/virtual/track-grid-layout'
import type { VirtualLayoutPlan, VirtualRect } from '@sectile/virtual/layout'

export type ExplorerStrategy = 'linear' | 'track-grid' | 'masonry' | 'spatial'

const exact = (value: number): Extent => ({ kind: 'exact', value })

export const explorerItemCounts: Readonly<Record<ExplorerStrategy, number>> = Object.freeze({
  linear: 100_000,
  'track-grid': 96_000,
  masonry: 90_000,
  spatial: 100_000,
})

let linear: ReturnType<typeof createLinearLayout> | undefined
let grid: ReturnType<typeof createTrackGridLayout> | undefined
let spatial: ReturnType<typeof createSpatialLayout> | undefined
const masonryByLaneCount = new Map<number, ReturnType<typeof createMasonryLayout>>()

function linearState(): ReturnType<typeof createLinearLayout> {
  if (linear !== undefined) return linear
  const ids = Array.from({ length: explorerItemCounts.linear }, (_, index) => `row-${index}`)
  linear = createLinearLayout(
    createSequence(ids),
    createExtentIndex(ids.map((_, index) => exact(48 + ((index * 17) % 21)))),
    { gap: 6, crossExtent: 920 },
  )
  return linear
}

function gridState(): ReturnType<typeof createTrackGridLayout> {
  if (grid !== undefined) return grid
  const columnCount = 40
  const rowCount = explorerItemCounts['track-grid'] / columnCount
  const rows = createExtentIndex(Array.from({ length: rowCount }, (_, index) => exact(52 + (index % 4) * 4)))
  const columns = createExtentIndex(Array.from({ length: columnCount }, (_, index) => exact(112 + (index % 3) * 18)))
  const regions = Array.from({ length: explorerItemCounts['track-grid'] }, (_, index) => ({
    id: `cell-${Math.floor(index / columnCount)}-${index % columnCount}`,
    row: Math.floor(index / columnCount),
    column: index % columnCount,
  }))
  grid = createTrackGridLayout(rows, columns, regions, { rowGap: 2, columnGap: 2 })
  return grid
}

function masonryState(laneCount: number): ReturnType<typeof createMasonryLayout> {
  const cached = masonryByLaneCount.get(laneCount)
  if (cached !== undefined) return cached
  const ids = Array.from({ length: explorerItemCounts.masonry }, (_, index) => `tile-${index}`)
  const state = createMasonryLayout(
    createSequence(ids),
    createExtentIndex(ids.map((_, index) => exact(72 + ((index * 31) % 110)))),
    { laneCount, laneExtent: 132, laneGap: 12, itemGap: 12 },
  )
  masonryByLaneCount.set(laneCount, state)
  return state
}

function spatialState(): ReturnType<typeof createSpatialLayout> {
  if (spatial !== undefined) return spatial
  spatial = createSpatialLayout(Array.from({ length: explorerItemCounts.spatial }, (_, index) => ({
    id: `node-${index}`,
    rect: {
      x: 30 + ((index * 137) % 32_000),
      y: 24 + ((index * 89) % 20_000),
      width: 96 + ((index * 11) % 92),
      height: 54 + ((index * 7) % 72),
    },
    zIndex: (index % 7) - 3,
  })))
  return spatial
}

export function queryExplorerStrategy(
  strategy: ExplorerStrategy,
  viewport: VirtualRect,
  overscan: number,
  laneCount: number,
): VirtualLayoutPlan {
  if (strategy === 'linear') return queryLinearLayout(linearState(), { viewport, overscan })
  if (strategy === 'track-grid') return queryTrackGridLayout(gridState(), { viewport, overscan })
  if (strategy === 'masonry') return queryMasonryLayout(masonryState(laneCount), { viewport, overscan })
  return querySpatialLayout(spatialState(), { viewport, overscan })
}
