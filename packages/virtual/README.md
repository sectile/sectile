# @sectile/virtual

The type-only package root exports `VirtualErrorCode`, `VirtualError`, and `VirtualResult`. Virtual-owned failures do not extend the Core error union.

Framework-independent layout engines for large, dynamically sized surfaces. Stable IDs, extent evidence or rectangles, and a viewport produce an explicit layout plan; measurements and collection mutations produce new state plus scroll correction.

Import runtime APIs from explicit subpaths such as `@sectile/virtual/extent-index`, `@sectile/virtual/linear-layout`, `@sectile/virtual/masonry-layout`, `@sectile/virtual/spatial-layout`, and `@sectile/virtual/track-grid-layout`.

Browser scheduling, `ResizeObserver`, scroll correction, and Vue rendering live in
`@sectile/dom/virtual` and `@sectile/vue/virtual/core`. This package never reads or
writes host elements.

Layout states are opaque runtime handles. Use each strategy's
`snapshot*Layout()` and `restore*Layout()` functions for worker transfer, SSR,
persistence, or replay; restoration validates the serializable snapshot and
rebuilds hidden search indexes.
