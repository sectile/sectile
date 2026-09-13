# @sectile/dom

DOM bindings for Sectile interaction semantics.

## Responsibility

- Translate browser keyboard, pointer, focus, and composition input
- Project ARIA state, focus requests, visibility, and element attributes
- Own controlled or uncontrolled runtime synchronization
- Preserve native text editing and IME behavior
- Delegate form, focus, and keyboard behavior to native elements where HTML already
  defines it, while projecting the state those elements need

The package does not provide markup, components, styles, themes, or application data. Consumers choose the rendered structure and bind it to a Sectile connection.

## Virtualization

`@sectile/dom/virtual` connects the renderer-neutral `@sectile/virtual` strategies
to a scroll element. It coalesces scroll and resize work per animation frame,
batches item measurements, applies anchor correction before publishing the next
plan, and exposes manual measurement and mutation operations for track grids and
other non-linear layouts. Content and item style helpers remain opt-in. Install
`@sectile/virtual` separately when using this subpath; the rest of `@sectile/dom`
does not require it.

## Anchored surface positioning

Popover and tooltip placement use the shared Sectile positioning contract exported from `@sectile/dom/position`. `PositionOptions` exposes `side`, `align`, `sideOffset`, `collisionBoundary`, `collisionPadding`, `avoidCollisions`, `arrowPadding`, `hideWhenDetached`, `strategy`, and `tracking`. `strategy` selects `absolute` or `fixed` placement. Tracking is event-driven by default; use `tracking: 'animation-frame'` when the anchor or content can move without a relevant browser event. Set the component-level `position` option to `false` when application layout owns placement instead.

## API shape

Direct `createX` factories return ready connections. Matching `tryCreateX` factories expose recoverable construction failure. Every facade provides `state`, `send`, `update`, `subscribe`, and `destroy` alongside component-specific binding methods. Lower-level controller and connection factories remain available for separate ownership.
