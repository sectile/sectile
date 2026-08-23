# Transitions

A Sectile transition receives immutable semantic state and a semantic event. It returns either a complete next state with ordered commands or a typed failure.

```text
applyEvent : State × Event
  → Result<State × OrderedCommand*>
```

## Transition guarantees

- **Deterministic:** equal state and input produce equal output.
- **Pure:** applying an event performs no host side effect.
- **Atomic:** a successful transition exposes one complete next state.
- **Failure-atomic:** a rejected transition leaves state and commands unchanged.
- **Ordered:** commands preserve a defined execution order.
- **Bounded:** event work is constrained by the model's resource ceilings.

## Commands

Commands describe required host work without executing it inside core state.

```text
focus · scroll · announce · activate · request · clipboard
```

An adapter interprets those commands for its environment. This keeps a DOM focus request and a terminal cursor request observably equivalent at the semantic layer while allowing different host operations.

## Revision

Controlled and asynchronous hosts can wrap state in a revision snapshot.

```text
RevisionSnapshot<State> = {
  revision: Natural
  state: State
}
```

An accepted event increments the revision exactly once. A stale or invalid event preserves the current revision and state and emits no commands. Accepted boundary no-ops still advance the revision, distinguishing a handled event from unhandled input.

## Atomic composition

Independent child transitions compute their candidate results first. The composite commits only when every child succeeds, then concatenates commands in a fixed order. No partial child state becomes observable.
