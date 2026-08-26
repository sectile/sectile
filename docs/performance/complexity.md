# Complexity

| Structure | Build | Primary indexed observations | Bounded navigation |
|---|---:|---:|---:|
| sequence | `O(n)` | `at O(1)`, `indexOf expected O(1)` | `O(k)`, `k < n` |
| range | `O(1)` storage | exact tick/value/ratio `O(1)` arithmetic | `O(1)` |
| grid | `O(rows × columns)` dense input | `cellAt O(1)`, `positionOf expected O(1)` | `O(axis length)` |
| tree | `O(n)` | parent/children/depth expected `O(1)` | visible projection `O(n)` worst case |
| extent index | `O(n)` | offset/index lookup `O(log n)` | batch update `O(m log n)`, persistent splice/move `O(log n + m)` |

VirtualLayout reduces viewport changes in `O(log n)` and reports ranges without scanning the logical domain. A measurement batch touching `m` items costs `O(m log n)` and path-copies only affected tree paths. `SequencePatch` lets geometry consume splice and move changes incrementally; applying the same patch to the public `Sequence` identity owner still materializes and validates its `O(n)` snapshot.

See the [virtualization benchmark](virtualization.md) for same-runner Pretext comparison and 100k/1m observations.

## Dynamic collection reconciliation

Vue collection reconciliation is `O(n + s + d)` time and `O(n + s + d)` auxiliary space, where `n` is the new domain size, `s` is the selected identity count, and `d` is the disabled identity count. It builds membership sets, projects selection in domain order, and scans for an eligible current identity. It does not retain a cross-render index or cache.

Run `pnpm --filter @sectile/vue benchmark:collections` to measure 1,000, 10,000, and 100,000 item domains. The benchmark reports observations, not a portable pass/fail threshold. Performance budgets require a controlled runner before they can become a release gate.

Constructors expose ceilings for item count, dimensions, rectangle cell count, depth, ID length, decimal scale, and range count. Movement exposes `maxScan`. A ceiling is part of the semantic result: reaching it produces a typed resource rejection and never a guessed target.
