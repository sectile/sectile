# Virtual

`@sectile/virtual` owns renderer-neutral dynamic-size indexing, viewport state, measurement generations, anchor correction, and layout strategies.

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
import { createMasonryLayout } from '@sectile/virtual/masonry-layout'
import { createTrackGridLayout } from '@sectile/virtual/track-grid-layout'
```

Identity and order stay in `@sectile/core/sequence`. Data loading stays in `@sectile/core/collection-window`. See the [virtualization contract](../theory/virtualization.md).
