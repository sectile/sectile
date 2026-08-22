# @sectile/dom

DOM bindings for Sectile interaction semantics.

## Responsibility

- Translate browser keyboard, pointer, focus, and composition input
- Project ARIA state, focus requests, visibility, and element attributes
- Own controlled or uncontrolled runtime synchronization
- Preserve native text editing and IME behavior

The package does not provide markup, components, styles, themes, or application data. Consumers choose the rendered structure and bind it to a Sectile connection.

## API shape

Direct `createX` factories return ready connections. Matching `tryCreateX` factories expose recoverable construction failure. Every facade provides `state`, `send`, `update`, `subscribe`, and `destroy` alongside component-specific binding methods. Lower-level controller and connection factories remain available for separate ownership.

See [consumer usage](../../docs/getting-started/consumer-usage.md), [architecture](../../docs/architecture/README.md), and the [DOM playground](../../playgrounds/dom/README.md).
