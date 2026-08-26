# Verification pipeline

The default `pnpm verify` gate first runs each package's own `verify` script in dependency order, then performs cross-package adapter equivalence, workspace-boundary, component-completeness, and repository-documentation checks. Package-level gates perform:

1. strict TypeScript type checking;
2. reference law suites and 2,000-model differential tests for structures and internal state theories;
3. production build;
4. source/required-public-surface/declaration/law/document checks;
5. renderer-neutral output inspection;
6. runtime and type-consumer subpath imports;
7. package footprint validation;
8. deterministic implementation verifier replay.

The runner buffers each stage and prints only the final summary when verification succeeds. If a stage fails, it prints that stage's captured output. Use `pnpm verify -- --verbose` when live output from every stage is needed.

`pnpm verify:theory` delegates to the package that owns the Python theory model. `pnpm verify:reproducible-build` delegates reproducibility checks to every package that declares one. The DOM and terminal packages test their host mappings independently; the root cross-host suite compares more than 160,000 operations through exported package subpaths. Property checks record their seed and run and deterministically shrink a failing trace before reporting its counterexample.

The Core and Virtual law registries contain 54 interaction laws and 12 virtualization laws. Each law has an evidence file, and the optimized Core implementation has a separate differential evidence file.

Migration-only facts, such as the one-time removal of historical subpaths, are not encoded as permanent negative regression checks.

The component-completeness check is a ratchet. It requires component export parity across
the combined Core and Temporal semantic packages, `@sectile/dom`, `@sectile/terminal`, and `@sectile/vue`, plus one audited
entry and Core, DOM, terminal, and Vue witness for every semantic family. Existing incomplete
areas are listed as migration gaps; new public components cannot add such gaps.

Node tests provide deterministic browser-like DOM coverage, but do not claim real browser or assistive-technology behavior. Follow the [browser and accessibility protocol](browser-accessibility.md) for release-environment evidence.
