## Validation cadence

Load this rule when planning or running verification and when entering close.

### During implementation

Finish read-only analysis and the design gate before edits. Each work item adds
the minimum validation code needed to make close an execution-and-fix phase
rather than a test-authoring phase. Add a validation artifact only when it
catches a plausible regression, directly proves an acceptance criterion, and
does not duplicate an existing check.

| Change | Minimum evidence |
|---|---|
| Documentation only | `git diff --check` |
| Bug fix | failing reproduction and one regression assertion |
| Semantic behavior | representative accepted or rejected path needed to define the contract |
| Behavior-preserving refactor | existing coverage or one before/after differential |
| Hot operation | result equivalence and deterministic work counter |
| Representation change | crossover evidence and adversarial fallback |
| Lifecycle/resource change | ownership churn and zero-resource cleanup |
| Public API change | type fixture and breaking mapping |
| Export or dependency change | consumer bundle, install, and tree-shaking fixture |
| Vue SSR/hydration change | SSR or hydration fixture for the affected behavior |
| Browser-only DOM behavior | focused browser scenario |
| Source-map policy change | source-map fixture |

Choose only matching rows. Prefer extending an existing fixture over creating a
new file. Do not duplicate one fact across unit, integration, differential, and
browser layers. Do not add a runtime test for a condition already guaranteed by
the type system or an existing invariant check. Performance counters, browser
fixtures, bundle fixtures, and crossover evidence are conditional, not default.

### Canonical behavior, not rejected alternatives

When behavior changes from A to B, test the positive canonical behavior B. The
request to choose B does not create a permanent requirement that A must never be
chosen again. Remove or replace obsolete A tests; do not append a negative test,
test name, fixture, comment, or manifest entry whose only purpose is preserving
the history that A was rejected. This is a rejected-alternative lock-in test.

A negative assertion is justified only when it defines B's observable contract,
rejects invalid input, protects a durable safety/security/data invariant, or the
task explicitly requires a permanent prohibition. Record the durable reason in
that case. Express ordinary preference changes as current positive behavior and
keep superseded alternatives out of active validation artifacts.

Validation code must exercise the production export or a shared production
kernel. Benchmark-only replicas, implementation-detail assertions, and
source-existence checks are insufficient. Do not record a measured baseline or
generated output during implementation.

For each coherent batch execute only:

1. the narrowest affected package production build;
2. `git diff --check`.

Production builds use `tsconfig.build.json` and own implementation typechecking.
Static source inspection and validation-code authoring may continue. Do not run
tests, full workspace builds, performance or heap probes,
bundle/install gates, browser checks, generated inventory updates, generated
docs, or baseline recording during ordinary implementation.

### Close

Close first checks that every completed work item already has its declared
validation artifacts. Missing validation code reopens the owning work item.
Close then owns execution, diagnosis, fixes, and reruns in dependency order:

1. validation-artifact coverage check;
2. targeted tests, then full tests;
3. workspace typecheck and build;
4. semantic authority, complexity, reuse, and crossover checks;
5. calibrated performance, allocation, and retained-heap runs;
6. consumer bundle, tree-shaking, pack, install, declaration, and source maps;
7. browser, SSR, hydration, focus, ARIA, and lifecycle verification;
8. generated documentation and inventory refresh;
9. full repository verification and clean-worktree review.

Fix failures at the owning layer and rerun only failed or affected layers until
clean. Record new baselines only after implementation and validation fixes are
stable. A skipped check states the exact gap and residual risk.
