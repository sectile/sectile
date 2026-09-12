---
title: Virtual surface framing
description: Accepted coordinate, ownership, composition, and validation contract for non-virtual regions around a virtual item surface.
---

# Virtual surface framing

> Status: accepted and implemented.

Virtualization owns the geometry of a bounded item surface. A browser host may scroll through an element container or through the page document, and ordinary header, footer, toolbar, loading status, or other non-virtual regions may sit around the surface in that physical flow. Those regions do not become synthetic virtual items, but their position can still affect viewport queries, target scrolling, anchoring, and the browser scroll range.

This decision defines one coordinate contract for every Virtual layout and one host composition contract for DOM and Vue. The current public APIs implement this model; no application-owned window-scroll adapter is part of the contract.

## Decision

A virtualized host consists of one **physical scrollport**, one **virtual surface**, and optional **frame regions** around that surface. The physical scrollport is either an `HTMLElement` scroll container or a `Document` representing page/window scrolling. `Window` is not a second public target type.

Vue keeps one stable component anatomy independently of which physical target is selected:

```text
root                              data-part="root"
├── header?                       data-part="header"
├── surface                       data-part="surface"
│   ├── item...                   data-part="item"
│   └── empty?                    data-part="empty"
└── footer?                       data-part="footer"

physical scrollport:
  root mode      -> root HTMLElement
  document mode  -> owner Document
  external mode  -> explicit HTMLElement or Document
```

The surface is both the local coordinate origin and the box that projects `VirtualLayoutPlan.contentSize`. A second content wrapper would duplicate those responsibilities, add a constant DOM node, and create ambiguity about which element owns placement coordinates. Bootstrap and empty phases reuse the same surface without applying a ready-plan size.

Header and footer are ordinary flow regions around the surface. Sticky positioning remains a CSS choice. Persistent occlusion from sticky or overlay content is declared explicitly through viewport insets; the host does not infer it from computed styles.

## Terminology

| Term | Meaning |
| --- | --- |
| **scrollport** | The selected physical browser scroll host: an `HTMLElement` or a `Document`. |
| **surface** | The normal-flow element whose top-left establishes Virtual coordinate `(0, 0)`. |
| **frame region** | A non-virtual element that can move the surface origin or change the scroll range, such as a header or footer. |
| **viewport inset** | A persistent leading or trailing occlusion of the selected viewport, such as a sticky header. |
| **placement** | A stable item identity and rectangle in surface-local coordinates. |
| **anchor** | A visible virtual item whose screen coordinate may be preserved across a layout or frame change. |

“Header” and “footer” are physical block-flow names. They do not change position when a linear layout uses a horizontal axis or reverse item flow.

## Semantic ownership

The behavior is split by authority.

| Owner | Responsibility |
| --- | --- |
| `@sectile/core` | Stable identity, `Sequence`, and generic immutable patch foundations. |
| `@sectile/virtual` | Browser-type-free item projection, extent and layout state, surface-frame algebra, viewport normalization, placement, anchoring, and target-scroll coordinates. |
| `@sectile/dom` | Element/document host normalization, browser measurement and resources, frame invalidation, scroll reads and writes, and cleanup. |
| `@sectile/vue` | Reactive root/document/external target selection, slots, stable part anatomy, direct VNode projection, SSR, and hydration; physical scrolling remains delegated to DOM. |
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

`VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial` share one host contract.

### Slots

```ts
$slots: {
  header?: () => VNodeChild
  item: (props: StrategySpecificItemSlotProps<Value, ID>) => VNodeChild
  empty?: () => VNodeChild
  footer?: () => VNodeChild
}
```

The item renderer is a named slot rather than the default slot. This makes the item domain explicit and leaves header, empty, and footer as peers in the public anatomy. There is no compatibility default-slot alias.

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

The common high-level scroll target is:

```ts
export type VirtualizerScrollportTarget =
  | 'root'
  | 'document'
  | HTMLElement
  | Document
```

Omitting the high-level prop selects `'root'`. Explicit `null` leaves the physical host disconnected rather than falling back to root mode. The common input shape is:

