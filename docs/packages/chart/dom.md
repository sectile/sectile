---
title: DOM chart rendering
description: Connect chart projection and input to WebGL2 or Canvas2D with bounded browser resources.
---

# DOM chart rendering

`@sectile/dom/chart` connects an existing root and canvas to a Chart controller. It owns resize observation, pointer and keyboard input, animation-frame scheduling, accessibility projection, renderer resources, and cleanup.

```sh
pnpm add @sectile/chart @sectile/dom
```

```ts
import { createDOMChart } from '@sectile/dom/chart'

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  renderPolicy: {
    type: 'adaptive',
    minimumRenderScale: 0.5,
    maximumRenderScale: 1,
    frameBudgetMs: 12,
    maximumRepresentatives: 100_000,
  },
  getAccessibleDatumLabel: id => `Datum ${id}`,
})
```

`auto` prefers WebGL2 and falls back to Canvas2D. WebGL2 uses uploaded typed arrays and instancing for rectangles, cells, and analytic arcs. Canvas2D remains the compatibility and diagnostic backend. Rendering is deliberately limited to data marks; the application owns axes, labels, legends, colors, layout, and animation.

The fixed policy keeps one render scale. The adaptive policy changes backing resolution within explicit bounds according to frame cost. Both can cap representatives before GPU upload.

The connection batches renders into animation frames, maps pointer coordinates through the current projection, supports keyboard cursor movement and view reset, and exposes a bounded accessible datum list. `flush()` performs queued work synchronously for integration points and tests. `disconnect()` removes listeners and observers, cancels frames, and releases an internally created renderer. A renderer supplied by the application remains application-owned.

