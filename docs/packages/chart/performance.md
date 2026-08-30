---
title: Chart large datasets
description: Keep drawing, interaction, memory, and browser work bounded as chart data grows.
---

# Large datasets

Start with the default renderer and limits. Add a representative cap when the source can grow beyond what every frame should draw, then use adaptive resolution only when pixel work is still the bottleneck.

## Choose a renderer

| Situation | Recommended mode |
| --- | --- |
| Large or frequently redrawn charts | `auto` or `webgl2` |
| Smaller charts and broad browser compatibility | `auto` or `canvas2d` |
| Diagnosing a WebGL-specific issue | `canvas2d` |
| The application requires WebGL2 and should not fall back | `webgl2` |

`auto` prefers WebGL2 and falls back to Canvas2D. Keep it unless the application has a concrete compatibility or diagnostic reason to force a backend.

## Cap visible detail

```ts
const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  renderPolicy: {
    type: 'fixed',
    renderScale: 1,
    maximumRepresentatives: 100_000,
  },
})
```

`maximumRepresentatives` limits the data passed to drawing and hit testing for one projection. Selection and the source model still keep their exact IDs. Pick a value from the maximum useful visual detail for the chart, not only from the source row count.

## Protect the frame budget

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

Adaptive rendering lowers the canvas backing resolution within your bounds when drawing exceeds the target. It does not change chart values, selection, pan, zoom, or accessibility state.

## Update intentionally

- Replace the model when a complete next dataset already exists.
- Apply a patch when the upstream operation is a small insert, removal, or replacement.
- Keep IDs stable so interaction state can survive updates.
- Prepare projection queries before the first pointer event when first-hover latency matters.
- Disconnect DOM charts and dispose application-owned controllers and renderers when a view is removed.

## Know the ceilings

The default model ceiling is 1,000,000 data items across 64 layers. One patch may contain up to 100,000 operations. One hit test returns at most 256 results, and the accessible DOM list defaults to 1,000 items with a configurable maximum of 10,000.

These are safety ceilings, not recommended display counts. Set lower application limits when the product has a smaller known maximum, and test the largest real dataset on the browsers and GPUs you support.
