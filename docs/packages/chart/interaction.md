---
title: Chart interaction and controller
description: Compose selection, cursor, active datum, pan, and zoom with explicit controlled ownership.
---

# Interaction and controller

Chart state contains an active datum, keyboard cursor, point or interval selection, and view transform. Events are portable data: pointer candidates, focus movement, selection changes, pan, zoom, and reset. Transitions return immutable state plus commands for a host to execute.

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({
  model: input,
  initialValues: {
    selection: { type: 'points', ids: [] },
  },
})

const update = controller.dispatch({ type: 'move-focus', direction: 'first' })
if (update.ok) console.log(update.value.snapshot.state.cursor)
```

Pass any subset of `activeDatum`, `cursor`, `selection`, and `viewTransform` through `controlled`. Controlled shape is fixed for the controller lifetime. An event then emits a `*-change-requested` command without committing that value; the owner applies it with `syncControlledValues()`.

Model replacement and patches reconcile removed IDs from active, cursor, and point selection state. Controller methods accept expected revisions, reject stale calls failure-atomically, and cache the latest projection. Call `dispose()` to release command listeners and retained projection data.

Use `tryCreate*` and other `try*` functions when invalid user or transport input is expected. Throwing functions are concise wrappers for already-trusted application data.

