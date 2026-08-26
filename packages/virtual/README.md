# @sectile/virtual

The type-only package root exports `VirtualErrorCode`, `VirtualError`, and `VirtualResult`. Virtual-owned failures do not extend the Core error union.

Renderer-neutral virtualization primitives and layout engines for dynamic content.

Import runtime APIs from explicit subpaths such as `@sectile/virtual/extent-index`, `@sectile/virtual/linear-layout`, `@sectile/virtual/masonry-layout`, `@sectile/virtual/spatial-layout`, and `@sectile/virtual/track-grid-layout`.

Browser scheduling, `ResizeObserver`, scroll anchoring, and Vue rendering live in
`@sectile/dom/virtual` and `@sectile/vue/virtual`. This package never reads or
writes host elements.
