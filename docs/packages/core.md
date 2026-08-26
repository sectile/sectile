# Core

`@sectile/core` contains renderer-neutral component semantics and reusable foundations for sequence, range, grid, tree, selection, expansion, cursor, editing, bounded collection windows, layer ownership, and identity-based reordering.

```sh
pnpm add @sectile/core
```

Import component subpaths directly:

```ts
import * as listbox from '@sectile/core/listbox'
```

Coordination theories use focused support subpaths:

```ts
import * as window from '@sectile/core/collection-window'
import * as layers from '@sectile/core/layer-stack'
import * as reorder from '@sectile/core/reorder'
```

Collection replacements and Form validation/submission results are generation-bound, so a stale asynchronous result cannot mutate newer state. Layer dismissal is topmost-only, and tree reorder rejects cycles and invalid sibling destinations.

Core has no DOM, terminal, Vue, or styling dependency.

## Identity and revisions

Public component identities use `StableID`, which is a string contract. String IDs pass directly through serialization, DOM attributes, terminal effects, and framework keys. Applications whose source identity is numeric or object-based must map it to a stable, collision-free string before constructing a Sectile domain; keep the reverse lookup in application state.

`RevisionSnapshot.revision` is an accepted-event sequence, not a count of visible state changes. Every accepted event advances it exactly once, including an accepted boundary no-op whose state remains equal. Use revisions to reject stale controlled updates and preserve event order; do not use them as a render or dirty-state counter.

## Failure handling

Core constructors and transitions return `Result`. Narrow the result when failure is recoverable, or use `unwrap` only when converting a typed failure into an exception is the intended application boundary.

`SectileErrorCode` is a closed union. Match known codes exhaustively and keep application-specific failures in an application-owned error type instead of casting new strings into the Sectile namespace.

```ts
const result = sequence.createSequence(['alpha', 'beta'])

if (!result.ok) {
  report(result.error)
} else {
  use(result.value)
}
```

The direct `create*` and recoverable `tryCreate*` pair belongs to host facades such as `@sectile/dom` and `@sectile/terminal`. It does not change the pure Core `Result` contract.
