# Performance verification

The repository performance runner executes the same workload schema in at
least five sequential, isolated Node processes. Each worker warms operations,
uses a result sink, measures repeated batches, records isolated-process
median/p95/relative MAD plus the pooled batch distribution,
and captures peak allocation pressure plus post-GC retained heap.

```sh
pnpm performance:record
pnpm performance:compare
pnpm performance:check
pnpm verify:performance
```

`record` replaces `baseline.json` atomically. `compare` reports differences
without enforcing the gate. `check` fails when a calibrated median regression
is corroborated by p95 and the current isolated-process distribution clears the
baseline distribution, or when allocation/retained-heap evidence satisfies the
same three checks.
This prevents a bimodal process split from turning a stable tail into a false
regression while still rejecting uniform slowdowns.

Every runtime-changing work item listed in `gates.json` retains task-local
before/after evidence with latency, allocation, retained heap, scaling, and
package-footprint comparisons:

```sh
pnpm performance:check -- --work-item WI-013 --output .tasks/aux/WI-013-performance.json
```

The work-item flag is rejected without an output path. `verify:performance` is
the repository gate for a controlled runner; portable CI must not replace it
with a noisy single sample or compare against mismatched hardware metadata.

Reports include the workload fingerprint, implementation/build fingerprint,
Node/V8/OS/architecture/CPU/flag metadata, all nine built-package footprints,
process resource usage, and registered browser-only Vue counters. Comparison
refuses a workload, runtime, hardware, or flag mismatch. Build fingerprints may
differ because comparison is specifically intended to evaluate code changes.

The runner rejects calibration when `max(5%, 3 x relative MAD)` would require a
band above 10%. Browser timings are not portable Node budgets; the workload
schema records the required Vue render/effect/measurement/resource counters for
browser-qualified validation.

`--quick` is a workload smoke mode, not an authoritative regression gate. Its
short batches may legitimately exceed the full-run noise budget.
