## Performance policy

Sectile treats performance as part of the behavioral contract. Priority order is
semantic correctness and invariants, runtime cost, allocation and retained
memory, consumer bundle and install footprint, then compatibility and
implementation convenience. Compatibility is required only when the task says
so explicitly.

### Design before implementation

Before changing runtime code, write down the following in the active plan or
work item and settle the representation before implementation:

1. The operation and whether it is a construction, trusted canonical update,
   external-input validation, query, projection, snapshot, or cleanup path.
2. Relevant cardinalities and ceilings, including total input `n`, changed
   input `j`, scanned input `s`, candidates `c`, and emitted output `k`.
3. Incumbent and proposed worst-case or expected time, auxiliary space, output
   space, retained space, allocation, and lifecycle-resource bounds.
4. Expected read/write frequency and whether the code runs per item, per event,
   per render, per generation, or only at an explicit boundary.
5. Existing Core/domain structures, retained indexes, immutable views, caches,
   and frozen representation decisions that can be reused.
6. Public API complexity. An API must not masquerade as a cheaper native type
   when its access or iteration cost differs materially.

Do not implement a new collection, cache, index, Proxy facade, or structural
sharing layer until this analysis shows why existing structures are
insufficient. Promote a structure to Core only when at least two independent
domains need the same semantics and complexity contract; generic-looking code
alone is not evidence of reuse.

### Runtime rules

- Trusted canonical updates, bounded navigation, reconciliation, and queries
  scale with changed, scanned, affected, candidate, or output cardinality rather
  than total domain size whenever semantics permit.
- External or forged input receives complete validation. Canonical provenance
  may use local proofs and retained indexes instead of repeated whole-state
  validation.
- Reuse immutable-owner indexes and views. Build a derived index at most once
  per owner or generation, and return the existing owner for semantic no-ops.
- Preserve the identity used as a cache key across ordinary state transitions
  when the keyed value is semantically unchanged. Cache tests must chain the
  state returned by each transition; repeatedly invoking one original state is
  not evidence that transition-to-transition reuse works.
- Full scans and materialization are reserved for construction, external
  validation, explicit snapshots/full projections, unavoidable immutable
  output, or work whose output is itself full-domain. Materialize the same
  logical output at most once.
- Account for output allocation separately from auxiliary allocation. Bound
  caches by immutable-owner lifetime; default multi-entry LRUs and unbounded
  memoization are not allowed.
- Public/state boundaries use normalized immutable values. Numeric hot loops
  use scalar locals and materialize only final results.
- Every connection owns its listeners, observers, timers, subscriptions, and
  scheduled work. Cleanup is idempotent and leaves zero owned resources.

### Hot-path restrictions

- Do not use a Proxy to emulate an Array or collection. Collection access and
  iteration use explicit operations such as `size`, `at`, `iterate`, and
  `toArray`, with materialization cost documented.
- A Proxy may exist only at a demonstrably low-frequency boundary. Its review
  must include access frequency, allocation behavior, and cached stable method
  wrappers; per-read closure creation is not acceptable.
- Review full-domain `.find`, `.findIndex`, `.some`, and `.includes`, repeated
  `Map`/`Set` or index construction, `JSON.stringify` cache signatures,
  controller/connection rebuilds, and mounted-domain DOM measurement before
  accepting them in an ordinary update or query.
- Do not hide linear or logarithmic work behind native-looking constant-time
  property access.
- Internal algorithms that require sorted, unique, normalized, or partition-
  aligned input enforce that precondition at their boundary or own the
  normalization. Callers must not rely on an undocumented ordering accident.
- Work counters and repair bounds use the same partitioning as the structure
  whose work they claim to bound. One index's leaf, block, bucket, or page count
  cannot stand in for another representation's count without a proven mapping.

### Representation and evidence

`verification/representation-crossovers/decisions.json` is the machine-readable
source of truth for frozen representation choices, and
`docs/performance/representations.md` is its generated explanation. Replacing a
frozen choice requires crossover evidence covering latency, allocation,
retained heap, adversarial behavior, and bundle footprint. Small bounded
collections remain simple unless evidence proves a more complex structure wins.

Crossover prototypes select candidates; they do not prove that production code
implements the selected representation. Every frozen decision has a production-
bound conformance check covering each threshold and fallback branch. The check
fingerprints or directly exercises the actual implementation, not only the
benchmark worker, manifest, or generated documentation. Allocation claims run
against the exported production operation or an equivalent shared kernel.

Every new or changed hot operation receives a complexity contract, source proof,
adversarial witness, and deterministic work/resource counters. Public export,
dependency, or closure changes also require consumer bundle and install
evidence. Export-name coverage is not operation coverage: contracts enumerate
every governing cardinality, descriptor/rule count, callback invocation count,
and non-constant access offset. A checker must connect the declared bound to the
implementation with a counter, adversarial test, or inspected shared kernel;
confirming that a source file exists is insufficient.

Performance baselines and hard ceilings are review inputs, not values that
follow the current result. A feature may legitimately increase a package or
bundle budget, but the change records the previous value, measured delta,
contributors, consumer raw/gzip/brotli impact, and approved new ceiling as one
explicit decision. Do not ratchet a ceiling through implementation commits or
replace a baseline merely to make the current change pass. Validation compares
against the last approved baseline before recording a replacement.

### Validation cadence

Finish read-only analysis and settle the design before editing runtime code.
During implementation, validate a coherent edit batch only with the narrowest
relevant package production build and `git diff --check`. Package production
builds run TypeScript against `tsconfig.build.json` and therefore own the
implementation typecheck. Continue read-only static inspection of ownership,
imports, invariants, and complexity while editing, but do not create
validation-only test fixtures or run tests, full workspace builds, lint suites,
performance runs, heap probes, bundle/install gates, browser checks,
generated-inventory updates, or baseline recording during ordinary
implementation.

The close phase owns test fixture completion, targeted and full tests, full
workspace typecheck and build, lint, complexity/reuse/crossover checks,
calibrated performance and heap runs, consumer bundle/install checks, browser
verification, generated documentation and inventory refreshes, and full
repository verification. Fix failures there, then rerun only the failed or
affected layer until clean. Record replacement baselines only after all
implementation and validation fixes are stable.
