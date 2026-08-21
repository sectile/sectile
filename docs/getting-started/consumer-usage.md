# Consumer usage

Construction is explicit and failure-aware.

```ts
import { createSequence } from '@sectile/primitives/sequence';

const result = createSequence(['alpha', 'beta', 'gamma']);
if (!result.ok) throw new Error(result.error.message);

const next = result.value.move('alpha', 1, 'stop');
```

Exact numeric domains use decimal strings and integer ticks.

```ts
import { createRange } from '@sectile/primitives/range';

const result = createRange({ origin: '-0.3', step: '0.1', count: 6 });
if (result.ok) result.value.valueAt(3); // "0"
```

Logical grids preserve empty coordinates. Trees preserve input root and sibling order. Query absence is `null`; malformed construction is a typed error; a scan ceiling reached before the answer is known is a resource rejection.
