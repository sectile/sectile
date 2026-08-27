---
title: Core transitions and composition
description: Events, immutable state, ordered commands, and controlled ownership.
---

# Core transitions and composition

A Core component is an immutable state machine:

```text
State × Event → Result<next State × ordered Commands>
```

The same state and event produce the same result. Host effects such as focus, scrolling, announcement, and activation are returned as commands instead of running inside Core.

## Update loop

1. Construct state from explicit input.
2. Send one semantic event.
3. Commit the returned state atomically.
4. Execute returned commands in order at the host boundary.
5. Publish the accepted revision.

Controlled ownership may reconcile a proposal with application state, but it must preserve internal transient progress required by the component contract. Revisions make stale parent updates observable.

## Composition

Components combine the same smaller models. A Calendar uses grid movement plus Temporal date arithmetic. A virtualized Listbox keeps the full Core sequence and selection state while Virtual decides which item parts are rendered.

Read [Transitions](/theory/transitions) for the laws and [Composition](/theory/composition) for the component mapping.
