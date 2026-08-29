## Tabular ownership

Tabular owns portable records, queries, filter/sort/group/pivot/aggregate
semantics, row selection expressions, tabular profiles, and generation indexes.

- Reuse Core navigation, selection, grid, identity, result, and revision
  foundations plus Virtual window/layout contracts where applicable.
- Retain normalized source and projection indexes per declared generation.
- Bounded navigation must not rebuild full row/cell projections or serialized
  cache signatures.
- DOM and Vue own rendering, events, focus, ARIA, and reactivity only.
