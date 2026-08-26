# @sectile/core

Pure, renderer-neutral interaction semantics with explicit laws, failures, and resource bounds.

## Scope

- Ordered structures: sequence, range, grid, and tree
- Reusable state: cursor, selection, expansion, revision, interaction gates, and finite collection windows
- Coordination primitives for generation-bound async work, nested layer stacks, and identity-based reordering
- Dynamic-size virtual layout with persistent extent indexing and anchor-preserving measurement updates
- Composite behavior for selection, navigation, disclosure, editing, forms, and overlays
- UTF-16-safe text editing, exact decimal expressions, and dimension-checked units

## Contract

Core modules contain no DOM, terminal, rendering, or styling behavior. Constructors validate their inputs and return typed `Result` values. Accepted transitions are deterministic and failure-atomic; policies make eligibility, boundaries, and ownership explicit.

Runtime APIs are exposed through focused package subpaths. The package root contains shared types and has no interaction authority.
