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
processes, five measured batches, two warmup batches, and a 20 ms target batch.
Initial timing calibration runs until it has observed at least 1 ms of work or
reaches the workload's bounded warmup count, whichever comes first. Timing
iterations are then calibrated only from that observed cost, bounded from one to
one million operations per batch. Runtime workloads do not use their memory
iteration count as a timing floor, while the runner calibration workload keeps its
one-million-operation floor so the cross-process noise check remains meaningful.
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
the default evidence for registered metrics. Allocation repetition is workload-
specific and uses the minimum bounded amplification needed to keep the intended
heap signal measurable; bulk chart operations avoid redundant repeats once a
single operation already produces multi-megabyte evidence. Retention is opt-in
for operations that mutate or populate long-lived owner state or caches, so the
retention lane does not construct unrelated stateless workload groups.
Retained-heap sampling uses three GC passes; across all registered retention
scales, the third-to-fourth
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
includes the measurement worker's Node/V8 versions and runtime options, OS/CPU,
the workload fingerprint, the measurement profile, and explicit measurement,
statistics, and GC protocol versions. Worker runtime options preserve the ordered
`execArgv` actually used by the worker plus its inherited, trimmed `NODE_OPTIONS`;
parent-runner flags that are not forwarded to workers are not measurement metadata.
Changing benchmark semantics or switching between `screening` and `certification`
therefore selects a new baseline partition even when the runtime and hardware are
unchanged. A selected
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
measurement-worker Node/V8/runtime-option metadata, OS/architecture/CPU metadata,
measured package footprints, process resource usage, and registered browser-only
counters. Comparison refuses a runtime, hardware, worker-option, or workload-schema
mismatch. Build fingerprints may differ because comparison exists to evaluate code
changes.

`--quick` is a smoke mode. It validates workload construction, execution,
calibration, and retained run artifacts with one isolated process, without
selecting or comparing an authoritative baseline. It cannot produce work-item
evidence or replace a baseline.

## Schema 7 published certification reference

The active full certification reference for schema 7 is environment partition
`f6e20f816693ec2b0bbdb67eacb8e90b20ce625ee6bd98fa11833f2b73949b52`.
It was recorded on 2026-09-13 from the exact latest independently published npm
artifacts listed below, not from the release candidate. Every package tag is an
ancestor of the candidate and every tarball was checked against npm registry
integrity before extraction into an isolated dependency root. The measurement
harness was copied unchanged from `80465aad0426969de7d54c3d8ce4ec36b25b1c81`.

The reference uses performance schema 7, measurement protocol 10, statistics
protocol 2, GC protocol 2, the effective worker runtime options
`--expose-gc` / no `NODE_OPTIONS`, ten isolated processes, five batches per
process, and the full 234-metric catalog. Its selector file is
`all-owners__all-types__all-domains__all-scales__all-evidence.json`, with SHA-256
`dff7d8d58681dbec1d7e8981051644b6244ff4e3809de7958cf0692fc87fabd9` and build
fingerprint `258eb923f10cfe5c3b1a608bee6493b72a61d55593409f0a73df3adefd0f8e10`.

| Published artifact | Version | Tarball SHA-256 |
|---|---|---|
| `@sectile/core` | 0.14.5 | `0d3ab99005cf3041505ebaf82078040fccaf1e6e9653f112a374a38e35c537bb` |
| `@sectile/chart` | 0.15.3 | `fd9269634a531ec5cf72e0488e6148945f38e54647a5c20b56ed1225f2d8c440` |
| `@sectile/form` | 0.14.7 | `cf1d983c9840c217b07b1aba950faebbb8402ad73a9961a9901e7081b4fe6aea` |
| `@sectile/tabular` | 0.15.2 | `a4d677163e262381b7c9e13312cad321d1430f2ee33f1e63c5f374fe49af1c81` |
| `@sectile/temporal` | 0.14.7 | `e2811eeabb392dcf746d489b6e15986945a2c7f3ba052e43e5d6a7c02cb53f50` |
| `@sectile/virtual` | 0.15.2 | `58196f7929736b48b5713928d1c1290b236cc97d32aa2e6ffebc998b83e94305` |
| `@sectile/dom` | 0.17.0 | `b24fa2c0b42eb7702d132832e8e89dc8c38f6228443d9f2f9ca4a58024f66547` |
| `@sectile/terminal` | 0.14.6 | `9496ccfe56c740b5e98c276083f85b13fc252b40745763ec0a7b644efe76e484` |
| `@sectile/vue` | 0.17.0 | `c0238924373a9c68540fc3cfe4fe2e47006b7f59a6fd92917e9e451a9876f77a` |

