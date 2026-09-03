---
title: Virtual surface framing
description: Accepted coordinate, ownership, composition, and validation contract for non-virtual regions around a virtual item surface.
---

# Virtual surface framing

> Status: accepted design; runtime implementation and public API migration are pending.

Virtualization owns the geometry of a bounded item surface. A scroll container may also contain a header, footer, toolbar, loading status, or other non-virtual regions. Those regions must not become synthetic virtual items, but their physical position still affects viewport queries, target scrolling, anchoring, and the browser scroll range.

This decision defines one coordinate contract for every Virtual layout and one host composition contract for DOM and Vue. It is intentionally derived from Sectile ownership and performance rules rather than the current high-level API. The migration will not retain compatibility aliases.

## Decision

A virtualized host consists of a **scrollport**, one **virtual surface**, and optional **frame regions** around that surface.

```text
scrollport                         data-part="root"
├── header?                       data-part="header"
├── surface                       data-part="surface"
│   ├── item...                   data-part="item"
│   └── empty?                    data-part="empty"
└── footer?                       data-part="footer"
```

The surface is both the local coordinate origin and the box that projects `VirtualLayoutPlan.contentSize`. A second content wrapper would duplicate those responsibilities, add a constant DOM node, and create ambiguity about which element owns placement coordinates. Bootstrap and empty phases reuse the same surface without applying a ready-plan size.

Header and footer are ordinary flow regions inside the scrollport. Sticky positioning remains a CSS choice. Persistent occlusion from sticky or overlay content is declared explicitly through viewport insets; the host does not infer it from computed styles.

## Terminology

| Term | Meaning |
| --- | --- |
| **scrollport** | The host element that owns scroll offsets and visible client extents. |
| **surface** | The normal-flow element whose top-left establishes Virtual coordinate `(0, 0)`. |
| **frame region** | A non-virtual element that can move the surface origin or change the scroll range, such as a header or footer. |
| **viewport inset** | A persistent leading or trailing occlusion inside the scrollport, such as a sticky header. |
| **placement** | A stable item identity and rectangle in surface-local coordinates. |
| **anchor** | A visible virtual item whose screen coordinate may be preserved across a layout or frame change. |

“Header” and “footer” are physical block-flow names. They do not change position when a linear layout uses a horizontal axis or reverse item flow.

## Semantic ownership

The behavior is split by authority.

| Owner | Responsibility |
| --- | --- |
| `@sectile/core` | Stable identity, `Sequence`, and generic immutable patch foundations. |
| `@sectile/virtual` | Item-domain projection, extent and layout state, surface-frame algebra, viewport normalization, placement, anchoring, and target-scroll coordinates. |
| `@sectile/dom` | Scrollport and surface measurement, ResizeObserver ownership, frame invalidation, scroll reads and writes, and resource cleanup. |
| `@sectile/vue` | Reactive connection, slots, stable part anatomy, direct VNode projection, SSR, and hydration. |
| `@sectile/tabular` | Tabular row, column, region, and pinned-track semantics. It does not own host header or footer regions. |

Portable identity validation, raw-array change discovery, extent reconciliation, responsive lane calculation, and layout-specific collection repair must not remain implemented in Vue. Vue may schedule those operations and render their result, but `@sectile/virtual` is the canonical owner.

## Item-domain closure

The Virtual item domain contains only virtualized items. Frame regions are excluded from all domain observations.

A header or footer must never appear in:

- a stable item ID sequence;
- a placement or placement index;
- an item measurement batch;
- an anchor candidate;
- a layout snapshot;
- a collection patch; or
- `VirtualLayoutPlan.contentSize`.

Synthetic header IDs, footer sentinels, zero-sized frame items, and reserved negative indexes are therefore invalid representations. Loading remains a collection-window or application-state concern rather than a hidden virtual item. A host may render loading state in a frame region without changing the item domain.

## Coordinate spaces

The contract distinguishes three spaces.

1. **Scrollport space** contains the physical scroll offset and effective visible rectangle.
2. **Surface space** is the layout-local coordinate system used by Virtual state, queries, plans, placements, snapshots, and target-scroll results.
3. **Element space** is the browser geometry observed from actual elements.

DOM projects element-space evidence into scrollport space, then uses pure Virtual surface-frame functions to enter or leave surface space. Vue does not define an independent coordinate policy.

### Surface frame

Let:

- `P` be the scrollport viewport in the scrollport’s scrollable-content coordinates;
- `O` be the surface origin in the same coordinates;
- `I` be persistent viewport insets; and
- `V` be the resulting surface-local viewport.

