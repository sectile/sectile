import { createSequence } from '@sectile/core/sequence'
import { createExtentIndex, type Extent } from '@sectile/virtual/extent-index'
import { createLinearLayout, type LinearLayoutState, type LinearPatch } from '@sectile/virtual/linear-layout'

export const unknownExtent = (fallback: number): Extent => ({ kind: 'unknown', fallback })

export function createExampleLayout(itemCount: number, fallback: number): LinearLayoutState {
  const ids = Array.from({ length: itemCount }, (_, index) => `request-${100_000 + index}`)
  const maxItems = itemCount + 10_000

  return createLinearLayout(
    createSequence(ids, { maxItems }),
    createExtentIndex(ids.map(() => unknownExtent(fallback)), { maxItems }),
    { axis: 'vertical', gap: 8, crossExtent: 960 },
  )
}

export function insertBeforeViewport(id: string, fallback: number): LinearPatch {
  return {
    patch: { type: 'splice', index: 0, deleteCount: 0, inserted: [id] },
    insertedExtents: [unknownExtent(fallback)],
  }
}

export const removeFirstItem: LinearPatch = {
  patch: { type: 'splice', index: 0, deleteCount: 1, inserted: [] },
}

export const moveFirstItem: LinearPatch = {
  patch: { type: 'move', from: 0, to: 120, count: 1 },
}
