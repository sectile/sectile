# @sectile/primitives

Renderer-neutral canonical interaction structures with explicit identity, failure, complexity, and resource contracts.

```ts
import { createSequence } from '@sectile/primitives/sequence';
import { createRange } from '@sectile/primitives/range';
import { createGrid } from '@sectile/primitives/grid';
import { createTree } from '@sectile/primitives/tree';
import { createListboxState } from '@sectile/primitives/listbox';
import { createRevisionEnvelope } from '@sectile/primitives/revision';
```

The root export contains shared types and has no runtime authority. Construction returns a typed `Result`; query absence returns `null`; bounded movement reports resource rejection rather than silently choosing a different result.

See the [primitive documentation](../../docs/primitives/README.md).
