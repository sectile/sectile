---
title: Core foundations
description: Identity, results, revisions, and explicit resource limits in Core.
---

# Core foundations

Core makes identity, failure, ordering, and resource use observable. These contracts are shared by every component and support structure.

## Stable identity

`StableID` accepts a non-empty, well-formed UTF-16 string or a safe integer other than negative zero. Identity uses exact equality, so `1` and `'1'` are distinct. Keep an ID unchanged while it represents the same item; map object identities to a stable string or safe integer before constructing a domain.

```ts
import { createSequence } from '@sectile/core/sequence'

const products = createSequence(['product:42', 91])
```

| Surface | ID contract |
| --- | --- |
| Core, Chart, DOM, and Terminal | Preserve string and numeric `StableID` values without changing their type. |
| Vue Chart and Virtual | Accept string and numeric `StableID` values. |
| Vue choice components | Their current public `value` props are strings. |
| DOM attributes, form values, URLs, and other string-only boundaries | Encode IDs reversibly. Do not use `String(id)` when a domain can contain both `1` and `'1'`. |

String IDs are limited by `maxIDCodeUnits`. Numeric IDs must satisfy `Number.isSafeInteger`, and `-0` is rejected. JSON preserves both supported primitive types, while DOM attributes and form values do not; keep any reverse lookup needed by a string-only boundary in application state.

## Results and failures

Pure constructors and transitions return `Result` when failure is part of the public contract. Narrow the result at a recoverable boundary. Use `unwrap` only when turning a typed failure into an exception is intentional.

```ts
import { tryCreateSequence } from '@sectile/core/sequence'

const result = tryCreateSequence(['alpha', 'beta'])
if (!result.ok) report(result.error)
else use(result.value)
```

`CoreErrorCode` is Core's closed vocabulary. Temporal, Virtual, and applications own their narrower error codes without casting them into it.

## Revisions and limits

`RevisionSnapshot.revision` counts accepted events, including an accepted boundary no-op. It preserves event order and rejects stale controlled updates; it is not a render counter.

Construction options expose ceilings such as `maxItems` and `maxIDCodeUnits`. Treat them as part of the domain contract, not implementation tuning.
