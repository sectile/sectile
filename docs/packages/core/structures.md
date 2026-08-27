---
title: Core structures and state
description: Compose sequence, range, grid, tree, cursor, selection, expansion, and text state.
---

# Core structures and state

Core separates **what exists** from **what the user is doing with it**.

| Structure | Answers |
| --- | --- |
| sequence | Which stable identities exist, and in what order? |
| range | Which quantized values are valid between bounds? |
| grid | Which identities occupy rows and columns? |
| tree | Which identities are parents, children, and visible descendants? |

Cursor, selection, expansion, and text editing are independent state. A Listbox combines a sequence with cursor and selection. A Tree View adds a tree and expansion. The same selection rules can therefore be reused without copying a complete component machine.

```ts
import { createSequence } from '@sectile/core/sequence'
import { createRange } from '@sectile/core/range'

const tabs = createSequence(['overview', 'activity', 'settings'])
const volume = createRange({ origin: '0', step: '5', count: 20 })
```

## Ownership boundary

Core structures own logical identity and validity. They do not own loaded records, pixel coordinates, labels, or DOM nodes. Use `@sectile/core/collection-window` for asynchronous loaded ranges and `@sectile/virtual` for rendered geometry.

The complete formal vocabulary remains available in [Core theory](/theory/structures).
