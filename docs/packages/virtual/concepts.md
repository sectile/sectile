---
title: Core concepts
description: Understand virtualization through viewport, overscan, placement, and anchor.
---

# Core concepts

Sectile Virtual calculates a surface from four values.

| Value | Meaning |
| --- | --- |
| `viewport` | The x-y position and size currently visible to the user |
| `overscan` | Extra distance prepared outside the viewport |
| `placement` | The ID and rectangle of an item to render |
| `anchor` | The item whose screen position is preserved across a change |

## One update

1. Query the current viewport with overscan.
2. Render only the returned placements.
3. Let the active environment measure real element sizes.
4. Update changed sizes and subsequent coordinates.
5. Apply the difference between the old and new anchor position to scrolling.

Total data size is independent of placement count. A 50,000-row list or a 300 × 300 grid still returns only items around the current viewport.

## State and host responsibilities

`@sectile/virtual` state owns IDs, order, sizes, and coordinates. DOM and Vue connections read the viewport, render placements, and return real sizes and scroll values. The same state can be queried in a browser, server, or worker.

Use each layout's `snapshot*Layout()` and `restore*Layout()` functions when layout state must be stored or moved across execution boundaries.
