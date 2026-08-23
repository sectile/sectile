# Scope and guarantees

Sectile covers deterministic interaction over finite, resource-bounded domains with stable identity, immutable snapshots, explicit semantic input, and ordered host commands.

## Guaranteed

- Stable identity and deterministic observations.
- Typed construction and transition failures.
- Controlled and uncontrolled state ownership.
- Failure-atomic transitions and stale revision rejection.
- Exact quantized ranges and bounded navigation.
- Ordered hierarchy, logical coordinates, selection, expansion, and plain-text editing.
- Host-independent semantics with DOM, terminal, and framework projection.

## Explicit host responsibilities

- Pixel geometry, collision detection, layout, and animation.
- Native focus execution, pointer capture, scrolling, and accessibility projection.
- Terminal cursor placement, input decoding, and display-width rendering.
- Framework lifecycle, component composition, and styling.
- Application persistence, network requests, and product-specific validation.

## Separate models

The current theory does not reinterpret the following domains as sequence, range, grid, or tree:

- General graph or DAG traversal.
- Unbounded streams and backpressure.
- Rich documents, rich-text marks, and collaborative editing.
- Spatial geometry and visual-nearest navigation.
- Overlapping or merged grid regions.

These domains require their own observations, laws, failures, and cost contracts.
