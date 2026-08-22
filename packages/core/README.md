# @sectile/core

Pure, renderer-neutral interaction semantics with explicit laws, failures, and resource bounds.

## Scope

- Ordered structures: sequence, range, grid, and tree
- Reusable state: cursor, selection, expansion, revision, and interaction gates
- Composite behavior for selection, navigation, disclosure, editing, and overlays
- UTF-16-safe text editing, exact decimal expressions, and dimension-checked units

## Contract

Core modules contain no DOM, terminal, rendering, or styling behavior. Constructors validate their inputs and return typed `Result` values. Accepted transitions are deterministic and failure-atomic; policies make eligibility, boundaries, and ownership explicit.

Runtime APIs are exposed through focused package subpaths. The package root contains shared types and has no interaction authority.

Read the [primitive contracts](../../docs/primitives/README.md), [architecture](../../docs/architecture/README.md), and [verification model](../../docs/references/verification.md).
