# Performance verification

Performance verification is a workload catalog, not one indivisible suite.
Each workload is classified by five independent selector axes: owner, type,
domain, scale, and evidence. The same catalog can therefore answer a narrow
question without constructing or executing unrelated fixtures.

Targeted screening is the ordinary developer tool. It uses three sequential
isolated Node processes and a coarse 20% regression band. With no explicit
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

Certification controls statistical rigor, not workload scope. It uses at least
ten sequential isolated Node processes. With no selectors it certifies the full
catalog; the same rigor can be applied to one shard.

```sh
pnpm performance:certify
pnpm performance:certify -- chart --type projection
pnpm performance:certify -- core --type query --domain metric-index --scale scaling
pnpm performance:record
pnpm performance:record -- chart --type projection
pnpm performance:promote -- .tasks/performance/runs/<run-id>/report.json
```

A full certification measures timing, allocation, and retained heap across all
registered shards. A selected certification measures only the requested owner,
type, domain, scale, and evidence. Timing-only runs do not execute the heap pass
or retained-GC phase. Certification is for release, nightly or dedicated
benchmark runs, or an explicit selected/full investigation. It is not part of
ordinary `pnpm verify` or `pnpm verify:full`.

Every command that actually measures performance creates a retained session
under `.tasks/performance/runs/<run-id>/`. The progress manifest is written
before the first worker starts, each isolated worker report is immutable once
written, and complete runs add `report.json`. Interrupted runs therefore retain
their completed process reports. Invalid calibration, comparison failures, and
regressions retain their reports and terminal status.

`record` accepts a non-quick certification run and writes it under an exact
environment partition plus its workload-selection ID. A selected baseline can
therefore coexist with the full baseline for the same Node/V8/OS/CPU/flag
configuration. `performance:promote` accepts certification reports, including
selected certification shards; three-process screenings and quick runs cannot
become authoritative baselines.

Without an explicit `--baseline`, comparison first looks for the exact selected
baseline. If a selected baseline has not been recorded, it may compare the
selected metric subset against the full baseline for the same environment and
workload schema. Full certification still requires the complete catalog.
Certification timing regressions require median, p95, and separated
isolated-process distributions with the calibrated strict band. Screening uses
median and p95 with a minimum 20% band and does not claim certification-grade
tail evidence from three processes.

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
