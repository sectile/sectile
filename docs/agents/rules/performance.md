## Performance design

Load this rule for algorithms, data structures, hot paths, caches, indexes,
projections, snapshots, or representation changes.

### Design record

Define total input `n`, changed input `j`, scanned input `s`, candidates `c`,
and emitted output `k`, plus relevant block, page, track, field, subscriber, or
ancestor counts. State worst-case or expected time, auxiliary space, output
space, retained space, allocation, and lifecycle resources. Identify whether
the operation runs per item, event, render, generation, or explicit boundary.

Trusted canonical updates and queries scale with changed, affected, candidate,
or output cardinality whenever semantics permit. External or forged input gets
complete validation. Canonical provenance may use retained indexes and local
proofs instead of repeated full-state validation.

### Preferred substitutions

| Situation | Preferred representation or operation |
|---|---|
| Repeated hot ID lookup | Owner-retained `Map<ID, index/value>` built once |
| One lookup or small bounded collection | Simple linear scan |
| Sparse update where `j << n` | Structural sharing or bounded incremental repair |
| Stable keys/order with changed values | Track identity and value deltas separately; repair value-dependent projections over `j` |
| Stable geometry with changed declaration order | Keep the geometry index keyed by stable identity; patch the order owner separately and resolve current indexes only for candidates/output |
| Sparse structural geometry over a packed index | Use an owner-bound delta overlay with tombstones; rebuild when its measured query bound or an exact aggregate boundary cannot be preserved |
| Changed density above measured crossover | Packed/full rebuild |
| Internal indexed access | Explicit `size`, `at`, `iterate` operations |
| Consumer requires a full array | One explicit `toArray` or snapshot boundary |
| Repeated derived `Map` or `Set` | Cache once per immutable owner or generation |
| Array serialization used as a cache key | Structural revision or generation key |
| Semantically unchanged update | Return the existing owner/state identity |
| Primitive selector result | `Object.is` equality |
| Allocating selector result | Stable result identity or explicit comparator |
| Numeric hot loop | Scalar locals; materialize only the final result |
| Sparse observer changes | Changed-entry batch, not mounted-domain sweep |

Do not replace a small one-shot scan with an index without frequency and
crossover evidence. Account for index construction and retained memory.

### Restrictions

- Do not use a Proxy to emulate an Array or collection.
- A low-frequency facade Proxy requires measured frequency, stable cached
  method wrappers, and no per-read closure allocation.
- Review full-domain `.find`, `.findIndex`, `.some`, `.includes`, repeated
  `Map`/`Set` construction, `JSON.stringify` signatures, controller rebuilds,
  and mounted-domain DOM measurement in ordinary updates.
- Do not hide linear or logarithmic work behind native-looking constant-time
  property access.
- Normalize sorted, unique, or partition-aligned inputs at the owning boundary.
- Repair counters use the same partitioning as the production structure.
- Bound caches by immutable-owner lifetime. Default multi-entry LRUs and
  unbounded memoization are not allowed.
- Materialize the same logical full output at most once.
- Unchanged keys or sequence order prove only identity stability. When values
  feed geometry, measurements, indexes, or other projections, propagate the
  bounded value delta instead of treating the update as a semantic no-op or
  rebuilding the full derived structure.

### Representation evidence

`verification/representation-crossovers/decisions.json` is the source of truth
for frozen choices. Replacing one requires latency, allocation, retained heap,
adversarial, and bundle evidence against the production implementation.

Every changed hot operation adds its complexity contract, source proof,
adversarial witness, deterministic work/resource counter, and production-bound
validation code with the implementation. Timing evidence is conditional: require
it for an explicit latency/throughput target, a registered performance-sensitive
workload owner, or a representation/crossover decision that depends on measured
cost. Repository-wide statistical certification is release/nightly evidence, not
a default local correctness gate. Baselines are review inputs, not values adjusted
to the current result. Record the previous value, measured delta, contributors,
consumer impact, and approved ceiling before replacing a baseline.
