# Adapter authoring

`@sectile/core/adapter-runtime` is the stable boundary for adding a host without importing Core internals.

```text
host input
  → decode
semantic event
  → reduce
semantic command
  → project
host effect
  → execute in the host
```

Core owns revision ordering, semantic reduction, controlled-state reconciliation, and command projection. The adapter owns host input decoding and effect execution. A decoder returns `null` for input outside its semantic domain; this is an ignored host input, not a failed semantic transition.

## Minimal adapter

```ts
import { createHostAdapter } from '@sectile/core/adapter-runtime'

type KeyInput = { readonly key: string }
type Event = { readonly type: 'next' }
type Command = { readonly type: 'announce'; readonly index: number }
type Effect = { readonly type: 'speak'; readonly text: string }

const result = createHostAdapter({
  initial: { ok: true, value: { index: 0 } },
  decode: (input: KeyInput): Event | null =>
    input.key === 'ArrowDown' ? { type: 'next' } : null,
  reducer: (state, event): {
    readonly ok: true
    readonly value: {
      readonly state: { readonly index: number }
      readonly commands: readonly Command[]
    }
  } => {
    const index = event.type === 'next' ? state.index + 1 : state.index
    return {
      ok: true,
      value: {
        state: { index },
        commands: [{ type: 'announce', index }],
      },
    }
  },
  project: (command: Command): Effect => ({
    type: 'speak',
    text: `Item ${command.index + 1}`,
  }),
})

if (result.ok) {
  const transition = result.value.handleInput({ key: 'ArrowDown' })
  if (transition?.ok) {
    for (const effect of transition.commands) executeHostEffect(effect)
  }
}
```

The `commands` field of the returned revision result contains projected host effects. Core never executes them.

## Contract

- `decode` must be deterministic for the same normalized host input.
- `reducer`, `reconcile`, and `project` must remain pure.
- `notify` reports a proposed semantic state; it does not transfer controlled-state ownership.
- `replace` synchronizes externally owned state and advances the revision.
- Pass the observed revision to `handleInput` when input may race with external state. Stale input is rejected without changing the snapshot.
- Execute effects only after an `ok` result. Preserve their array order.
- Release host listeners and resources in the host package. Core owns no platform lifecycle.

Use `createSemanticController` directly only when host decoding is already handled by another boundary.