The candidate certification report from run
`2026-09-13T09-44-46-759Z-641007-2bcae2e5` has SHA-256
`f438915645ba1f3062a538e45f1fdc9a54c62d1eb27b8cf6d53bbb79a378fd60`
and build fingerprint
`523e61c32b6fe2b51abbd49c5700c226f5153755acd3ef9c81ad46d7f6531bef`.
Direct comparison against the published reference passed all 234 metrics with
zero timing, allocation, retained-heap, or package-footprint regressions under
the calibrated five-percent certification band. The largest package-footprint
increase is Vue at 1.67 percent, followed by DOM at 1.46 percent.

## Recovered full certification reference

This preserved reference predates performance schema 7 worker-runtime provenance.
It remains historical evidence but is intentionally not comparable with or selectable
for schema 7 reports; authoritative comparisons require a newly recorded baseline
from the exact worker runtime environment.

The full reference in environment partition
`933652c83112df2b038ebf25ee0f49bb867b465e448838e959f3227b14ab8380`
measures the published package state at `release-2026-09-05.2`
(`b87e69be6fec8dd7071010f5185911fb74b9c970`). The exact npm artifacts below
were checked against registry SHA-512 integrity and their Git release manifests,
then extracted into an isolated root with local dependency links confined to
that artifact set. The measurement harness, root tool manifest and lockfile
were copied unchanged from `4a516d8c113d569eede553b110bcca90d91058b4`.
This measures previously shipped JavaScript with the current protocol.

The reference uses measurement protocol 10, statistics protocol 2, GC protocol
2, ten isolated processes and the full 228-metric catalog. Its selector file is
`all-owners__all-types__all-domains__all-scales__all-evidence.json`, with SHA-256
`13adedda5d51de1bbbae5140eb47f33bc516a3008a801629691de16b799d5314` and build
fingerprint `071f66ae6f28794953f1ed84313ee84fc94a9cac135b851183f027f61ad64476`.
The report was promoted unchanged through the existing `performance:promote`
command. Earlier environment partitions remain intact.

| Published artifact | Version | Tarball SHA-256 |
|---|---|---|
| `@sectile/core` | 0.14.2 | `78b407477a7f4c02b25fd403938828f0e6a787016370c55b1ab59b9e12c57fda` |
| `@sectile/chart` | 0.15.1 | `62c5359ed5528aa1b74581daae00ee8e7fc5855282e9aeb3ff3a7db9693cc526` |
| `@sectile/form` | 0.14.2 | `f92dd446304dcf54139971015b31c7de80563231be1d07f2d2f83544f9f506eb` |
| `@sectile/tabular` | 0.15.0 | `690cd1bebb607db900c6eefb529732ec9cb5ab8f6bc83178ba172dd31640f451` |
| `@sectile/temporal` | 0.14.2 | `a39195f020906039022930dbc6ccbe3cab49a47b92af3f1b975278b87b70eb28` |
| `@sectile/virtual` | 0.15.0 | `e854914da82028107efc1eab558ddbe20699685257e7726e5133af63ff6eccdd` |
| `@sectile/dom` | 0.16.1 | `3076541d7477308b3cc119ab6f273caa707e8e0f5ab11ff2730abb5652cae707` |
| `@sectile/terminal` | 0.14.2 | `4a95755492312d82f4dbc711668d97fde0237ed9694379e7f1d56df23e33ee00` |
| `@sectile/vue` | 0.16.1 | `d59599eef451ebf4e7bfcbda420f41e0ffef5d5451ad4ac2baad336f4a36874b` |

The preserved current report from run
`2026-09-07T12-50-43-241Z-136859-cf8a2a0f` has build fingerprint
`8cda85c3456d5eda10c0a21223ddb5ed25eccebdbb089927623ff74feb4b231c`.
Its runtime, hardware, harness and protocol metadata match this reference.
The original schema-6 report validator and comparator passed with zero regressions,
including the nine package footprints, using the existing calibrated 5% band and
existing memory-comparison rules. Schema-7 baseline selection deliberately does not
resolve to this reference because its measurement-worker runtime options were not
recorded.
