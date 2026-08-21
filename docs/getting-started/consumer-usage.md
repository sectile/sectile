# Consumer usage

Construction is explicit and failure-aware.

```ts
import { createSequence } from '@sectile/primitives/sequence';
import { unwrap } from '@sectile/primitives/result';

const sequence = unwrap(createSequence(['alpha', 'beta', 'gamma']));
const next = sequence.move('alpha', 1, 'stop');
```

`unwrap` returns a successful value and throws `SectileResultError` for a failure. The thrown error preserves `class`, `code`, `message`, `details`, and the original `SectileError` as `cause`. Consumers that need recoverable failures can continue narrowing `Result` directly.

Exact numeric domains use decimal strings and integer ticks.

```ts
import { createRange } from '@sectile/primitives/range';
import { unwrap } from '@sectile/primitives/result';

const range = unwrap(createRange({ origin: '-0.3', step: '0.1', count: 6 }));
range.valueAt(3); // "0"
```

Logical grids preserve empty coordinates. Trees preserve input root and sibling order. Query absence is `null`; malformed construction is a typed error; a scan ceiling reached before the answer is known is a resource rejection.

Host packages expose connections for wiring semantic controllers without reimplementing host details. `@sectile/dom/tree-grid` owns DOM keyboard events, IME-safe Enter handling, ARIA attributes, edit rollback, and focus. `@sectile/terminal/node` turns a Node TTY into normalized keyboard input, including common Alt-key variants; `@sectile/terminal/tree-grid` owns terminal edit buffering, and `@sectile/terminal/layout` fits text by displayed Unicode width.

The application still owns its data and presentation. It supplies cell getters and setters to a connection, renders its chosen markup or terminal rows, and reacts to the connection's transition callback when it needs logging or external synchronization.

The host-level `createTreeGrid` facade accepts rows shaped as `{ id, parentID, cells }` and performs primitive model, controller, and connection construction behind one `Result`. Use the separate primitive and adapter factories only when the tree, grid, model, or controller has an independent owner.
