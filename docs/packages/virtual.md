# Virtual

`@sectile/virtual` owns renderer-neutral dynamic-size indexing, viewport state, measurement generations, anchor correction, and layout strategies.

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
import { createMasonryLayout } from '@sectile/virtual/masonry-layout'
import { createSpatialLayout } from '@sectile/virtual/spatial-layout'
import { createTrackGridLayout } from '@sectile/virtual/track-grid-layout'
```

Identity and order stay in `@sectile/core/sequence`. Data loading stays in `@sectile/core/collection-window`. See the [virtualization contract](../theory/virtualization.md).

The package never reads DOM geometry. Use `@sectile/dom/virtual` for frame-batched browser measurement and scroll anchoring, or `@sectile/vue/virtual` for the Vue composable and headless rendering parts.

Layout states are opaque runtime handles. Do not clone them with object spread or
send them through `structuredClone()`. Every strategy instead exports a matching
`snapshot*Layout()` and `restore*Layout()` pair. Snapshots contain only IDs,
extents, geometry, policies, and the active generation, so they can cross a worker
or SSR serialization boundary. Restoration validates the snapshot and rebuilds
the strategy's search indexes before it can be queried.
