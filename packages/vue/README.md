# @sectile/vue

Headless Vue components backed by Sectile DOM semantics.

## Responsibility

- Expose controlled and uncontrolled state through Vue conventions
- Render accessible compound components without aesthetic styles
- Forward attributes and styling hooks to consumer-owned elements
- Reuse `@sectile/dom` projections for ARIA and interaction behavior
- Follow Vue and HTML naming at the public boundary instead of exposing core policies

Components expose stable `data-scope`, `data-part`, and `data-state` attributes. Styling, themes, spacing, and animation remain application responsibilities.

`@sectile/vue/virtual/core` provides the typed `useVirtualizer` composable and
`VirtualizerRoot`, `VirtualizerHeader`, `VirtualizerSurface`, `VirtualizerItem`,
and `VirtualizerFooter` headless parts. `VirtualizerItem` supports `asChild`, so
existing collection items keep their semantic element while receiving virtual
placement and measurement refs. Install `@sectile/virtual` separately when using
this subpath; the rest of `@sectile/vue` does not require it.

`@sectile/vue/editor` composes renderer-neutral `@sectile/editor` sessions with
the browser behavior in `@sectile/dom/editor`. It provides Vue render parts for
the editor root, inline surfaces, inline atoms, hard breaks, isolated frames, and
authoring mounts while keeping document transforms and selection semantics in
their existing owners. Install `@sectile/content` and `@sectile/editor` when
using this optional subpath.
