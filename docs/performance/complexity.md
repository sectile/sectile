# Complexity

| Structure | Build | Primary indexed observations | Bounded navigation |
|---|---:|---:|---:|
| sequence | `O(n)` | `at O(1)`, `indexOf expected O(1)` | `O(k)`, `k < n` |
| range | `O(1)` storage | exact tick/value/ratio `O(1)` arithmetic | `O(1)` |
| grid | `O(rows × columns)` dense input | `cellAt O(1)`, `positionOf expected O(1)` | `O(axis length)` |
| tree | `O(n)` | parent/children/depth expected `O(1)` | visible projection `O(n)` worst case |

Constructors expose ceilings for item count, dimensions, rectangle cell count, depth, ID length, decimal scale, and range count. Movement exposes `maxScan`. A ceiling is part of the semantic result: reaching it produces a typed resource rejection and never a guessed target.
