# Consumer usage

Core domain construction is explicit and failure-aware.

```ts
import { createSequence } from '@sectile/core/sequence';

const sequence = createSequence(['alpha', 'beta', 'gamma']);
const next = sequence.move('alpha', 1, 'stop');
```

`create*` factories return the constructed value and throw `SectileResultError` for invalid developer configuration. Consumers that need recoverable construction failures can use the matching `tryCreate*` factory and narrow its `Result`.

Exact numeric domains use decimal strings and integer ticks.

```ts
import { createRange } from '@sectile/core/range';

const range = createRange({ origin: '-0.3', step: '0.1', count: 6 });
range.valueAt(3); // "0"
```

Logical grids preserve empty coordinates. Trees preserve input root and sibling order. Query absence is `null`; malformed construction is a typed error; a scan ceiling reached before the answer is known is a resource rejection.

Host packages expose direct factories for wiring semantic controllers without reimplementing host details. Ordinary `createX(options)` calls return a ready connection and throw `SectileResultError` for invalid developer configuration. Matching `tryCreateX(options)` factories return `Result` when construction failure is expected data.

```ts
import { createListbox } from '@sectile/dom/listbox';

const listbox = createListbox({
  root,
  items: ['alpha', 'beta'],
  defaultHighlightedValue: 'alpha',
});

const unsubscribe = listbox.subscribe(({ state }) => render(state));
listbox.send('next');
console.log(listbox.state.cursor.current);
unsubscribe();
listbox.destroy();
```

All direct DOM and terminal factories expose `state`, `send`, `update`, `subscribe`, and `destroy` aliases while retaining their component-specific connection methods. This keeps ordinary ownership uniform without hiding host-specific binding methods.

DOM connections own keyboard and pointer translation, delegated item targeting, ARIA attributes, IME-safe Enter handling, edit rollback, and focus. `@sectile/terminal/node` turns a Node TTY into normalized keyboard input, including common Alt-key variants; `@sectile/terminal/tree-grid` owns terminal edit buffering, and `@sectile/terminal/layout` fits text by displayed Unicode width.

The application still owns its data and presentation. It supplies cell getters and setters to a connection, renders its chosen markup or terminal rows, and reacts to the connection's transition callback when it needs logging or external synchronization.

The host-level `createTreeGrid` facade accepts rows shaped as `{ id, parentID, cells }` and performs core model, controller, and connection construction in one direct factory. Use `tryCreateTreeGrid` for a recoverable construction failure. Use the separate core and adapter factories only when the tree, grid, model, or controller has an independent owner.
