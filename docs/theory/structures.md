# Canonical structures

Structures describe the domain a component operates on. They own membership, order, coordinates, or hierarchy—not focus, selection, rendering, or application data.

## Sequence

A sequence is a finite strict total order of stable identities.

```text
at      : Fin(n) → ID
indexOf : ID ⇀ Fin(n)

indexOf(at(i)) = i
at(indexOf(x)) = x
```

It supports linear components such as listboxes, tabs, menus, toolbars, carousels, and radio groups. Filtering preserves relative order. Movement chooses the first eligible identity in a direction under an explicit `stop` or `wrap` boundary policy.

## Range

A range is a finite quantized affine numeric domain.

```text
value(tick) = origin + tick × step
0 ≤ tick ≤ count
```

The integer tick is authoritative. Numeric values, ratios, snapping, clamping, and increments are projections from that tick, which keeps decimal steps exact and avoids floating-point drift. Slider, spin button, number field, quantity field, and splitter behavior build on this model.

## Grid

A grid is a rectangular finite product of row and column ordinals with optional occupied cells.

```text
cellAt    : Row × Column ⇀ ID
positionOf: ID ⇀ Row × Column
```

Directional movement stays on one axis, skips empty or ineligible cells, and chooses the nearest coordinate in that direction. A logical grid contains no pixel geometry; layout and visual proximity belong to the host.

## Tree

A tree is an ordered rooted forest with stable identities.

```text
parent   : ID → ID | virtualRoot
children : ID | virtualRoot → Sequence<ID>
```

Every node has one parent, all nodes are reachable, cycles are forbidden, and sibling order is observable. Expansion remains separate state. Combining a tree with expansion produces a visible preorder sequence without changing the underlying hierarchy.

## Shared guarantees

| Guarantee | Sequence | Range | Grid | Tree |
| --- | --- | --- | --- | --- |
| Finite and resource-bounded | yes | yes | yes | yes |
| Stable identity | yes | tick | yes | yes |
| Deterministic observation | yes | yes | yes | yes |
| Explicit boundary behavior | yes | numeric endpoints | per axis | visible order |
| Renderer-independent | yes | yes | yes | yes |