The projection is:

```text
V.x      = P.x + I.left - O.x
V.y      = P.y + I.top  - O.y
V.width  = max(0, P.width  - I.left - I.right)
V.height = max(0, P.height - I.top  - I.bottom)
```

The surface origin is not a transient `getBoundingClientRect()` offset. It is the surface position in the scrollport’s scrollable-content coordinate system, so ordinary scrolling can reuse a cached frame.

The pure owner is a focused `@sectile/virtual/surface` subpath:

```ts
export interface VirtualSurfaceFrame {
  readonly origin: VirtualPoint
  readonly viewportInsets: VirtualInsets
}

export interface VirtualSurfaceFrameInput {
  readonly origin?: Partial<VirtualPoint>
  readonly viewportInsets?: number | Partial<VirtualInsets>
}

export function createVirtualSurfaceFrame(
  input?: VirtualSurfaceFrameInput,
): VirtualSurfaceFrame

export function toVirtualViewport(
  scrollportViewport: VirtualRect,
  frame: VirtualSurfaceFrame,
): VirtualRect

export function toScrollportPoint(
  surfacePoint: VirtualPoint,
  frame: VirtualSurfaceFrame,
): VirtualPoint

export function surfaceFrameScrollDelta(
  previous: VirtualSurfaceFrame,
  next: VirtualSurfaceFrame,
): VirtualPoint
```

These operations validate finite origins and non-negative insets, return frozen values, and use `O(1)` time and space. They do not read elements, retain host resources, or mutate layout state.

Viewport origins may be negative. A negative origin means that part or all of the scrollport is observing flow content before the virtual surface. Width and height remain finite and non-negative.

### Query normalization

Overscan expands the surface-local viewport, while render bounds remain inside the non-negative Virtual content half-plane.

```text
renderLeft   = max(0, V.x - overscan.left)
renderTop    = max(0, V.y - overscan.top)
renderRight  = max(0, V.x + V.width  + overscan.right)
renderBottom = max(0, V.y + V.height + overscan.bottom)

renderWidth  = max(0, renderRight  - renderLeft)
renderHeight = max(0, renderBottom - renderTop)
```

This permits a viewport to remain entirely before the surface without producing invalid negative extents. Every existing layout strategy must accept the same normalized contract; no layout may add a private header offset.

### Target scrolling

A layout strategy returns a target point `T` in surface space. The host projects it back to a physical scrollport target.

```text
scrollTarget.x = T.x + O.x - I.left
scrollTarget.y = T.y + O.y - I.top
```

The DOM host clamps or observes browser clamping at the physical write boundary. Layout strategies continue to reason only about their own content size and placement rectangles.

This rule makes `nearest`, `start`, `center`, and `end` alignment account for sticky occlusion without embedding DOM vocabulary in Virtual layout state.

## Frame changes and anchoring

A frame can change when a header resizes, a registered frame element mounts or unmounts, the scrollport resizes, the surface is repositioned, or viewport insets change.

The main-axis policy is:

- while the effective viewport begins before the surface, preserve the physical scroll position;
- after the effective viewport has entered the surface and a virtual anchor exists, preserve that anchor’s screen coordinate;
- when no anchor exists, publish the newly observed viewport without inventing one; and
- footer-only changes do not change the surface origin or Virtual generation, but they may change the browser scroll range and therefore require a final scroll read.

For an entered surface, frame-only scroll correction is:

```text
frameScrollDelta = (nextOrigin - previousOrigin)
                 - (nextLeadingInset - previousLeadingInset)
```

Frame correction and layout measurement correction are composed into one host scroll write and one final plan publication per scheduled frame. Intermediate plans are not observable.

## Host phases

Every high-level collection uses the same structural phases.

### Surface size authority

The plan is authoritative for both axes. A host must not keep a placeholder layout cross extent while visually overriding item width or height with `100%`; that would make plan geometry, intersection tests, and rendered geometry disagree.

A high-level linear collection derives its cross extent from the effective surface-local viewport: width for a vertical list and height for a horizontal list. A cross-extent change reconfigures layout geometry only when the observed value changes. Flow Grid and Masonry derive lane geometry from the same effective cross extent. `initialViewport` supplies the corresponding server-known value before mount.

### Ready

The surface receives `position: relative` and the plan’s physical width and height. Only returned placements are rendered, and item elements are positioned in surface-local coordinates.

### Bootstrap

