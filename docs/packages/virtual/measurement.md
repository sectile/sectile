---
title: Virtual measurement and anchoring
description: Commit dynamic geometry without viewport jumps or stale evidence.
---

# Virtual measurement and anchoring

Estimated geometry becomes exact through a generation-bound cycle:

1. Query the latest layout state and viewport.
2. Render the returned placements.
3. Read all host measurements together.
4. Submit one batch with `plan.generation` and `plan.anchor`.
5. Commit the returned state.
6. Apply `scrollDelta` before the next paint.
7. Query the next plan.

```ts
const plan = queryLinearLayout(layout, { viewport, overscan: 200 })

const mutation = applyLinearMeasurements(layout, {
  generation: plan.generation,
  anchor: plan.anchor,
  measurements: [{ index: 0, extent: { kind: 'exact', value: 72 } }],
})

layout = mutation.state
scrollBy(mutation.scrollDelta.x, mutation.scrollDelta.y)
```

## Why the anchor matters

The plan chooses the first visible identity as an anchor and records its viewport-relative coordinate. When geometry changes before or around it, the strategy compares the identity's old and new rectangles. `scrollDelta` is the change required to keep that coordinate stable.

Apply correction without animation. Animated correction makes measurement error visible and can race with a new input.

## Stale measurements

Each accepted measurement or mutation advances the generation. A batch from an older plan is rejected. Do not relabel stale evidence with the latest generation; discard it and measure currently rendered placements again.

Browser hosts should batch reads before writes. Alternating a rectangle read and scroll write per item defeats layout batching and is outside the contract.