```ts
export interface VirtualCollectionBaseProps<
  Value,
  ID extends StableID,
> {
  readonly items: readonly Value[]
  readonly getID: (value: Value, index: number) => ID
  readonly overscan?: number | Partial<VirtualInsets>
  readonly viewportInsets?: number | Partial<VirtualInsets>
  readonly scrollport?: VirtualizerScrollportTarget | null
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

Size and lane ownership are represented by discriminated policies:

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
  readonly scrollport: ShallowRef<VirtualScrollport | null | undefined>
  readonly surface: ShallowRef<HTMLElement | null | undefined>
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

The low-level composition surface is:

```text
VirtualizerRoot
VirtualizerHeader
VirtualizerSurface
VirtualizerItem
VirtualizerFooter
useVirtualizer
```

`VirtualizerRoot` resolves `'root'`, `'document'`, an explicit `HTMLElement` or `Document`, or `null`, then delegates the physical behavior to DOM. `VirtualizerSurface` owns the coordinate surface and plan size. Header and footer register frame invalidation. Low-level parts support normal attributes, classes, `as`, and `asChild`; the high-level components keep one stable wrapper per optional frame region.

High-level repeated item subtrees render their item element directly and register it through the shared host kernel. They do not allocate one `VirtualizerItem` Vue component instance per placement. `VirtualizerItem` remains available for custom low-level composition.

## DOM connection contract

The DOM constructor names the selected physical scrollport and the Virtual surface.

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

`scrollport` is `HTMLElement | Document`. A document target uses its own `defaultView` and scrolling environment; no ambient `Window` is accepted as a parallel public target.

A single connection owns bounded resources:

- one passive scroll listener on the selected physical target;
- in document mode, one viewport-resize listener on that document's view;
- one geometry `ResizeObserver` for the surface, bounded frame regions, and an element scrollport when present;
- one item `ResizeObserver` for mounted measured items;
- at most one scheduled frame;
- item and element registration maps;
- pending changed entries;
- the cached surface frame; and
- the current placement index.

Ordinary scrolling does not call `getBoundingClientRect()`. It reads the current physical viewport and combines it with the cached surface frame. Geometry reads occur only after owned frame invalidation or explicit `refresh()`. Unrelated page-flow movement that changes the surface position without such a signal is therefore an explicit `refresh()` boundary rather than a reason for document-wide mutation observation or continuous polling.

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

## Implementation record

The accepted model is implemented across the portable Virtual layer, the DOM host, and the Vue adapters:

1. `@sectile/virtual` owns surface-frame algebra, finite negative viewport origins, portable collection projection, layout repair, anchoring, and target-scroll coordinates.
2. `@sectile/dom/virtual` accepts `VirtualScrollport = HTMLElement | Document`, normalizes the physical host once, caches the surface frame, and composes frame and layout corrections through one physical owner.
3. Low-level Vue exposes root, header, surface, item, and footer parts and resolves `'root' | 'document' | HTMLElement | Document | null` without adding browser coordinate policy.
4. `VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial` share the same scrollport target contract and stable frame anatomy.
5. List bootstrap uses the projected viewport rather than element-only client geometry, and its default nested `overflow: auto` is limited to root mode.
6. Grid and Masonry derive responsive lanes from the projected surface-local cross extent; Spatial rectangles stay surface-local.
7. Public signatures, browser witnesses, bundle/complexity gates, and English/Korean manuals describe the same implemented contract.

## Validation contract

The maintained evidence covers:

- pure scrollport-to-surface projection and inverse target projection laws;
- finite negative viewport origins across production layouts;
- element and document DOM lifecycle churn with zero-resource cleanup and stale-callback rejection;
- ordinary document scroll with a cached surface frame and no rectangle read;
- bounded per-connection document scroll/resize resources and frame-coalesced event bursts;
- measurement and frame correction through one transactional physical scroll owner;
- Vue SSR/hydration with document target selection and no global-document requirement;
- root/document/external/null target changes with stable anatomy and explicit no-fallback `null` behavior;
- high-level List bootstrap, Grid/Masonry geometry, Spatial surface-local rectangles, and page-flow browser behavior;
- Tabular composition with outer frame regions and pinned tracks kept distinct;
- complexity, consumer bundle, declarations, tree-shaking, and package verification for affected public surfaces.

The implemented contract has these invariants:

- All four high-level components expose the same header, item, empty, footer, and scrollport-selection contract.
- The surface is the only Virtual coordinate origin and the only plan-size projection box.
- Frame regions never enter item state, placements, measurements, anchors, snapshots, or content size.
- A viewport may begin before the surface without invalid geometry.
- `scrollToID()` accounts for surface origin and declared viewport insets for element and document hosts.
- Header or unrelated frame changes preserve physical scroll before surface entry and item anchoring after entry.
- Footer changes leave Virtual generation unchanged.
- Empty and bootstrap content keep header and footer mounted.
- Grid and Masonry use effective surface width for lane geometry; vertical page movement alone does not repack lanes.
- Spatial host movement performs no spatial-index repair.
- High-level item rendering adds no per-placement Sectile component instance.
- Disconnect releases every owned host resource.
- Public documentation describes the implemented API rather than application-owned page-scroll adapters.

## Non-goals

This decision does not solve browser physical scroll-range limits for extremely large logical surfaces. Logical-to-physical scroll mapping remains a separate projection problem.

Document mode uses the layout viewport. It does not define `VisualViewport`, pinch-zoom, or virtual-keyboard semantics, and `Window` is not a parallel public scrollport type. A connection selects one physical scrollport rather than discovering a nested scroll chain. Unsignaled external page-flow movement remains an explicit `refresh()` case.

It also does not add a generic loading state, pagination policy, sticky-positioning engine, or application toolbar semantics. Header and footer provide composition points; collection-window state and application behavior retain their existing owners.