A measured-size collection renders the minimum natural-flow sample required to initialize its layout. The surface has no ready-plan size during bootstrap. Header and footer remain present, and the sample size is derived from the effective surface-local viewport rather than the full scrollport rectangle.

### Empty

The surface renders the empty slot in normal flow and receives no synthetic plan size. Header and footer remain present. An empty slot may therefore have natural height without becoming an item or modifying layout state.

The DOM anatomy must remain deterministic across server rendering, hydration, bootstrap, empty, and ready phases. Phase changes may change attributes and children, but they must not substitute a different outer hierarchy.

## High-level Vue contract

`VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial` will share one host contract.

### Slots

```ts
$slots: {
  header?: () => VNodeChild
  item: (props: StrategySpecificItemSlotProps<Value, ID>) => VNodeChild
  empty?: () => VNodeChild
  footer?: () => VNodeChild
}
```

The item renderer is a named slot rather than the default slot. This makes the item domain explicit and leaves header, empty, and footer as peers in the public anatomy. No compatibility default-slot alias will remain.

Item slot props expose `id`, not `key`. Stable domain identity and Vue’s VNode key are related at the rendering boundary but are not the same public concept.

Header and footer receive no plan object by default. Passing a newly allocated or frequently changing plan projection would couple non-virtual subtrees to every scroll update. Applications already own their surrounding state and may use the exposed control surface when imperative Virtual operations are required.

The high-level host creates one native item element per placement and applies positioning, registration, a configurable native tag, and an item-attribute resolver directly to that element. Custom component or `asChild` item composition belongs to the low-level API so the common high-level path does not allocate a Sectile component instance per item.

### Stable parts

All four components expose the same styling parts:

```text
root
header
surface
item
empty
footer
```

The shared phase is exposed as:

```text
data-phase="empty | bootstrap | ready"
```

Items continue to expose stable identity-independent projection attributes such as `data-index`, `data-visible`, and `data-bootstrap` where applicable. The host does not assign semantic ARIA roles to header or footer; slot content chooses native semantics.

### Common inputs

The common high-level input shape is:

```ts
export interface VirtualCollectionBaseProps<
  Value,
  ID extends StableID,
> {
  readonly items: readonly Value[]
  readonly getID: (value: Value, index: number) => ID
  readonly overscan?: number | Partial<VirtualInsets>
  readonly viewportInsets?: number | Partial<VirtualInsets>
  readonly maxItems?: number
  readonly initialViewport?: VirtualRect
  readonly itemAs?: string
  readonly itemAttributes?: (
    value: Value,
    index: number,
  ) => Readonly<Record<string, unknown>>
}
```

`initialViewport` is expressed in surface-local coordinates. A server does not need to know the physical header offset to produce an initial item plan. The browser measures the physical frame during connection and projects subsequent viewports through the same contract.

List, Flow Grid, and Masonry extend the base with `sizePolicy`. Spatial instead extends it with application-owned rectangles, z-order, and an explicit `declared` or `mounted` size-ownership policy.

### Explicit policies

Implicit combinations of optional props will be replaced by discriminated policies. The target vocabulary is:

```ts
export type VirtualSizePolicy<Value> =
  | { readonly kind: 'fixed'; readonly extent: number }
  | {
      readonly kind: 'estimated'
      readonly estimate: number | ((value: Value, index: number) => number)
    }
  | { readonly kind: 'measured' }

export type VirtualLanePolicy =
  | { readonly kind: 'fixed'; readonly count: number; readonly gap?: number }
  | {
      readonly kind: 'responsive'
      readonly minExtent: number
      readonly maxCount: number
      readonly gap?: number
    }
```

Spatial size ownership is explicit as `declared` or `mounted`; it is not represented by a boolean whose opposite meaning must be inferred.

High-level item identities use `StableID`, not a Vue-local string-only key domain. Project naming uses `getID` and `scrollToID`.

### Exposed control

All high-level collections expose one shape specialized by state and ID:

```ts
export type VirtualizerHostErrorCode = 'virtualizer-not-connected'

export type VirtualizerOperationResult<T> = Result<
  T,
  VirtualErrorCode | VirtualizerHostErrorCode
>

export interface VirtualCollectionExpose<State, ID extends StableID> {
  readonly scrollport: ShallowRef<HTMLElement | null>
  readonly surface: ShallowRef<HTMLElement | null>
  readonly state: State
  readonly plan: VirtualLayoutPlan<ID> | null
  readonly phase: 'empty' | 'bootstrap' | 'ready'

  scrollToID(
    id: ID,
    alignment?: VirtualScrollAlignment,
  ): VirtualizerOperationResult<VirtualPoint>

  refresh(): void
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<ID>>
}
```

