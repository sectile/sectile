---
title: Core foundations
description: Identity, results, revisions, and explicit resource limits in Core.
---

# Core foundations

Core makes identity, failure, ordering, and resource use observable. These contracts are shared by every component and support structure.

## Stable identity

`StableID` is a string contract. Map numeric or object identities to stable, collision-free strings before constructing a domain. Keep any reverse lookup in application state.

```ts
import { createSequence } from '@sectile/core/sequence'

const products = createSequence(['product:42', 'product:91'])
```

Strings survive serialization, DOM attributes, terminal effects, and framework keys without package-specific conversion.

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
