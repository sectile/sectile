# Public migration

The migration was intentionally breaking because the package was not a stable public release. Compatibility aliases were not retained in that migration transaction.

| Previous surface | Canonical surface | Decision |
|---|---|---|
| `collection` | `sequence` | Replace the broad name with the strict-total-order theory. |
| `matrix-navigation` | `grid` | Make absolute logical coordinates and gaps observable. |
| `tree-collection` | `tree` | Make ordered roots, siblings, and parenthood canonical. |
| previous range helpers | `range` | Replace floating authority with exact integer ticks. |

This document records the migration result, not a permanent package blacklist. Routine verification checks the canonical surfaces that current consumers require, but it does not fail merely because a former name or another additional export is introduced later. Such an addition is evaluated as a new public API decision at that time.

Stateful runtime services, implicit subscriptions, internal selection utilities, and host-text helpers were removed from the public migration. They do not belong to the four structure authorities and require their own promotion evidence.