The host-owned result adds an explicit not-connected failure to Virtual domain failures. Operations do not return `undefined` merely because a hidden low-level ref is absent.

## Low-level Vue contract

The low-level composition surface becomes:

```text
VirtualizerRoot
VirtualizerHeader
VirtualizerSurface
VirtualizerItem
VirtualizerFooter
useVirtualizer
```

`VirtualizerSurface` replaces the current `VirtualizerContent` role and prevents a split between a coordinate frame and a content-size wrapper. It registers the surface element and applies plan size. Header and footer register frame invalidation. Low-level parts support normal attributes, classes, `as`, and `asChild`; the high-level components keep one stable wrapper per optional frame region.

High-level repeated item subtrees render their item element directly and register it through the shared host kernel. They do not allocate one `VirtualizerItem` Vue component instance per placement. `VirtualizerItem` remains available for custom low-level composition.

## DOM connection contract

The DOM constructor names both physical owners.

```ts
createVirtualizer({
  scrollport,
  surface,
  state,
  strategy,
  viewportInsets,
  // measurement and callbacks
})
```

A single connection owns:

- one passive scroll listener;
- one geometry `ResizeObserver` for the scrollport, surface, and bounded frame regions;
- one item `ResizeObserver` for mounted measured items;
- at most one scheduled frame;
- item and element registration maps;
- pending changed entries;
- the cached surface frame; and
- the current placement index.

Ordinary scrolling must not call `getBoundingClientRect()`. It reads the current scroll offsets and combines them with the cached surface frame. Geometry reads occur only after frame invalidation or explicit refresh.

Within one scheduled frame, processing order is fixed:

1. measure a dirty surface frame;
2. read the current physical scrollport viewport;
3. project it into surface space;
4. resolve changed item measurements;
5. apply the Virtual measurement or mutation once;
6. compose layout and frame scroll deltas;
7. write physical scroll at most once;
8. query the final viewport once; and
9. publish state and plan at most once each.

`disconnect()` is idempotent and leaves zero listeners, observer targets, scheduled frames, item registrations, pending entries, placement indexes, and retained frame elements. Stale callbacks after disconnect have no effect.

## Portable collection projection

Raw application arrays do not provide a trusted patch. Their initial projection validates every identity, and replacement may inspect the retained prefix and suffix to discover the changed window.

The canonical bounds are:

```text
initial projection:
  time O(nItem)
  retained O(nItem)

raw array replacement:
  time O(nItem + jChanged)
  additional allocation O(jChanged)

trusted collection patch:
  time and allocation proportional to changed identities plus owning layout repair
```

Vue schedules these paths but does not own them. `@sectile/virtual` reuses Core `Sequence` for identity order and indexing, preserves existing layout measurements by stable ID, and delegates sparse-versus-dense repair to each production layout representation.

Responsive lane calculation is Virtual geometry. It uses the effective surface-local cross extent, not the outer scrollport width and not header or footer dimensions.

## Layout-specific consequences

### Linear

Negative viewport origins are valid on either axis. Header and footer do not alter sequence indexes, extents, gaps, flow, or snapshots. Reverse item flow remains a surface-local layout rule.

### Flow grid

Column count and lane extent derive from effective surface width. A frame resize that does not change that width re-queries the viewport without rebuilding rows or regions.

### Masonry

Header changes do not recompute lane assignment or retained placement geometry. Geometry changes occur only when the lane policy or effective cross extent changes.

### Spatial

Application rectangles remain surface-local. Moving the surface does not rewrite rectangles, rebuild the packed tree, or create an overlay repair.

### Partitioned track grid and Tabular

Pinned rows and columns belong to the item domain and remain Virtual placements. An outer header or footer does not. A host may compose both without subtracting pinned extents twice during target scrolling.

## Complexity and resource contract

Let:

- `nItem` be source item cardinality;
- `jChanged` be the changed source window;
- `kPlacement` be emitted placements;
- `nMounted` be mounted item elements;
- `eChanged` be changed item observer entries; and
- `rFrame` be registered frame regions, bounded by the host anatomy.

The required bounds are:

