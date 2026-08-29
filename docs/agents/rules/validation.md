## Validation cadence

Load this rule when planning or running verification and when entering close.

### During implementation

Finish read-only analysis and the design gate before edits. Each work item owns
its validation code and adds it with the implementation. Prepare every artifact
needed to make close an execution-and-fix phase rather than a test-authoring
phase:

- valid, invalid, no-op, boundary, and regression tests;
- reference or differential fixtures for migrated semantics;
- adversarial witnesses and deterministic work/resource counters;
- lifecycle churn and zero-resource cleanup scenarios;
- public signature, breaking-change, bundle, install, SSR, hydration, browser,
  or source-map fixtures when the surface changes;
- complexity, authority, crossover, and verification manifest registrations.

Validation code must exercise the production export or a shared production
kernel. Benchmark-only replicas and source-existence checks are insufficient.
Do not record a measured baseline or generated output during implementation.

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
