# Sectile product context

## Product

Sectile is a renderer-neutral interaction system. `@sectile/core`, `@sectile/chart`, `@sectile/form`, `@sectile/temporal`, `@sectile/tabular`, and `@sectile/virtual` own semantic domains. `@sectile/dom`, `@sectile/terminal`, and `@sectile/vue` project supported domain behavior into their platforms.

## Users

Library authors and application engineers who need predictable interaction behavior across renderers without inheriting a visual system.

## Positioning

- Explicit state, laws, failures, and costs instead of hidden widget behavior.
- Native host behavior where a platform already defines the interaction.
- Equivalent semantics across supported host projections, with platform behavior kept at the boundary.
- Headless framework components that accept normal attributes, classes, slots, and child composition.

## Package status

- Semantic domains: `@sectile/core`, `@sectile/chart`, `@sectile/form`, `@sectile/temporal`, `@sectile/tabular`, and `@sectile/virtual`.
- Host adapters: `@sectile/dom`, `@sectile/terminal`, and `@sectile/vue`.
- Core and Temporal support DOM, Terminal, and Vue projections. Chart, Form, Tabular, and Virtual support DOM and Vue projections and intentionally have no Terminal projection. Vue uses the corresponding DOM projection.
- Playgrounds: development witnesses, not end-user documentation.
- Documentation: end-user learning and API reference surface.

## Durable constraints

- Packages communicate only through public package exports.
- Each package owns its build, tests, and verification.
- Core contains no renderer, framework, or styling concerns.
- DOM behavior stays close to native HTML semantics for forms, focus, keyboard input, and attributes.
- Public examples must be complete, runnable, and sourced from the same files shown as code.
- Components remain unstyled by default. Stable parts and state attributes provide styling hooks.

## Documentation voice

English-first, concise, technical, and direct. Explain the user-facing contract before internal mechanics.
