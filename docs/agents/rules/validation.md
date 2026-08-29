## Validation cadence

Load this rule when planning or running verification and when entering close.

### During implementation

Finish read-only analysis and the design gate before edits. For each coherent
batch run only:

1. the narrowest affected package production build;
2. `git diff --check`.

Production builds use `tsconfig.build.json` and own implementation typechecking.
Static source inspection may continue. Do not create validation-only fixtures or
run tests, full workspace builds, lint suites, performance or heap probes,
bundle/install gates, browser checks, generated inventory updates, generated
docs, or baseline recording during ordinary implementation.

### Close

Close owns, in dependency order:

1. missing test and counter fixtures;
2. targeted tests, then full tests;
3. workspace typecheck/build and lint;
4. semantic authority, complexity, reuse, and crossover checks;
5. calibrated performance, allocation, and retained-heap runs;
6. consumer bundle, tree-shaking, pack, install, declaration, and source maps;
7. browser, SSR, hydration, focus, ARIA, and lifecycle verification;
8. generated documentation and inventory refresh;
9. full repository verification and clean-worktree review.

Fix failures at the owning layer and rerun only failed or affected layers until
clean. Record new baselines only after implementation and validation fixes are
stable. A skipped check states the exact gap and residual risk.
