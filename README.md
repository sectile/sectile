# Sectile

Renderer-neutral interaction semantics for interfaces that must behave consistently across hosts.

Sectile separates interaction rules from presentation. `@sectile/core` defines deterministic state transitions and data structures. Host packages translate native input into those semantics and project the resulting effects without owning application data, markup, or styling.

## Packages

| Package | Responsibility |
| --- | --- |
| `@sectile/core` | Pure structures, interaction state, transitions, and validation |
| `@sectile/dom` | DOM input, focus, ARIA, and element bindings |
| `@sectile/terminal` | Terminal input, Unicode layout, and TTY integration |
| `@sectile/vue` | Headless Vue compound components backed by DOM projections |

## Principles

- One semantic model across every host
- Explicit controlled and uncontrolled ownership
- Typed failures and failure-atomic transitions
- Exact text, decimal, range, and unit operations
- Package-local builds and tests with cross-host verification

See the [documentation](docs/index.md) and [accepted theory](docs/references/sectile-theory.md). The documentation contains the interactive examples for every supported host. The canonical repository check is `pnpm verify`.
