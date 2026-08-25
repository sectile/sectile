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

## Failure handling

Core constructors and transitions return `Result`. Narrow the result when failure is recoverable, or use `unwrap` only when converting a typed failure into an exception is the intended application boundary.

```ts
const result = sequence.createSequence(['alpha', 'beta'])

if (!result.ok) {
  report(result.error)
} else {
  use(result.value)
}
```

The direct `create*` and recoverable `tryCreate*` pair belongs to host facades such as `@sectile/dom` and `@sectile/terminal`. It does not change the pure Core `Result` contract.
