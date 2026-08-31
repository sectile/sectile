---
title: Chart interaction and state
description: Keep selection, cursor, and immutable axis-domain views explicit while preserving page-safe browser input.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Interaction and state

Selection answers “which data matters?” while an axis view answers “which part of this domain is visible?” Both are renderer-neutral immutable values. DOM translates browser input into the same Core events.

<ChartPackageExample kind="scatter" />

## Enable capabilities separately from browser gestures

An axis becomes navigable only when it has a view capability. The browser binding is a second, explicit choice.

```ts
const controller = createChartController({
  definition,
  viewCapabilities: [{
    axisID: 'date',
    minimumSpan: 86_400_000,
    update: 'follow-end',
  }],
})

const chart = createDOMChart({
  root,
  canvas,
  controller,
  navigation: {
    wheel: 'native',
    keyboard: true,
  },
})
```

`wheel: 'native'` is the default: scrolling over a chart continues to scroll the page. Opt into `pan` or `zoom` only for charts where direct wheel navigation is expected. Drag or pinch navigation also requires a built-in or external single-pointer control alternative, so the same operation remains available without a precision gesture.

| Input binding | Recommended use |
| --- | --- |
| Visible pan/zoom/reset controls | Default for discoverability and accessibility |
| Keyboard | Focused chart navigation |
| Drag pan | Dense Cartesian exploration with visible alternatives |
| Modified wheel zoom | Desktop analytical tools; choose the modifier explicitly |
| Pinch | Touch exploration with visible alternatives |
| Radial navigation | Not applicable to pie and donut |

## Dispatch domain events directly

```ts
controller.dispatch({
  type: 'zoom-axis-view',
  axisID: 'date',
  factor: 1.5,
  anchor: 0.75,
  phase: 'settled',
})
```

Continuous views store numeric minimum and maximum values. Categorical views store a start/end window over stable category order. Pan and zoom therefore remain meaningful after resize and across different renderers; they are not mutable pixel transforms.

## Control state from the application

Selection, cursor, active datum, and the complete `ChartViewState` can be controlled. A controlled event emits a command; the owner applies the requested immutable value. In Vue, use `v-model`, `v-model:cursor`, `v-model:active-datum`, and `v-model:view`.

A single controlled `view` can synchronize multiple chart roots with matching axis IDs. Use `update: 'preserve'` to retain the visible domain after data replacement, `reset` to return to the new initial domain, or `follow-end` for a live time window that remains attached to the latest values.

When data disappears, Chart reconciles missing active, cursor, and point-selection IDs. Dispose application-owned controllers when their lifetime ends.
