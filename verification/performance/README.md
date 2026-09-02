# Performance verification

Performance verification has two distinct modes.

Targeted screening is the ordinary developer tool. It accepts one or more
package targets, runs only timing workloads owned by those packages, uses three
sequential isolated Node processes, three measured batches, and a coarse 20%
regression band. It is intended to catch large, plausible regressions without
turning workstation noise into a repository-wide optimization mandate.

```sh
pnpm performance:check -- core
pnpm performance:check -- tabular virtual
pnpm performance:compare -- core
```

Packages without registered central timing workloads are reported as skipped.
In particular, the runner must not substitute unrelated Core, Tabular, or
Virtual workloads for another package. Structural performance evidence for such
packages comes from their complexity contracts, deterministic work/resource
witnesses, and package-local benchmarks when a task explicitly requires timing.

Repository certification is intentionally separate and expensive:

```sh
pnpm performance:certify
pnpm performance:record
pnpm performance:promote -- .tasks/performance/runs/<run-id>/report.json
```

Certification executes the complete workload schema in at least ten sequential,
isolated Node processes. Each worker warms operations, uses a result sink,
measures repeated batches, and captures allocation plus post-GC retained heap.
This mode is for release certification, nightly or dedicated benchmark runs, or
an explicit full-performance investigation. It is not part of ordinary
`pnpm verify` or `pnpm verify:full`.

Every command that actually measures performance creates a retained session
under `.tasks/performance/runs/<run-id>/`. The progress manifest is written
before the first worker starts, each isolated worker report is immutable once
written, and complete runs add `report.json`. Interrupted runs therefore retain
their completed process reports. Invalid calibration, comparison failures, and
regressions retain their reports and terminal status.

`record` validates one complete non-quick certification run and writes it to the
environment-partitioned `baselines/` directory. The filename is the SHA-256
digest of the runtime, OS, architecture, CPU, flags, and workload metadata used
for comparison. `performance:promote` accepts only complete certification
reports; targeted screenings and quick reports cannot become authoritative
baselines.

Without an explicit `--baseline`, screening and certification require the exact
environment partition matching the current runtime and hardware metadata.
Certification preserves the previous strict rule: a timing regression must be
corroborated by median, p95, and separated isolated-process distributions, with
a calibrated 5-10% band. Targeted screening uses median and p95 with a minimum
20% band and does not claim certification-grade tail or distribution evidence
from only three processes.

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

`--quick` remains a smoke mode. It is not authoritative certification evidence.
