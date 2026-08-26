# Complexity

| Structure | Build | Primary indexed observations | Bounded navigation |
|---|---:|---:|---:|
| sequence | `O(n)` | `at O(1)`, `indexOf expected O(1)` | `O(k)`, `k < n` |
| range | `O(1)` storage | exact tick/value/ratio `O(1)` arithmetic | `O(1)` |
| grid | `O(rows × columns)` dense input | `cellAt O(1)`, `positionOf expected O(1)` | `O(axis length)` |
| tree | `O(n)` | parent/children/depth expected `O(1)` | visible projection `O(n)` worst case |
| extent index | `O(n)` | offset/index lookup `O(log n)` | batch update `O(m log n)`, persistent splice/move `O(log n + m)` |

| Virtual strategy | Build/storage | Viewport query | Measurement or mutation |
|---|---:|---:|---:|
| linear, zero gap | `O(n)` / `O(n)` | window `O(log n)`, plan `O(log n + k)` | `m` measurements `O(m log n)` |
| linear, nonzero gap | `O(n)` / `O(n)` | window `O(log² n)`, plan `O(log² n + k)` | `m` measurements `O(m log n)` |
| sparse track grid | `O(r log r + p)` / `O(rows + columns + r)` | `O(log r + c)` | track measurements `O(m log n)`; region index reused |
| masonry | `O(n log lanes)` / `O(n)` | `O(v log(n / lanes) + k)` | balanced reflow may rebuild `O(n log lanes)` |
| spatial packed tree | expected `O(n log n)` / `O(n)` | expected `O(log n + k)` | current rect batch bulk-rebuilds expected `O(n log n)` |

`k` is the emitted placement count, `r` the sparse region count, `c` the row-overlap candidates, `v` the lanes intersecting the cross-axis viewport, and `p` the active overlap checks during strict grid construction. Pathological regions spanning most rows can make `p` quadratic; normal cell and merged-cell inputs keep the active set local.

`SequencePatch` lets linear and masonry geometry consume splice and move changes directly. Applying the same patch to the public `Sequence` identity owner still materializes and validates its `O(n)` snapshot. Track-grid measurement does not rebuild its region interval index. Masonry shortest-lane placement is intentionally cascading; use round-robin when stable lane ownership is the stronger policy.

See the [virtualization benchmark](virtualization.md) for same-runner Pretext comparison and 100k/1m observations.

## Dynamic collection reconciliation

Vue collection reconciliation is `O(n + s + d)` time and `O(n + s + d)` auxiliary space, where `n` is the new domain size, `s` is the selected identity count, and `d` is the disabled identity count. It builds membership sets, projects selection in domain order, and scans for an eligible current identity. It does not retain a cross-render index or cache.

Run `pnpm --filter @sectile/vue benchmark:collections` to measure 1,000, 10,000, and 100,000 item domains. The benchmark reports observations, not a portable pass/fail threshold. Performance budgets require a controlled runner before they can become a release gate.

Constructors expose ceilings for item count, dimensions, rectangle cell count, depth, ID length, decimal scale, and range count. Movement exposes `maxScan`. A ceiling is part of the semantic result: reaching it produces a typed resource rejection and never a guessed target.
