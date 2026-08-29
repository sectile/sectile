## Temporal ownership

Temporal owns portable date, time, calendar, range, and temporal-field
semantics and invariants.

- Reuse Core sequence, grid, range, ratio, result, and revision operations.
- Keep DOM events, focus, ARIA, rendering, and framework reactivity in hosts.
- Formatting tied to a platform API remains a host projection unless Temporal
  explicitly owns the portable formatting contract.
- Calendar or field navigation must not be reimplemented in DOM, Vue, or
  Terminal.
