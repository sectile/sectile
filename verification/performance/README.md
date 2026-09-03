# Performance verification

Performance verification is a workload catalog, not one indivisible suite.
Each workload is classified by five independent selector axes: owner, type,
domain, scale, and evidence. The same catalog can therefore answer a narrow
question without constructing or executing unrelated fixtures.

Targeted screening is the ordinary developer tool. It uses the `screening`
measurement profile, three sequential isolated Node processes, three measured
batches, a 10 ms target batch, and a coarse 20% regression band. With no explicit
selector it runs representative-scale timing for the requested owner; selectors
narrow it further.

```sh
pnpm performance:check -- chart --type projection
pnpm performance:check -- core --type query --domain metric-index
pnpm performance:check -- virtual --type mutation --domain spatial
pnpm performance:check -- core --evidence allocation
pnpm performance:compare -- tabular --type query
```

Types are `construct`, `query`, `mutation`, `transition`, `projection`, and
`primitive`. Scales are `representative`, `scaling`, and `stress`. Evidence is
`timing`, `allocation`, or `retention`. Multiple selectors of the same axis form
a union; different axes intersect.

Packages without registered central workloads are reported as skipped. The
runner never substitutes another package's workloads. Chart is a first-class
owner alongside Core, Tabular, and Virtual.

Certification controls statistical rigor, not workload scope. It uses the
`certification` measurement profile, at least ten sequential isolated Node
processes, five measured batches, and a 20 ms target batch. Initial timing
calibration runs until it has observed at least 1 ms of work or reaches the
workload's bounded warmup count, whichever comes first. Timing iterations are
then calibrated only from that observed cost, bounded from one to one million
operations per batch; the workload's declared iteration count remains the memory
evidence operation count instead of forcing slow timing batches above the target.
With no selectors it certifies the full catalog; the same rigor can be applied to
one shard.

```sh
pnpm performance:certify
pnpm performance:certify -- chart --type projection
pnpm performance:certify -- core --type query --domain metric-index --scale scaling
pnpm performance:record
pnpm performance:record -- chart --type projection
pnpm performance:record -- chart --profile screening --scale representative --evidence timing
pnpm performance:promote -- .tasks/performance/runs/<run-id>/report.json
```

A full certification measures timing and allocation across all registered
shards, plus retained heap for shards with a retention contract. A selected
certification measures only the requested owner,
type, domain, scale, and evidence. Each worker executes timing, allocation, and
retention as separate evidence lanes. Timing completes before allocation or any
retained-GC work, while an allocation-only or retention-only selection runs only
the calibration timing plus its requested memory lane. Timing and allocation are
the default evidence for registered metrics. Retention is opt-in for operations
that mutate or populate long-lived owner state or caches, so the retention lane
does not construct unrelated stateless workload groups. Retained-heap sampling
uses three GC passes; across all registered retention scales, the third-to-fourth
pass delta stayed below the 64 KiB comparison floor while one or two passes did
not. Within each lane,
selected fixtures are constructed as lazy related-metric groups; one group
completes before the next fixture group is created, so unrelated large fixtures
do not extend each other's retained lifetime. Certification is for release,
nightly or dedicated benchmark runs, or an explicit selected/full
investigation. It is not part of ordinary `pnpm verify` or `pnpm verify:full`.

Every command that actually measures performance creates a retained session
under `.tasks/performance/runs/<run-id>/`. The progress manifest is written
before the first worker starts, each isolated worker report is immutable once
written, and complete runs add `report.json`. Interrupted runs therefore retain
their completed process reports. Invalid calibration, comparison failures, and
regressions retain their reports and terminal status.

`record` accepts a non-quick certification run and writes it under an exact
environment partition plus its workload-selection ID. The environment partition
includes Node/V8/OS/CPU/flags, the workload fingerprint, the measurement profile,
and explicit measurement, statistics, and GC protocol versions. Changing benchmark
semantics or switching between `screening` and `certification` therefore selects a
new baseline partition even when the runtime and hardware are unchanged. A selected
baseline can coexist with the full baseline for the same compatible measurement
environment. `performance:promote` accepts certification reports, including selected
certification shards; three-process screenings and quick runs cannot become
authoritative baselines. A screening-profile baseline is authoritative when it is
recorded with ten isolated processes; ordinary three-process screening can then
compare against it without changing the measurement profile.

Without an explicit `--baseline`, comparison first looks for the exact selected
baseline. A broader selector may be used only when it resolves to the identical
metric set; extra workloads can change JIT, cache, and GC state and are
therefore a different measurement context. In practice, owner-level baselines
serve owner-level checks, while narrower type or domain checks record their own
exact shard baseline. Full certification still requires the complete catalog.
Certification timing regressions require median, p95, and separated
isolated-process distributions with the calibrated strict band. Screening uses
the isolated-process median plus batch-sample p95 corroboration with a minimum
20% band; it does not treat the p95 of only three process medians as stable tail
evidence.

Performance timing is conditional evidence. The default performance contract is
structural: complexity, deterministic work, and resource bounds. Timing evidence
is required when an operation has an explicit latency or throughput target, a
registered performance-sensitive timing owner is changed, or a representation
or crossover decision depends on measured cost. A timing failure is diagnostic
evidence to classify; unrelated code must not be optimized merely to restore a
noisy global baseline.

Task-local timing evidence retains the package target explicitly:

```sh
pnpm performance:check -- core --work-item WI-013 --output .tasks/aux/WI-013-performance.json
```

`compare` and `check` retain their current run and `comparison.json` in the
session directory and replace `.tasks/performance/latest-comparison.json`.
`--output` additionally copies the comparison to the requested task path. The
work-item flag is rejected without an output path.

Reports include the workload fingerprint, implementation/build fingerprint,
Node/V8/OS/architecture/CPU/flag metadata, measured package footprints, process
resource usage, and registered browser-only counters. Comparison refuses a
runtime, hardware, flag, or workload-schema mismatch. Build fingerprints may
differ because comparison exists to evaluate code changes.

`--quick` is a smoke mode. It validates workload construction, execution,
calibration, and retained run artifacts with one isolated process, without
selecting or comparing an authoritative baseline. It cannot produce work-item
evidence or replace a baseline.
