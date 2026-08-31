# Sectile

Renderer-neutral interaction semantics for interfaces that must behave consistently across hosts.

Sectile separates interaction rules from presentation. `@sectile/core` defines deterministic state transitions and data structures. Host packages translate native input into those semantics and project the resulting effects without owning application data, markup, or styling.

## Packages

| Package | Responsibility |
| --- | --- |
| `@sectile/core` | Pure structures, interaction state, transitions, and validation |
| `@sectile/chart` | Immutable chart models, scales, packed projections, queries, and interaction |
| `@sectile/form` | Field composition, validation, errors, submission, and reset |
| `@sectile/temporal` | Civil dates, wall-clock time, calendars, and picker rules |
| `@sectile/tabular` | Tabular data access, columns, selection, grouping, and grid interaction |
| `@sectile/virtual` | Collection extents, viewport layout, measurement updates, and anchor correction |
| `@sectile/dom` | DOM input, focus, ARIA, and element bindings |
| `@sectile/terminal` | Terminal input, Unicode layout, and TTY integration |
| `@sectile/vue` | Headless Vue compound components backed by DOM projections |

Host coverage is explicit rather than universal. Core and Temporal have DOM, Terminal, and Vue projections. Chart, Form, Tabular, and Virtual have DOM and Vue projections; they do not expose Terminal adapters. Vue builds on the corresponding DOM projection, while renderer-neutral domain packages remain usable without a host adapter.

## Principles

- One semantic model across every supported host projection
- Explicit controlled and uncontrolled ownership
- Typed failures and failure-atomic transitions
- Exact text, decimal, range, and unit operations
- Package-local builds and tests with cross-host verification

See the [documentation](docs/index.md) and [accepted theory](docs/references/sectile-theory.md). The documentation contains the interactive examples for every supported host. The canonical repository check is `pnpm verify`.
