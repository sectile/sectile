---
title: Chart interaction and state
description: Control hover, selection, keyboard focus, pan, and zoom with one explicit chart state.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Interaction and state

Chart turns pointer, keyboard, pan, and zoom input into one renderer-neutral state. The DOM and Vue integrations wire the common browser behavior. Application code can read the same state, dispatch events directly, or control selected values from outside.

<ChartPackageExample kind="scatter" />

## Built-in browser behavior

| Input | Result |
| --- | --- |
| Move the pointer over a mark | Updates the active datum |
| Select a mark | Selects it and moves the keyboard cursor |
| Arrow keys | Moves the cursor to the previous or next datum |
| Home / End | Moves to the first or last datum |
| Wheel | Pans the view |
| Ctrl/⌘ + wheel | Zooms around the pointer |
| Escape | Resets pan and zoom |

The chart root is keyboard focusable and exposes a bounded accessible list of data items. Supply `getAccessibleDatumLabel` in the DOM options so assistive technology receives a useful label instead of only an ID.

## Dispatch an event

```ts
const update = controller.dispatch({
  type: 'set-selection',
  selection: { type: 'points', ids: ['search'] },
})

if (update.ok) {
  console.log(update.value.snapshot.state.selection)
}
```

State includes the active datum, keyboard cursor, point or interval selection, and view transform. Events can update one part without hiding the rest of the chart state.

## Control state from the application

Pass `activeDatum`, `cursor`, `selection`, or `viewTransform` as controlled values when another store owns them. Chart then requests a change instead of committing that part itself. The owner applies the new value with `syncControlledValues()` or, in Vue, by updating the matching `v-model`.

Use defaults when Chart should own the value:

```ts
const controller = createChartController({
  model,
  initialValues: {
    selection: { type: 'points', ids: [] },
  },
})
```

When data is replaced, Chart removes missing IDs from active, cursor, and point selection state. Call `dispose()` when an application-owned controller is no longer used.
