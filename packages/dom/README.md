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
other non-linear layouts. Content and item style helpers remain opt-in.

## Floating surface positioning

Popover and tooltip placement use Floating UI. Offset, collision flip and shift, available-size data, arrow positioning, detached-anchor hiding, and open-only automatic updates are enabled by default. Boundaries, padding, strategy, update observers, and the middleware queue remain configurable. Floating UI middleware is re-exported from both component entry points for custom positioning.

## API shape

Direct `createX` factories return ready connections. Matching `tryCreateX` factories expose recoverable construction failure. Every facade provides `state`, `send`, `update`, `subscribe`, and `destroy` alongside component-specific binding methods. Lower-level controller and connection factories remain available for separate ownership.
