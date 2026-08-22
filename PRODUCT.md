# Sectile product context

## Product

Sectile is a renderer-neutral interaction system. It defines semantic state machines in `@sectile/core`, then projects host behavior through DOM, terminal, and framework packages.

## Users

Library authors and application engineers who need predictable interaction behavior across renderers without inheriting a visual system.

## Positioning

- Explicit state, laws, failures, and costs instead of hidden widget behavior.
- Native host behavior where a platform already defines the interaction.
- Equivalent semantics across hosts, with host-specific projection kept at the boundary.
- Headless framework components that accept normal attributes, classes, slots, and child composition.

## Package status

- `@sectile/core`, `@sectile/dom`, and `@sectile/terminal`: published packages.
- `@sectile/vue`: workspace preview until its public API and documentation stabilize.
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