| Operation | Bound |
| --- | --- |
| Surface-frame projection | `O(1)` time and space |
| Ordinary scroll | owning layout query plus `O(kPlacement)` projection |
| Frame invalidation | `O(rFrame)` geometry evidence plus query and `O(kPlacement)` projection |
| Item measurement batch | `O(eChanged)` resolution plus owning layout repair and `O(kPlacement)` projection |
| Mounted retained host state | `O(nMounted + kPlacement)` |
| Observer instances | `O(1)` per connection |
| Scheduled frames | at most one per connection |

A frame change alone must not increment a Virtual layout generation. A footer resize alone must not rebuild or mutate layout state.

## Rejected representations

| Representation | Reason for rejection |
| --- | --- |
| Header and footer as synthetic items | Violates item-domain closure and contaminates placement, measurement, snapshot, and anchor semantics. |
| Header extents stored in every layout state | Duplicates the same host-frame policy across Linear, Grid, Masonry, Spatial, and partitioned layouts. |
| Vue-only viewport offset callbacks | Leaves the DOM public contract incorrect and makes Vue a second coordinate owner. |
| Padding or spacer compensation | Changes physical geometry without making query, target-scroll, and anchor transforms agree. |
| Computed-style sticky detection | Adds hidden CSS-dependent semantics and layout reads to a hot path. |
| Separate surface and content wrappers | Duplicates coordinate and content-size ownership and adds an unnecessary node. |
| Per-placement high-level component wrappers | Adds framework instances in the repeated hot subtree without semantic value. |
| Built-in loading sentinel item | Conflates collection-window state with item geometry. |

## Implementation sequence

The migration is divided into reviewable transactions.

1. Add pure surface-frame algebra and permit finite negative viewport origins in `@sectile/virtual`.
2. Move portable high-level collection projection and reconciliation from Vue into Virtual-owned exports.
3. Change `@sectile/dom/virtual` to connect an explicit scrollport and surface, cache the frame, and compose frame and layout corrections.
4. Replace the low-level Vue content contract with header, surface, item, and footer parts.
5. Rebuild `VirtualList` on the shared host kernel as the reference high-level implementation.
6. Migrate Grid, Masonry, and Spatial to the same kernel and remove duplicate Vue-owned portable logic.
7. Validate Tabular pinned-track composition without adding frame semantics to Tabular.
8. Update public signatures, breaking mappings, package evidence, examples, and English and Korean manuals.

During implementation, each transaction runs only the narrowest affected production build and `git diff --check`. Tests, generated inventories, browser checks, package evidence, and measurements run at close.

## Required evidence

The final implementation must provide:

- pure law coverage for scrollport-to-surface projection and inverse target projection;
- negative-origin witnesses for Linear, Masonry, Track Grid, Partitioned Track Grid, and Spatial;
- DOM lifecycle churn with zero-resource cleanup and stale-callback rejection;
- one-publication evidence when frame and item measurements arrive in the same scheduled frame;
- Vue type fixtures for common slots, `StableID`, policies, and exposed controls;
- SSR and hydration evidence for empty, bootstrap, and ready anatomy;
- browser scenarios for fixed, resized, sticky, and absent frame regions;
- Tabular composition with both an outer header and pinned tracks;
- complexity contracts for raw arrays, trusted patches, frame invalidation, and mounted measurement;
- consumer bundle, install, declarations, tree-shaking, and source-map evidence for changed subpaths; and
- a same-machine targeted performance comparison showing no geometry read on ordinary scroll.

## Acceptance criteria

The migration is complete only when all of the following hold.

- All four high-level components expose the same header, item, empty, and footer contract.
- The surface is the only Virtual coordinate origin and the only plan-size projection box.
- Frame regions never enter item state, placements, measurements, anchors, snapshots, or content size.
- A viewport may begin before the surface without invalid geometry.
- `scrollToID()` accounts for surface origin and declared viewport insets.
- Header changes preserve physical scroll before surface entry and item anchoring after entry.
- Footer changes leave Virtual generation unchanged.
- Empty and bootstrap content keep header and footer mounted.
- Grid and Masonry use effective surface width for lane geometry.
- Spatial frame movement performs no spatial-index repair.
- High-level item rendering adds no per-placement Sectile component instance.
- Pinned Tabular tracks and outer frame regions remain distinct.
- Disconnect releases every owned host resource.
- Public documentation describes only the implemented API when the migration transaction closes.

## Non-goals

This decision does not solve browser physical scroll-range limits for extremely large logical surfaces. Logical-to-physical scroll mapping remains a separate projection problem.

It also does not add a generic loading state, pagination policy, sticky-positioning engine, or application toolbar semantics. Header and footer provide composition points; collection-window state and application behavior retain their existing owners.
