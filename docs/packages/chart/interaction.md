---
title: Chart interaction and state
description: Add selection, keyboard controls, panning, and zooming without trapping normal page input.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Interaction and state

A chart can track selected records, the record under the pointer, and the visible range of each axis. You can let Sectile manage these values or bind them to application state.

<ChartPackageExample kind="scatter" />

## Enable a visible range before adding controls

To pan or zoom an axis, first add a view capability for that axis. It defines how far the user may zoom and what should happen when data changes. Browser and keyboard controls are then enabled separately.

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

`wheel: 'native'` is the default, so scrolling over the chart still scrolls the page. Choose wheel panning or zooming only when users will expect the chart to capture that input. Drag and pinch also require visible buttons or another single-pointer control that performs the same action.

| Input method | Recommended use |
| --- | --- |
| Visible pan, zoom, and reset buttons | Good default for discovery and accessibility |
| Keyboard | Focused chart navigation |
| Drag pan | Dense Cartesian exploration with visible alternatives |
| Modified wheel zoom | Desktop analysis tools; choose the modifier explicitly |
| Pinch | Touch exploration with visible alternatives |
| Radial navigation | Not applicable to pie and donut |

## Trigger the same action from application code

```ts
controller.dispatch({
  type: 'zoom-axis-view',
  axisID: 'date',
  factor: 1.5,
  anchor: 0.75,
  phase: 'settled',
})
```

`factor: 1.5` makes the current range 1.5 times smaller, while `anchor: 0.75` keeps the point three quarters across the range in place. Numeric and temporal axes store visible minimum and maximum values. Categorical axes store the first and last visible category. The visible range therefore remains valid after resize.

## Control state from the application

Selection, cursor, active record, and all visible axis ranges can be controlled by the application. When a controlled value would change, Sectile emits a command and waits for the owner to pass the new value back. In Vue, use `v-model`, `v-model:cursor`, `v-model:active-datum`, and `v-model:view`.

A shared `view` value keeps several charts with matching axis IDs on the same range. When data changes, `update: 'preserve'` keeps the current range, `reset` returns to the new full range, and `follow-end` keeps a live time window attached to the newest values.

A domain change is reconciled before controlled state is handed back to the owner. If a record referenced by controlled selection, cursor, or active state disappears, or a controlled `view` must move to the new axis domain under its update policy, the controller commits the domain-valid candidate and emits the matching change request. Synchronize that requested value instead of continuing to pass state from the old domain. Controlled view settlement is published only after the owner accepts a synchronized view, so DOM range announcements describe the committed range rather than a proposal.

If a selected or active record disappears after an update, Sectile removes its ID from the interaction state. Call `controller.dispose()` when an application-created controller is no longer used.
