# Core

`@sectile/core` contains renderer-neutral component semantics and reusable foundations for sequence, range, grid, tree, selection, expansion, cursor, and editing behavior.

```sh
pnpm add @sectile/core
```

Import component subpaths directly:

```ts
import * as listbox from '@sectile/core/listbox'
```

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
